import { Line } from '@react-three/drei'

import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { planToThree, type ThreePosition } from '../core/coords'
import type { PlanRect } from '../core/selection'
import { useArchitectureUiStore } from '../store/architectureUiStore'

/** Kesik çizgi: dolu çerçeve altındaki çizimi okunmaz yapardı. */
const DASH_SIZE_CM = 12
const GAP_SIZE_CM = 8

function toRing(rect: PlanRect): ThreePosition[] {
  const corners = [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY },
  ]
  // Halka elle kapatılıyor: drei <Line>'ın bu sürümünde `closed` propu yok.
  return [...corners, corners[0]].map((corner) => planToThree(corner, HANDLE_ELEVATION_CM))
}

/**
 * Sürüklenen seçim çerçevesi (KK-10). Yalnız çizer — hangi nesnenin kapsandığına
 * `useSelectionTool` bırakma anında karar verir; burada geometri hesaplanmaz.
 *
 * Tutamaklarla aynı yükseklikte ve en üstte: çerçeve her şeyin üzerinde okunmalı.
 */
export function SelectionMarquee() {
  const marquee = useArchitectureUiStore((state) => state.marquee)
  if (!marquee) return null

  return (
    <Line
      points={toRing(marquee)}
      color={SCENE_COLORS.selection}
      lineWidth={1.5}
      dashed
      dashSize={DASH_SIZE_CM}
      gapSize={GAP_SIZE_CM}
      renderOrder={RENDER_ORDER.handle}
      depthWrite={false}
      // Çerçevenin kendisi tıklanabilir değil: altındaki nesneyi gölgelemesin.
      raycast={() => null}
      toneMapped={false}
    />
  )
}
