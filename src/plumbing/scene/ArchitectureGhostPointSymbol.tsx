import { Line } from '@react-three/drei'

import { ARCHITECTURE_GHOST_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import {
  getPointSymbolPlanGeometry,
  SYMBOL_DISPLAY,
  type SymbolStrokeRole,
} from '../../core/architectureSymbol'
import { planToThree, type PlanPoint } from '../../core/coords'
import type { PointSymbolType } from '../../core/model'
import { triangulatePolygon } from '../../core/roomFill'
import type { SymbolPose } from '../../core/symbolPlacement'
import { RENDER_ORDER } from '../../scene/layers'
import { SCENE_COLORS } from '../../scene/sceneTheme'

/**
 * `ArchitectureGhost`in (Ghosts.tsx) nokta sembolü şekli — ayrı dosyada,
 * kalan mimari hayalet şekilleriyle (`ArchitectureGhostWalls.tsx`,
 * `ArchitectureGhostFixtures.tsx`) birlikte 200 satır sınırını aşıyordu.
 */
function toGhostFillPositions(corners: readonly PlanPoint[], elevationCm: number): Float32Array {
  const triangleCorners = triangulatePolygon(corners)
  const positions = new Float32Array(triangleCorners.length * 3)

  triangleCorners.forEach((corner, index) => {
    positions.set(planToThree(corner, elevationCm), index * 3)
  })

  return positions
}

/** Gövde/ayrıntı çizgi kalınlığı gerçek `PointSymbol.tsx` ile AYNI (piksel). */
const GHOST_POINT_SYMBOL_STROKE_WIDTHS: Record<SymbolStrokeRole, number> = {
  body: 1.8,
  detail: 1.2,
}

/**
 * Hayalet nokta sembolü (aydınlatma, pano, yangın söndürücü, alarm cihazı,
 * deprem sensörü, menfez, ana kesme şalteri): `PointSymbol.tsx` ile AYNI
 * geometriden (`core/architectureSymbol.ts`), tek soluk renkte.
 *
 * Gömülü cihaz (pano, menfez — `SYMBOL_DISPLAY[type].style === 'embedded'`)
 * duvarın TAM İÇİNDE durur: gerçek görünümde duvar/sembol AYRI renkte olduğu
 * için ayırt edilir, hayalette ikisi de AYNI tek tona boyandığından aksi hâlde
 * duvarın içinde kaybolurdu. `GhostOpening` ile aynı çözüm: cihazın ayak izi
 * önce ZEMİN rengiyle "delinir", ardından ana hatlar bu deliğin üstüne çizilir.
 *
 * Pano (`filledRect`) DOLU bir dikdörtgen döndürür — ayak izi TAM delikle
 * ÇAKIŞIR. Dolgu da hayalet tonuna boyanıp delik gibi üstüne çizilseydi deliği
 * uçtan uca kapatır, kontrast sıfırlanırdı (menfez'in dolgusu zaten yok, bu
 * yüzden onda sorun çıkmıyordu). Gömülüde dolgu bu yüzden hiç çizilmez —
 * yalnız delik + dış hat kalır, pencere gibi "açık kutu" okunur.
 */
export function GhostPointSymbol({ type, pose }: { type: PointSymbolType; pose: SymbolPose }) {
  const geometry = getPointSymbolPlanGeometry(type, pose)
  const isEmbedded = SYMBOL_DISPLAY[type].style === 'embedded'
  const outline = geometry.strokes.find((stroke) => stroke.name === 'outline')

  return (
    <>
      {isEmbedded && outline && (
        <mesh
          frustumCulled={false}
          renderOrder={RENDER_ORDER.architectureGhostPointSymbol}
          raycast={() => null}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                // Son nokta ilk köşenin tekrarı (kapanış); üçgenleme dejenere
                // kenar üretmesin diye dolguya girmez.
                toGhostFillPositions(outline.points.slice(0, -1), ARCHITECTURE_GHOST_ELEVATION_CM),
                3,
              ]}
            />
          </bufferGeometry>
          <meshBasicMaterial color={SCENE_COLORS.background} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {!isEmbedded &&
        geometry.fills.map((fill, index) => (
          <mesh
            key={index}
            frustumCulled={false}
            renderOrder={RENDER_ORDER.architectureGhostPointSymbol}
            raycast={() => null}
          >
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[toGhostFillPositions(fill, ARCHITECTURE_GHOST_ELEVATION_CM), 3]}
              />
            </bufferGeometry>
            <meshBasicMaterial
              color={PLUMBING_COLORS.architectureGhost}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}

      {geometry.strokes.map((stroke) => (
        <Line
          key={stroke.name}
          points={stroke.points.map((point) =>
            planToThree(point, ARCHITECTURE_GHOST_ELEVATION_CM),
          )}
          color={PLUMBING_COLORS.architectureGhost}
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
