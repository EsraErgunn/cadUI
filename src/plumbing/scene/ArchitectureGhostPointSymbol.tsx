import { Line } from '@react-three/drei'

import { ARCHITECTURE_GHOST_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import {
  getPointSymbolPlanGeometry,
  type SymbolStrokeRole,
} from '../../core/architectureSymbol'
import { planToThree } from '../../core/coords'
import type { PointSymbolType } from '../../core/model'
import type { SymbolPose } from '../../core/symbolPlacement'
import { RENDER_ORDER } from '../../scene/layers'

/**
 * `ArchitectureGhost`in (Ghosts.tsx) nokta sembolü şekli — ayrı dosyada,
 * kalan mimari hayalet şekilleriyle (`ArchitectureGhostWalls.tsx`,
 * `ArchitectureGhostFixtures.tsx`) birlikte 200 satır sınırını aşıyordu.
 */

/** Gövde/ayrıntı çizgi kalınlığı gerçek `PointSymbol.tsx` ile AYNI (piksel). */
const GHOST_POINT_SYMBOL_STROKE_WIDTHS: Record<SymbolStrokeRole, number> = {
  body: 1.8,
  detail: 1.2,
}

/**
 * Hayalet nokta sembolü (aydınlatma, pano, yangın söndürücü, alarm cihazı,
 * deprem sensörü, menfez, ana kesme şalteri): `PointSymbol.tsx` ile AYNI
 * geometriden (`core/architectureSymbol.ts`), soluk tonda ve İÇİ BOŞ.
 *
 * Dolgu KONTURA döner (K154/K165, kâğıtla aynı): duvarın içi de artık zemin
 * rengi olduğu için dolu bir sembol duvardan taşan tek koyu leke olur ve gözü
 * tesisattan çalardı.
 *
 * Gömülü cihazın (pano, menfez) ayak izini ZEMİN rengiyle "delme" işi de
 * kalktı: delik, hayalet duvarın dolu bir bant olduğu zamanın çözümüydü —
 * duvar içi boşalınca gereksizleşti.
 */
export function GhostPointSymbol({ type, pose }: { type: PointSymbolType; pose: SymbolPose }) {
  const geometry = getPointSymbolPlanGeometry(type, pose)

  return (
    <>
      {geometry.fills.map((fill, index) => (
        <Line
          key={index}
          points={[...fill, fill[0]].map((point) =>
            planToThree(point, ARCHITECTURE_GHOST_ELEVATION_CM),
          )}
          color={PLUMBING_COLORS.architectureGhostFaint}
          lineWidth={GHOST_POINT_SYMBOL_STROKE_WIDTHS.body}
          frustumCulled={false}
          renderOrder={RENDER_ORDER.architectureGhostPointSymbol}
          depthWrite={false}
          raycast={() => null}
          toneMapped={false}
        />
      ))}

      {geometry.strokes.map((stroke) => (
        <Line
          key={stroke.name}
          points={stroke.points.map((point) =>
            planToThree(point, ARCHITECTURE_GHOST_ELEVATION_CM),
          )}
          color={PLUMBING_COLORS.architectureGhostFaint}
          lineWidth={GHOST_POINT_SYMBOL_STROKE_WIDTHS[stroke.role]}
          frustumCulled={false}
          renderOrder={RENDER_ORDER.architectureGhostPointSymbol}
          depthWrite={false}
          raycast={() => null}
          toneMapped={false}
        />
      ))}
    </>
  )
}
