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
import {
  expandMoveSelection,
  isFixedCompanionValve,
  resolveOnLineSlide,
  type OnLineSlideTarget,
} from '../core/elementAttach'
import { getElementsInRect, pickElementAt } from '../core/elementPicking'
import { pruneElementIds } from '../core/elementSelection'
import type { InstallationElement } from '../core/installationModel'
import { INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'
import { getLinesInRect, pickLineAt } from '../core/linePicking'
import type { InstallationElementType } from '../core/symbolMetadata'
import {
  copySelectionToClipboard,
  cutSelectionToClipboard,
  pasteClipboard,
} from '../store/clipboardActions'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const PRIMARY_BUTTON = 0

type SelectionGrab = {
  /** Sürüklenen seçimin tamamı; hepsi aynı kaymayla taşınır. */
  elementIds: Id[]
  /** Seçili hatlar: TÜM köşeleriyle birlikte aynı kaymayla taşınır. */
  lineIds: Id[]
  /** Basılan elemanın basış anındaki konumu — ızgara ona göre yakalanır. */
  anchorPosition: PlanPoint
  pointerOrigin: PlanPoint
  /**
   * TEK eleman + o eleman boruya oturan (`onLine`) bir armatürse dolu: borunun
   * ŞEKLİ SABİT kalır, eleman yalnız kendi iki komşusu arasında KAYAR (bkz.
   * `resolveOnLineSlide`). `result` her pointermove'da güncellenir, pointerup
   * onu MUTLAK olarak yazar — grup taşımasındaki kayma (delta) mantığından
   * FARKLI bir yazım yolu olduğu için `moveElements` yerine ayrı bir store
   * eylemi (`slideOnLineElement`) kullanılır.
   */
  slide?: {
    elementType: InstallationElementType
    angleDeg: number
    result: OnLineSlideTarget | null
  }
}

export type SelectionToolState = {
  /** Sürüklenen elemanlar; sahne onları store konumu + kayma ile çizer. */
  draggedElementIds: readonly Id[]
  /** Sürüklenen hatlar; aynı kaymayla ELEMANLARLA EŞ ZAMANLI çizilir. */
  draggedLineIds: readonly Id[]
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
  const [draggedLineIds, setDraggedLineIds] = useState<readonly Id[]>([])
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
      setDraggedLineIds([])
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

    const readFloorLines = () => {
      const cad = useCadStore.getState()
      return cad.installationLines.filter((line) => line.floorId === cad.activeFloorId)
    }

    const readConnections = () => useCadStore.getState().installationConnections

    const getMetadata = (type: Parameters<typeof getLoadedSymbol>[0]) =>
      getLoadedSymbol(type).metadata

    /**
     * Sürüklemenin canlı önizlemesi commit'teki (moveElements) genişletmeyle
     * AYNI kümeyi göstersin diye aynı fonksiyondan geçer (bkz. elementAttach.ts).
     * Sayaç/cihazla gelen otomatik vana burada FARE ile taşınabilir kümeden
     * elenir — bu eleme yalnız etkileşim katmanında: `moveElements`'i doğrudan
     * çağıran kod (ör. testler) valveyi hâlâ taşıyabilir.
     */
    const startGroupDrag = (
      elementIds: readonly Id[],
      lineIds: readonly Id[],
      anchorPosition: PlanPoint,
      pointerOrigin: PlanPoint,
    ) => {
      const lines = readFloorLines()
      const connections = readConnections()
      const movableElementIds = expandMoveSelection(lines, connections, elementIds, lineIds).filter(
        (id) => !isFixedCompanionValve(lines, connections, id),
      )
      grab = {
        elementIds: movableElementIds,
        lineIds: [...lineIds],
        anchorPosition,
        pointerOrigin,
      }
      setDraggedElementIds(movableElementIds)
      setDraggedLineIds(lineIds)
    }

    /** Elemana basılmadığında: hat aranır, yoksa jest bir çerçeve seçimidir. */
    const handleEmptyPointerDown = (event: DrawSurfacePointerEvent, zoom: number) => {
      const ui = usePlumbingUiStore.getState()
      const lineId = pickLineAt(event.planPoint, readFloorLines(), getSnapToleranceCm(zoom))
      if (lineId === null) {
        // Boşluğa basış: jest bir çerçevedir. Seçimin temizlenip temizlenmeyeceğine
        // pointerup karar verir — sürükleme eşiğin altında kalırsa bu bir tıklamadır.
        marqueeAnchor = event.planPoint
        isAdditiveMarquee = event.shiftKey
        return
      }

      if (event.shiftKey) {
        ui.toggleSelectedLine(lineId)
        return
      }

      // Zaten seçili bir hatta basmak TÜM seçimi (elemanlar dahil) KORUR:
      // karma seçim (boru + eleman) aynı jestte birlikte sürüklenebilsin.
      const isAlreadySelected = ui.selectedLineIds.includes(lineId)
      if (!isAlreadySelected) {
        ui.setSelectedElements([])
        ui.setSelectedLines([lineId])
      }

      startGroupDrag(
        isAlreadySelected ? ui.selectedElementIds : [],
        isAlreadySelected ? ui.selectedLineIds : [lineId],
        event.planPoint,
        event.planPoint,
      )
    }

    /** Bir elemana basıldığında: seçim güncellenir, ardından kaydırma/grup
     *  sürüklemesi başlar (sayaç/cihazla gelen vana hariç, K-W3). */
    const handleElementPointerDown = (event: DrawSurfacePointerEvent, target: InstallationElement) => {
      const ui = usePlumbingUiStore.getState()

      // Shift+tık seçimi değiştirir ve sürükleme BAŞLATMAZ: aynı jestte hem
      // seçime ekleyip hem taşımak, kullanıcının hangisini istediğini belirsiz kılar.
      if (event.shiftKey) {
        ui.toggleSelectedElement(target.id)
        return
      }

      // Seçimin içindeki bir elemana basmak TÜM seçimi (hatlar dahil) KORUR
      // (karma grubu birlikte taşımak için); dışındakine basmak seçimi ona indirger.
      const isTargetAlreadySelected = ui.selectedElementIds.includes(target.id)
      if (!isTargetAlreadySelected) {
        ui.setSelectedElements([target.id])
        ui.setSelectedLines([])
      }
      const elementIds = isTargetAlreadySelected ? ui.selectedElementIds : [target.id]
      const lineIds = isTargetAlreadySelected ? ui.selectedLineIds : []

      // Sayaç/cihazla gelen otomatik vana ayrı taşınamaz: seçilir ama
      // sürüklenmez, yalnız ana eleman (sayaç/cihaz) hareket eder. BU KONTROL
      // kaydırmadan ÖNCE yapılır: sayacın vanası (`resolveFreeEndAttachment`)
      // hat uzadığı için İKİ komşuya da sahiptir, yani `resolveOnLineSlide`
      // BAŞARIYLA sonuç dönerdi — sırası ters olsaydı kilit hiç devreye girmezdi.
      if (
        elementIds.length === 1 &&
        lineIds.length === 0 &&
        isFixedCompanionValve(readFloorLines(), readConnections(), target.id)
      ) {
        return
      }

      // Tek eleman (hat seçili değilken) + boruya oturan bir armatürse (iki
      // komşusu da varsa) sürükleme KAYDIRMA modunda başlar — grup taşımasında
      // hep SERBEST kayma kullanılır.
      const slideResult =
        elementIds.length === 1 && lineIds.length === 0
          ? resolveOnLineSlide(
              readFloorLines(),
              getMetadata,
              target.id,
              target.type,
              target.angleDeg,
              event.planPoint,
            )
          : null

      if (slideResult) {
        grab = {
          elementIds: [...elementIds],
          lineIds: [],
          anchorPosition: target.position,
          pointerOrigin: event.planPoint,
          slide: { elementType: target.type, angleDeg: target.angleDeg, result: slideResult },
        }
        setDraggedElementIds(elementIds)
        return
      }

      startGroupDrag(elementIds, lineIds, target.position, event.planPoint)
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const { zoom } = readCameraViewport(camera)
      const target = pickElementAt(
        event.planPoint,
        readFloorElements(),
        getMetadata,
        getSnapToleranceCm(zoom),
      )

      if (!target) {
        handleEmptyPointerDown(event, zoom)
        return
      }

      handleElementPointerDown(event, target)
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (marqueeAnchor) {
        usePlumbingUiStore.getState().setMarquee(toPlanRect(marqueeAnchor, event.planPoint))
        return
      }
      if (!grab) return

      if (grab.slide) {
        const resolved = resolveOnLineSlide(
          readFloorLines(),
          getMetadata,
          grab.elementIds[0],
          grab.slide.elementType,
          grab.slide.angleDeg,
          event.planPoint,
        )
        grab.slide.result = resolved
        dragDeltaRef.current = resolved
          ? {
              x: resolved.elementPosition.x - grab.anchorPosition.x,
              y: resolved.elementPosition.y - grab.anchorPosition.y,
            }
          : null
        return
      }

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

      const framedElements = getElementsInRect(rect, readFloorElements(), getMetadata)
      const framedLines = getLinesInRect(rect, readFloorLines())
      if (wasAdditive) {
        ui.addSelectedElements(framedElements)
        ui.addSelectedLines(framedLines)
      } else {
        ui.setSelectedElements(framedElements)
        ui.setSelectedLines(framedLines)
      }
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      if (marqueeAnchor) {
        finishMarquee(event)
        return
      }
      if (!grab) return

      if (grab.slide) {
        const elementId = grab.elementIds[0]
        const result = grab.slide.result
        endDrag()

        if (!result) return
        useCadStore
          .getState()
          .slideOnLineElement(
            result.lineId,
            result.pointId,
            elementId,
            result.nodePosition,
            result.elementPosition,
          )
        return
      }

      const { elementIds, lineIds } = grab
      const delta = dragDeltaRef.current
      endDrag()

      // Yer değişmediyse (yalnız seçmek için tıklama) store'a hiç yazılmaz:
      // yoksa her tıklama geçmişe boş bir adım bırakırdı.
      if (!delta || (delta.x === 0 && delta.y === 0)) return
      useCadStore.getState().moveElements(elementIds, lineIds, delta)
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
      const { selectedElementIds, selectedLineIds } = ui
      const isClipboardModifier = keyEvent.ctrlKey || keyEvent.metaKey
      const key = keyEvent.key.toLowerCase()

      if (isClipboardModifier && key === 'v') {
        keyEvent.preventDefault()
        pasteClipboard()
        return
      }

      if (keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') {
        if (selectedElementIds.length === 0 && selectedLineIds.length === 0) return

        // Sürükleme ortasında silinirse jest de biter; yoksa pointerup artık var
        // olmayan id'leri taşımaya çalışırdı.
        endDrag()
        // Eleman ve hat TEK çağrıda gider: bir silme jesti = bir Ctrl+Z.
        useCadStore.getState().removeSelection(selectedElementIds, selectedLineIds)
        ui.clearSelection()
        return
      }

      if (selectedElementIds.length === 0 && selectedLineIds.length === 0) return
      if (!isClipboardModifier) return

      if (key === 'c') {
        keyEvent.preventDefault()
        copySelectionToClipboard(selectedElementIds, selectedLineIds)
        return
      }

      if (key === 'x') {
        keyEvent.preventDefault()
        // Sürükleme ortasında kesilirse jest de biter (Delete ile aynı gerekçe).
        endDrag()
        cutSelectionToClipboard(selectedElementIds, selectedLineIds)
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

  // Silinen eleman/hat seçimde asılı kalmasın: sahipsiz id sürüklemede var
  // olmayanı taşımaya çalışır (mimari taraftaki pruneSelection ile aynı gerekçe).
  useEffect(
    () =>
      useCadStore.subscribe((state) => {
        const ui = usePlumbingUiStore.getState()

        if (ui.selectedElementIds.length > 0) {
          const pruned = pruneElementIds(
            ui.selectedElementIds,
            state.installationElements.map((element) => element.id),
          )
          if (pruned.length !== ui.selectedElementIds.length) ui.setSelectedElements(pruned)
        }

        if (ui.selectedLineIds.length > 0) {
          const pruned = pruneElementIds(
            ui.selectedLineIds,
            state.installationLines.map((line) => line.id),
          )
          if (pruned.length !== ui.selectedLineIds.length) ui.setSelectedLines(pruned)
        }
      }),
    [],
  )

  return { draggedElementIds, draggedLineIds, dragDeltaRef }
}
