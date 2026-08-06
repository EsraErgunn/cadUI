import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import { getLoadedSymbol } from './symbolLoader'
import type { PlanPoint } from '../../core/coords'
import { isTypingTarget } from '../../core/domEvents'
import type { Id } from '../../core/model'
import { getPlacementPosition } from '../../core/placement'
import { toPlanRect } from '../../core/selection'
import { getSnapToleranceCm } from '../../core/snap'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { getElementsInRect, pickElementAt } from '../core/elementPicking'
import { pruneElementIds } from '../core/elementSelection'
import { INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'
import {
  copyElementsToClipboard,
  cutElementsToClipboard,
  pasteClipboard,
} from '../store/clipboardActions'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const PRIMARY_BUTTON = 0

type SelectionGrab = {
  /** Sürüklenen seçimin tamamı; hepsi aynı kaymayla taşınır. */
  elementIds: Id[]
  /** Basılan elemanın basış anındaki konumu — ızgara ona göre yakalanır. */
  anchorPosition: PlanPoint
  pointerOrigin: PlanPoint
}

export type SelectionToolState = {
  /** Sürüklenen elemanlar; sahne onları store konumu + kayma ile çizer. */
  draggedElementIds: readonly Id[]
  dragDeltaRef: RefObject<PlanPoint | null>
}

/**
 * Tesisat elemanı seçme, çerçeveyle çoklu seçme, sürükleme ve pano işlemleri.
 * Araç mantığı DrawSurface'e YAZILMAZ (kural 7).
 *
 * Tutma R3F'in ışın olaylarıyla değil, saf geometriyle yapılıyor
 * (core/elementPicking.ts). Sebep: DrawSurface tuvalin kendi DOM olayını
 * dinliyor, R3F de aynı tuvale kendi dinleyicisini kuruyor; "boş alana tıklayınca
 * seçim temizlensin" iki dinleyicinin kayıt SIRASINA bağlı kalırdı. Tek olay
 * kaynağı = kayıt sırasından bağımsız davranış (knowledge/gesture-bus-precedence.md),
 * üstelik tutma sınavı saf fonksiyon olarak test edilebiliyor.
 *
 * Sürükleme boyunca store'a YAZILMAZ: kayma ref'te birikir, pointerup'ta tek
 * moveElements çağrılır → tek markDirty → tek Ctrl+Z.
 */
export function useSelectionTool(): SelectionToolState {
  const camera = useThree((state) => state.camera)
  const activeToolId = useUiStore((state) => state.activeToolId)
  const isSelectionTool = activeToolId === INSTALLATION_SELECTION_TOOL_ID
  // Sürüklenen elemanlar React durumu: jest başına İKİ render (başlangıç + bitiş).
  // Kaymanın kendisi ref'te — her pointermove render tetikleseydi sürükleme takılırdı.
  const [draggedElementIds, setDraggedElementIds] = useState<readonly Id[]>([])
  const dragDeltaRef = useRef<PlanPoint | null>(null)

  useEffect(() => {
    if (!isSelectionTool || !(camera instanceof OrthographicCamera)) return undefined

    let grab: SelectionGrab | undefined
    let marqueeAnchor: PlanPoint | undefined
    let isAdditiveMarquee = false

    const endDrag = () => {
      grab = undefined
      dragDeltaRef.current = null
      setDraggedElementIds([])
    }

    const endMarquee = () => {
      marqueeAnchor = undefined
      isAdditiveMarquee = false
      usePlumbingUiStore.getState().setMarquee(null)
    }

    /** Seçim yalnız aktif katta: hayalet katmanlar zaten seçilemez. */
    const readFloorElements = () => {
      const cad = useCadStore.getState()
      return cad.installationElements.filter((element) => element.floorId === cad.activeFloorId)
    }

    const getMetadata = (type: Parameters<typeof getLoadedSymbol>[0]) =>
      getLoadedSymbol(type).metadata

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const { zoom } = readCameraViewport(camera)
      const target = pickElementAt(
        event.planPoint,
        readFloorElements(),
        getMetadata,
        getSnapToleranceCm(zoom),
      )

      const ui = usePlumbingUiStore.getState()

      // Boşluğa basış: jest bir çerçevedir. Seçimin temizlenip temizlenmeyeceğine
      // pointerup karar verir — sürükleme eşiğin altında kalırsa bu bir tıklamadır.
      if (!target) {
        marqueeAnchor = event.planPoint
        isAdditiveMarquee = event.shiftKey
        return
      }

      // Shift+tık seçimi değiştirir ve sürükleme BAŞLATMAZ: aynı jestte hem
      // seçime ekleyip hem taşımak, kullanıcının hangisini istediğini belirsiz kılar.
      if (event.shiftKey) {
        ui.toggleSelectedElement(target.id)
        return
      }

      // Seçimin içindeki bir elemana basmak seçimi KORUR (grubu taşımak için);
      // dışındakine basmak seçimi ona indirger.
      const elementIds = ui.selectedElementIds.includes(target.id)
        ? [...ui.selectedElementIds]
        : [target.id]
      if (!ui.selectedElementIds.includes(target.id)) ui.setSelectedElements(elementIds)

      grab = {
        elementIds,
        anchorPosition: target.position,
        pointerOrigin: event.planPoint,
      }
      setDraggedElementIds(elementIds)
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (marqueeAnchor) {
        usePlumbingUiStore.getState().setMarquee(toPlanRect(marqueeAnchor, event.planPoint))
        return
      }
      if (!grab) return

      const rawAnchor = {
        x: grab.anchorPosition.x + (event.planPoint.x - grab.pointerOrigin.x),
        y: grab.anchorPosition.y + (event.planPoint.y - grab.pointerOrigin.y),
      }
      const { zoom } = readCameraViewport(camera)
      // Ctrl ızgarayı kapatır — duvar ve köşe sürüklemesiyle aynı jest. Izgaraya
      // BASILAN eleman yakalanır, kayma ondan türetilir: grup kendi içindeki
      // göreli düzenini korur, her eleman ayrı ayrı ızgaraya çekilmez.
      const snappedAnchor = event.ctrlKey ? rawAnchor : getPlacementPosition(rawAnchor, zoom)
      dragDeltaRef.current = {
        x: snappedAnchor.x - grab.anchorPosition.x,
        y: snappedAnchor.y - grab.anchorPosition.y,
      }
    }

    const finishMarquee = (event: DrawSurfacePointerEvent) => {
      if (!marqueeAnchor) return

      const rect = toPlanRect(marqueeAnchor, event.planPoint)
      const wasAdditive = isAdditiveMarquee
      endMarquee()

      const ui = usePlumbingUiStore.getState()

      // Sürükleme eşiğin altındaysa bu bir çerçeve değil, boşluğa TIKLAMADIR:
      // seçim bırakılır. Eşik ekran mesafesi (snap toleransıyla aynı), yoksa
      // uzaklaşınca titrek el bile çerçeve başlatırdı.
      const slopCm = getSnapToleranceCm(readCameraViewport(camera).zoom)
      if (rect.maxX - rect.minX < slopCm && rect.maxY - rect.minY < slopCm) {
        if (!wasAdditive) ui.clearSelection()
        return
      }

      const framed = getElementsInRect(rect, readFloorElements(), getMetadata)
      if (wasAdditive) ui.addSelectedElements(framed)
      else ui.setSelectedElements(framed)
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      if (marqueeAnchor) {
        finishMarquee(event)
        return
      }
      if (!grab) return

      const { elementIds } = grab
      const delta = dragDeltaRef.current
      endDrag()

      // Yer değişmediyse (yalnız seçmek için tıklama) store'a hiç yazılmaz:
      // yoksa her tıklama geçmişe boş bir adım bırakırdı.
      if (!delta || (delta.x === 0 && delta.y === 0)) return
      useCadStore.getState().moveElements(elementIds, delta)
    }

    // Esc sürüklemeyi/çerçeveyi iptal eder: store'a yazılmadığı için elemanlar
    // eski yerinde kalır.
    const handleCancel = () => {
      endDrag()
      endMarquee()
      usePlumbingUiStore.getState().clearSelection()
    }

    /**
     * Klavye drawSurfaceEvents'te taşınmıyor (onCancel yalnız Esc) — mimari
     * tarafındaki seçim dinleyicisiyle aynı desen. İki dinleyici aynı anda
     * çalışmaz: her katman yalnız kendi görünümünde mount edilir.
     * Pano işlerinin kendisi store/clipboardActions.ts'te.
     */
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (isTypingTarget(keyEvent.target)) return

      const ui = usePlumbingUiStore.getState()
      const { selectedElementIds } = ui
      const isClipboardModifier = keyEvent.ctrlKey || keyEvent.metaKey
      const key = keyEvent.key.toLowerCase()

      if (isClipboardModifier && key === 'v') {
        keyEvent.preventDefault()
        pasteClipboard()
        return
      }

      if (selectedElementIds.length === 0) return

      if (keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') {
        // Sürükleme ortasında silinirse jest de biter; yoksa pointerup artık var
        // olmayan id'leri taşımaya çalışırdı.
        endDrag()
        useCadStore.getState().removeElements(selectedElementIds)
        ui.clearSelection()
        return
      }

      if (!isClipboardModifier) return

      if (key === 'c') {
        keyEvent.preventDefault()
        copyElementsToClipboard(selectedElementIds)
        return
      }

      if (key === 'x') {
        keyEvent.preventDefault()
        // Sürükleme ortasında kesilirse jest de biter (Delete ile aynı gerekçe).
        endDrag()
        cutElementsToClipboard(selectedElementIds)
      }
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onCancel: handleCancel,
    })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      unsubscribe()
      window.removeEventListener('keydown', handleKeyDown)
      endDrag()
      endMarquee()
      // Araç değişince veya görünümden çıkınca seçim vurgusu asılı kalmasın.
      usePlumbingUiStore.getState().clearSelection()
    }
  }, [camera, isSelectionTool])

  // Silinen eleman seçimde asılı kalmasın: sahipsiz id sürüklemede var olmayanı
  // taşımaya çalışır (mimari taraftaki pruneSelection ile aynı gerekçe).
  useEffect(
    () =>
      useCadStore.subscribe((state) => {
        const ui = usePlumbingUiStore.getState()
        if (ui.selectedElementIds.length === 0) return

        const pruned = pruneElementIds(
          ui.selectedElementIds,
          state.installationElements.map((element) => element.id),
        )
        if (pruned.length !== ui.selectedElementIds.length) ui.setSelectedElements(pruned)
      }),
    [],
  )

  return { draggedElementIds, dragDeltaRef }
}
