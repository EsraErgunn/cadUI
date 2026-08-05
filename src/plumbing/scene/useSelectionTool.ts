import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import { getLoadedSymbol } from './symbolLoader'
import type { PlanPoint } from '../../core/coords'
import { isTypingTarget } from '../../core/domEvents'
import type { Id } from '../../core/model'
import { getSnapToleranceCm } from '../../core/snap'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { pickElementAt } from '../core/elementPicking'
import { INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'
import { getPlacementPosition } from '../core/placement'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const PRIMARY_BUTTON = 0

type ElementGrab = {
  elementId: Id
  /** Basış noktası ile eleman konumu arasındaki fark; sürükleme boyunca sabit —
   *  olmasaydı sembol imlecin altına zıplardı. */
  grabOffset: PlanPoint
  /** Basış anındaki konum: hiç kıpırdamayan sürükleme store'a yazılmasın diye. */
  origin: PlanPoint
}

export type SelectionToolState = {
  /** Sürüklenen eleman; sahne onu store konumu yerine ref'ten çizer. */
  draggedElementId: Id | null
  draggedPositionRef: RefObject<PlanPoint | null>
}

/**
 * Tesisat elemanı seçme ve sürükleme. Araç mantığı DrawSurface'e YAZILMAZ (kural 7).
 *
 * Tutma R3F'in ışın olaylarıyla değil, saf geometriyle yapılıyor
 * (core/elementPicking.ts). Sebep: DrawSurface tuvalin kendi DOM olayını
 * dinliyor, R3F de aynı tuvale kendi dinleyicisini kuruyor; "boş alana tıklayınca
 * seçim temizlensin" iki dinleyicinin kayıt SIRASINA bağlı kalırdı. Tek olay
 * kaynağı = kayıt sırasından bağımsız davranış (knowledge/gesture-bus-precedence.md),
 * üstelik tutma sınavı saf fonksiyon olarak test edilebiliyor.
 *
 * Sürükleme boyunca store'a YAZILMAZ: konum ref'te birikir, pointerup'ta tek
 * moveElement çağrılır → tek markDirty → tek Ctrl+Z.
 */
export function useSelectionTool(): SelectionToolState {
  const camera = useThree((state) => state.camera)
  const activeToolId = useUiStore((state) => state.activeToolId)
  const isSelectionTool = activeToolId === INSTALLATION_SELECTION_TOOL_ID
  // Sürüklenen eleman React durumu: jest başına İKİ render (başlangıç + bitiş).
  // Konumun kendisi ref'te — her pointermove render tetikleseydi sürükleme takılırdı.
  const [draggedElementId, setDraggedElementId] = useState<Id | null>(null)
  const draggedPositionRef = useRef<PlanPoint | null>(null)

  useEffect(() => {
    if (!isSelectionTool || !(camera instanceof OrthographicCamera)) return undefined

    let grab: ElementGrab | undefined

    const endDrag = () => {
      grab = undefined
      draggedPositionRef.current = null
      setDraggedElementId(null)
    }

    const clearSelection = () => {
      usePlumbingUiStore.getState().setSelectedElement(null)
    }

    /** Seçim yalnız aktif katta: hayalet katmanlar zaten seçilemez. */
    const readFloorElements = () => {
      const cad = useCadStore.getState()
      return cad.installationElements.filter((element) => element.floorId === cad.activeFloorId)
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const { zoom } = readCameraViewport(camera)
      const target = pickElementAt(
        event.planPoint,
        readFloorElements(),
        (type) => getLoadedSymbol(type).metadata,
        getSnapToleranceCm(zoom),
      )

      // Boş alana tıklama seçimi temizler.
      usePlumbingUiStore.getState().setSelectedElement(target?.id ?? null)
      if (!target) return

      grab = {
        elementId: target.id,
        grabOffset: {
          x: target.position.x - event.planPoint.x,
          y: target.position.y - event.planPoint.y,
        },
        origin: target.position,
      }
      setDraggedElementId(target.id)
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!grab) return

      const raw = {
        x: event.planPoint.x + grab.grabOffset.x,
        y: event.planPoint.y + grab.grabOffset.y,
      }
      const { zoom } = readCameraViewport(camera)
      // Ctrl ızgarayı kapatır — duvar ve köşe sürüklemesiyle aynı jest.
      // Izgara adımı yerleştirmeyle AYNI fonksiyondan gelir: bırakılan sembol
      // yerleştirilenle aynı çizgiye otursun.
      draggedPositionRef.current = event.ctrlKey ? raw : getPlacementPosition(raw, zoom)
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!grab || event.button !== PRIMARY_BUTTON) return

      const { elementId, origin } = grab
      const dropped = draggedPositionRef.current
      endDrag()

      // Yer değişmediyse (yalnız seçmek için tıklama) store'a hiç yazılmaz:
      // yoksa her tıklama geçmişe boş bir adım bırakırdı.
      if (!dropped || (dropped.x === origin.x && dropped.y === origin.y)) return
      useCadStore.getState().moveElement(elementId, dropped)
    }

    // Esc sürüklemeyi iptal eder: store'a yazılmadığı için eleman eski yerinde kalır.
    const handleCancel = () => {
      endDrag()
      clearSelection()
    }

    // Klavye drawSurfaceEvents'te taşınmıyor (onCancel yalnız Esc) — mimari
    // tarafındaki duvar silme dinleyicisiyle aynı desen. İki dinleyici aynı anda
    // silmez: her katman yalnız kendi görünümünde mount edilir.
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (isTypingTarget(keyEvent.target)) return
      if (keyEvent.key !== 'Delete' && keyEvent.key !== 'Backspace') return

      const { selectedElementId } = usePlumbingUiStore.getState()
      if (selectedElementId === null) return

      // Sürükleme ortasında silinirse jest de biter; yoksa pointerup artık var
      // olmayan bir id'yi taşımaya çalışırdı.
      endDrag()
      useCadStore.getState().removeElement(selectedElementId)
      clearSelection()
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
      // Araç değişince veya görünümden çıkınca seçim vurgusu asılı kalmasın.
      clearSelection()
    }
  }, [camera, isSelectionTool])

  return { draggedElementId, draggedPositionRef }
}
