import { Line } from '@react-three/drei'

import { SELECTION_MARQUEE_ELEVATION_CM } from './plumbingLayers'
import { planToThree, type ThreePosition } from '../../core/coords'
import type { PlanRect } from '../../core/selection'
import { RENDER_ORDER } from '../../scene/layers'
import { SCENE_COLORS } from '../../scene/sceneTheme'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/** Kesik çizgi: dolu çerçeve altındaki çizimi okunmaz yapardı. */
const DASH_SIZE_CM = 12
const GAP_SIZE_CM = 8
const MARQUEE_LINE_WIDTH = 1.5

function toRing(rect: PlanRect): ThreePosition[] {
  const corners = [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY },
  ]
  // Halka elle kapatılıyor: drei <Line>'ın bu sürümünde `closed` propu yok.
  return [...corners, corners[0]].map((corner) =>
    planToThree(corner, SELECTION_MARQUEE_ELEVATION_CM),
  )
}

/**
 * Sürüklenen seçim çerçevesi. Yalnız çizer — hangi elemanın kapsandığına
 * `useSelectionTool` bırakma anında karar verir; burada geometri hesaplanmaz.
 *
 * TODO(tesisat): mimarideki scene/SelectionMarquee.tsx ile aynı çizim; ikisi
 * `rect` propu alan tek bileşene indirgenecek. Bugün ayrı, çünkü o dosya mimari
 * fayın ve kendi store'una bağlı.
 */
export function SelectionMarquee() {
  const marquee = usePlumbingUiStore((state) => state.marquee)
  if (!marquee) return null

  return (
    <Line
      points={toRing(marquee)}
      color={SCENE_COLORS.selection}
      lineWidth={MARQUEE_LINE_WIDTH}
      dashed
      dashSize={DASH_SIZE_CM}
      gapSize={GAP_SIZE_CM}
      renderOrder={RENDER_ORDER.handle}
      depthWrite={false}
      // Çerçevenin kendisi tıklanabilir değil: altındaki elemanı gölgelemesin.
      raycast={() => null}
      toneMapped={false}
    />
  )
}
