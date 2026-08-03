import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import type { Id } from '../core/model'
import { getOpeningTypeForTool } from '../core/opening'
import {
  findOpeningGrab,
  isCornerHandleAtPoint,
  resolveOpeningPreview,
  type OpeningPreview,
  type OpeningToolContext,
} from '../core/openingTool'
import { getSnapToleranceCm } from '../core/snap'
import { SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0
const ERASER_TOOL_ID = 'eraser'

/** Araç mantığı DrawSurface'e YAZILMAZ (CLAUDE.md kural 7); kendi hook'unda yaşar. */
type OpeningGesture =
  | { kind: 'idle' }
  /** Kapı/pencere aracı aktif, imleç duvarın üstünde: hayalet gösteriliyor. */
  | { kind: 'hovering' }
  /** Var olan açıklık sürükleniyor; store'a YALNIZ pointerup'ta yazılır. */
  | { kind: 'dragging'; openingId: Id; grabDeltaCm: number }

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function isSamePreview(
  current: OpeningPreview | undefined,
  next: OpeningPreview | undefined,
): boolean {
  if (!current || !next) return current === next
  return (
    current.wallId === next.wallId &&
    current.offsetCm === next.offsetCm &&
    current.widthCm === next.widthCm &&
    current.type === next.type &&
    current.isValid === next.isValid
  )
}

export function useOpeningTool(): OpeningPreview | undefined {
  const camera = useThree((state) => state.camera)
  const [preview, setPreview] = useState<OpeningPreview | undefined>(undefined)
  // Olay işleyicileri önizlemeyi ref'ten okur: state'i okusalardı effect'in
  // bağımlılığı olur ve her fare hareketinde yeniden abone olurdu.
  const previewRef = useRef<OpeningPreview | undefined>(undefined)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let gesture: OpeningGesture = { kind: 'idle' }
    // Pan/sürükleme başka yerde başlayıp buraya düşen tek başına pointerup
    // istenmeyen yerleştirme yapmasın.
    let isPointerDownSeen = false

    // Store durumu HANDLER İÇİNDE okunur, abonelik olarak değil: aksi halde her
    // store değişiminde effect yeniden kurulur ve dinleyici kümesi çalkalanır.
    const readContext = (): OpeningToolContext => {
      const state = useCadStore.getState()
      return {
        points: state.points,
        walls: state.walls,
        openings: state.openings,
        floorId: state.activeFloorId,
        // Zoom kamerada yaşıyor; olay anında okunuyor ki yeniden abone olmak gerekmesin.
        toleranceCm: getSnapToleranceCm(readCameraViewport(camera).zoom),
      }
    }

    const updatePreview = (next: OpeningPreview | undefined) => {
      // Fare süpürmesi setState fırtınası yaratmasın (Grid.tsx ile aynı numara).
      if (isSamePreview(previewRef.current, next)) return
      previewRef.current = next
      setPreview(next)
    }

    const resolveActiveType = () => getOpeningTypeForTool(useUiStore.getState().activeToolId)

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const toolId = useUiStore.getState().activeToolId
      const activeType = getOpeningTypeForTool(toolId)
      const isEraserActive = toolId === ERASER_TOOL_ID
      const isSelectionActive = toolId === SELECTION_TOOL_ID
      // Aynı yayına A'nın useWallTool'u da abone: sahibi olmadığımız jestten çık.
      if (!activeType && !isEraserActive && !isSelectionActive) return

      const context = readContext()
      if (isSelectionActive && isCornerHandleAtPoint(event.planPoint, context)) return

      isPointerDownSeen = true
      const grab = findOpeningGrab(event.planPoint, context)

      if (isEraserActive) {
        if (!grab) return
        useCadStore.getState().removeOpening(grab.opening.id)
        useArchitectureUiStore.getState().setSelectedOpening(null)
        updatePreview(undefined)
        return
      }

      // Var olan açıklığa basmak onu TAŞIR, üstüne yeni açıklık koymaz: oraya
      // yerleştirme zaten çakışma diye reddedilirdi. Seçim aracında da aynı jest
      // geçerli — kullanıcı kapıyı kaydırmak için önce Kapı Ekle'ye geçmek zorunda kalmasın.
      if (grab) {
        gesture = {
          kind: 'dragging',
          openingId: grab.opening.id,
          grabDeltaCm: grab.grabDeltaCm,
        }
        useArchitectureUiStore.getState().setSelectedOpening(grab.opening.id)
        // Önizleme daha basış anında açıklığın KENDİ yerine sabitlenir: yoksa
        // hareketsiz bir tıklama, hâlâ ref'te duran eski hayaletin offset'ini yazardı.
        updatePreview(
          resolveOpeningPreview(event.planPoint, context, {
            type: grab.opening.type,
            widthCm: grab.opening.widthCm,
            movingOpeningId: grab.opening.id,
            grabDeltaCm: grab.grabDeltaCm,
          }),
        )
        return
      }

      // Seçim aracında boşluğa basmak seçimi bırakır; yerleştirme yapılmaz.
      if (isSelectionActive) {
        useArchitectureUiStore.getState().setSelectedOpening(null)
        isPointerDownSeen = false
        return
      }

      gesture = { kind: 'hovering' }
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      const context = readContext()

      if (gesture.kind === 'dragging') {
        // gesture değişebilir bir let; geri çağrımın içinde daralma kaybolduğu
        // için alanlar burada çözülüyor.
        const { openingId, grabDeltaCm } = gesture
        const dragged = context.openings.find((opening) => opening.id === openingId)
        if (!dragged) return

        updatePreview(
          resolveOpeningPreview(event.planPoint, context, {
            type: dragged.type,
            widthCm: dragged.widthCm,
            movingOpeningId: dragged.id,
            grabDeltaCm,
          }),
        )
        return
      }

      const activeType = resolveActiveType()
      if (!activeType) {
        updatePreview(undefined)
        return
      }

      updatePreview(
        resolveOpeningPreview(event.planPoint, context, {
          type: activeType,
          widthCm: useArchitectureUiStore.getState().openingWidthCm[activeType],
        }),
      )
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return
      const currentPreview = previewRef.current

      if (gesture.kind === 'dragging') {
        const { openingId } = gesture
        gesture = { kind: 'idle' }
        isPointerDownSeen = false

        const dragged = useCadStore
          .getState()
          .openings.find((opening) => opening.id === openingId)
        // Önizleme imlecin altındaki duvarı çözüyor; bırakma o duvara yapılır.
        // Karşılaştırma wallId'yi de kapsamalı, yoksa başka duvara aynı offset'le
        // geçmek "değişiklik yok" sayılıp sessizce yutulurdu.
        const isSamePlace =
          currentPreview?.wallId === dragged?.wallId &&
          currentPreview?.offsetCm === dragged?.offsetCm

        // Sürükleme boyunca store'a hiç yazılmadı: tek yazım = tek markDirty =
        // tek Ctrl+Z (history.ts bağlanınca). Geçersizse taşıma REDDEDİLİR (K13).
        // Yer değişmediyse (sürükleme değil, sadece seçmek için tıklama) hiç yazılmaz.
        if (currentPreview?.isValid && !isSamePlace) {
          useCadStore.getState().moveOpening(openingId, {
            wallId: currentPreview.wallId,
            offsetCm: currentPreview.offsetCm,
          })
        }
        updatePreview(undefined)
        return
      }

      if (!isPointerDownSeen) return
      isPointerDownSeen = false

      const activeType = resolveActiveType()
      if (!activeType || !currentPreview?.isValid) return

      const createdId = useCadStore.getState().addOpening({
        wallId: currentPreview.wallId,
        offsetCm: currentPreview.offsetCm,
        widthCm: currentPreview.widthCm,
        type: activeType,
      })
      // Yeni açıklık seçili kalır ki genişlik şeridi hemen onu düzenleyebilsin.
      if (createdId !== undefined) {
        useArchitectureUiStore.getState().setSelectedOpening(createdId)
      }
    }

    const handleCancel = () => {
      gesture = { kind: 'idle' }
      isPointerDownSeen = false
      updatePreview(undefined)
      useArchitectureUiStore.getState().setSelectedOpening(null)
    }

    // Delete taşıması drawSurfaceEvents'te yok (onCancel yalnız Esc). O dosya
    // D'ye ait ve klavye genel bir mesele, bu yüzden dinleyici burada duruyor.
    // TODO(fay-D): isTypingTarget üçüncü kez kopyalandı (DrawSurface,
    // useViewportControls, burada) — ortak bir yardımcıya çıkarılmalı.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.key !== 'Delete' && event.key !== 'Backspace') return

      const { selectedOpeningId, setSelectedOpening } = useArchitectureUiStore.getState()
      if (selectedOpeningId === null) return

      useCadStore.getState().removeOpening(selectedOpeningId)
      setSelectedOpening(null)
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
    }
  }, [camera])

  return preview
}
