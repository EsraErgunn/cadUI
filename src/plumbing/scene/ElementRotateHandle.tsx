import { Html } from '@react-three/drei'
import { RotateCw } from 'lucide-react'

import { ELEMENT_ROTATE_HANDLE_ELEVATION_CM } from './plumbingLayers'
import { getLoadedSymbol } from './symbolLoader'
import { useCameraZoom } from './useCameraZoom'
import { useElementRotateTool } from './useElementRotateTool'
import { planToThree } from '../../core/coords'
import { useCadStore } from '../../store/cadStore'
import { getElementRotateAnchorLocal, getElementRotateHandlePosition } from '../core/elementRotateHandle'
import type { InstallationElement } from '../core/installationModel'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/**
 * Seçimin döndürülebilir TEK elemanı — görünürlük burada, tutulabilirlik
 * `findSelectedElementRotateHandle`de: ikisi AYNI koşulu (tek seçim, tutunma
 * noktası TEK ya da hiç yok) sınıyor, ayrışsalardı görünüp tutulamayan ya da
 * görünmeden tutulan bir tutamaç ortaya çıkardı (bkz. core dosyasındaki not).
 */
function useRotatableSelectedElement(): InstallationElement | undefined {
  const selectedElementIds = usePlumbingUiStore((state) => state.selectedElementIds)
  const selectedLineIds = usePlumbingUiStore((state) => state.selectedLineIds)
  const elements = useCadStore((state) => state.installationElements)
  const connections = useCadStore((state) => state.installationConnections)
  const lines = useCadStore((state) => state.installationLines)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  if (selectedElementIds.length !== 1 || selectedLineIds.length !== 0) return undefined

  const element = elements.find((candidate) => candidate.id === selectedElementIds[0])
  if (!element || element.floorId !== activeFloorId) return undefined

  const metadata = getLoadedSymbol(element.type).metadata
  const anchorLocal = getElementRotateAnchorLocal(element.id, metadata, connections, lines)
  if (!anchorLocal) return undefined

  return element
}

type HandleIconProps = {
  element: InstallationElement
  zoom: number
  isHovered: boolean
}

/**
 * Tutamaç ikonu — `scene/AreaObjectHandles.tsx`'teki DÖNDÜRME ikonuyla AYNI
 * görsel dil (boyut, renk, `pointer-events: none`): kullanıcı isteği "mimari
 * çizimdeki döndürmeyi kullanabiliriz". Ayrı kopya, çünkü o dosya B'nin
 * (mimari) alanı — buradaki plumbing kendi elemanına göre konum hesaplıyor.
 *
 * `pointer-events: none` ŞART: tıklama tuvale ulaşmalı, tutma kararını
 * `useElementRotateTool` saf geometriyle veriyor.
 */
function HandleIcon({ element, zoom, isHovered }: HandleIconProps) {
  const metadata = getLoadedSymbol(element.type).metadata
  const position = getElementRotateHandlePosition(element, metadata, zoom)

  return (
    <Html
      position={planToThree(position, ELEMENT_ROTATE_HANDLE_ELEVATION_CM)}
      center
      zIndexRange={[80, 0]}
      wrapperClass="pointer-events-none"
    >
      <div
        aria-hidden
        className={`pointer-events-none flex size-6 items-center justify-center rounded-full border shadow-sm transition-colors ${
          isHovered
            ? 'border-selection bg-selection text-white'
            : 'border-canvas-overlay-edge bg-canvas-overlay text-canvas-overlay-ink'
        }`}
      >
        <RotateCw size={14} strokeWidth={2} />
      </div>
    </Html>
  )
}

/**
 * Elemanın döndürme tutamacı — tek eleman seçiliyken VE elemanın tutunma
 * noktası tekil (ya da hiç yoksa) görünür (bkz. `getElementRotateAnchorLocal`).
 * Boruya/porta bağlı elemanlarda döndürme, tutunduğu noktayı dünyada sabit
 * tutar (`useElementRotateTool.ts`) — bu yüzden `free` modla sınırlı DEĞİL.
 */
export function ElementRotateHandle() {
  useElementRotateTool()

  const element = useRotatableSelectedElement()
  const dragAngleDeg = usePlumbingUiStore((state) => state.elementRotateDrag?.angleDeg)
  const dragPosition = usePlumbingUiStore((state) => state.elementRotateDrag?.position)
  const isHandleHovered = usePlumbingUiStore((state) => state.isElementRotateHandleHovered)
  const isDragging = usePlumbingUiStore(
    (state) => state.elementRotateDrag?.elementId === element?.id,
  )
  const zoom = useCameraZoom()

  if (!element) return null

  // Sürükleme sırasında ikon ÖNİZLENEN açı+konumu takip eder; nesnenin kendisi
  // de AYNI kaynaktan (`SymbolInstance` → `elementRotateDrag`) canlı döner —
  // ikisi ayrı hesaplansaydı ikon nesnenin gerisinde kalırdı.
  const previewElement = isDragging && dragAngleDeg !== undefined && dragPosition !== undefined
    ? { ...element, angleDeg: dragAngleDeg, position: dragPosition }
    : element

  return (
    <HandleIcon
      element={previewElement}
      zoom={zoom}
      isHovered={isHandleHovered || isDragging === true}
    />
  )
}
