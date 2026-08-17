import { Line } from '@react-three/drei'

import { ARCHITECTURE_GHOST_ELEVATION_CM, ARCHITECTURE_GHOST_SYMBOL_LIFT_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { planToThree, type PlanPoint, type ThreePosition } from '../../core/coords'
import type { OpeningType, Wall as WallData } from '../../core/model'
import { getOpeningSymbol, type OpeningSymbolRole } from '../../core/openingSymbol'
import { type PointIndex } from '../../core/wall'
import { getWallCapsuleFrom } from '../../core/wallShape'
import { RENDER_ORDER } from '../../scene/layers'
import { toOpeningFillPositions } from '../../scene/openingFill'
import { SCENE_COLORS } from '../../scene/sceneTheme'
import { getWallLineWidthPx } from '../../scene/wallStyle'

/**
 * `ArchitectureGhost`in (Ghosts.tsx) duvar + açıklık şekilleri — ayrı dosyada,
 * kalan şekillerle (oda/kiriş/alan nesnesi/nokta sembolü, `ArchitectureGhostFixtures.tsx`)
 * birlikte 200 satır sınırını aşıyordu.
 *
 * Her şekil, mimari görünümdeki KARŞILIĞIYLA (Wall/Opening.tsx) AYNI geometriden
 * çizilir — ayrı bir "kaba hayalet" tutulmuyor, yalnız tek soluk renge boyanıyor
 * (bkz. knowledge/ghost-layers.md).
 */

/**
 * Mimari görünümün 1.8 / 1.2 / 1 oranı, hayalette bir tık ince: açıklık bağlam,
 * konu değil — duvar kütlesi baskın kalsın, delik onun üstünde okunsun.
 */
const GHOST_OPENING_STROKE_WIDTHS: Record<OpeningSymbolRole, number> = {
  jamb: 1.4,
  face: 1,
  detail: 0.8,
}

type GhostLineProps = {
  points: ThreePosition[]
  lineWidth: number
}

/** Hayaletin her çizgisi raycast DIŞI — mimari bu görünümde seçilemez, salt bağlam. */
function GhostLine({ points, lineWidth }: GhostLineProps) {
  return (
    <Line
      points={points}
      color={PLUMBING_COLORS.architectureGhost}
      lineWidth={lineWidth}
      renderOrder={RENDER_ORDER.architectureGhostOpening}
      depthWrite={false}
      raycast={() => null}
      toneMapped={false}
    />
  )
}

/**
 * Hayalet duvar = soluk renkli kapsül. scene/Wall.tsx ile AYNI geometri: mimari
 * görünümde union yok, duvarlar üst üste çizilir ve kavşak kendiliğinden dolar (K23).
 */
export function GhostWall({
  wall,
  pointIndex,
  zoom,
}: {
  wall: WallData
  pointIndex: PointIndex
  /** Kalınlığın ekran tabanı zoom'a bağlı; kapsayıcı bir kez okur. */
  zoom: number
}) {
  const capsule = getWallCapsuleFrom(wall, pointIndex)
  if (!capsule) return null

  return (
    <Line
      points={[
        planToThree(capsule.p1, ARCHITECTURE_GHOST_ELEVATION_CM),
        planToThree(capsule.p2, ARCHITECTURE_GHOST_ELEVATION_CM),
      ]}
      color={PLUMBING_COLORS.architectureGhost}
      // Kalınlık mimari görünümdekiyle AYNI yoldan (piksel, worldUnits YOK):
      // uzaklaşınca hayalet incelip kaybolursa borunun hangi duvarın üstünde
      // olduğuna bakılacak bağlam da kaybolur.
      lineWidth={getWallLineWidthPx(wall.thickness, zoom)}
      alphaToCoverage
      frustumCulled={false}
      renderOrder={RENDER_ORDER.architectureGhost}
      depthWrite={false}
      raycast={() => null}
      toneMapped={false}
    />
  )
}

const GHOST_SYMBOL_ELEVATION_CM =
  ARCHITECTURE_GHOST_ELEVATION_CM + ARCHITECTURE_GHOST_SYMBOL_LIFT_CM

/**
 * Hayalet açıklık, mimari görünümle AYNI plan simgesinden çizilir
 * (core/openingSymbol.ts): kapı kanadından, pencere cam çizgilerinden tanınsın.
 * Zemin rengindeki dolgu hayalet duvar bandını DELER — açıklık bandın üstüne
 * çizilmiş bir kutu değil, gerçek boşluk gibi okunsun.
 */
export function GhostOpening({
  outline,
  type,
}: {
  outline: readonly PlanPoint[]
  type: OpeningType
}) {
  const symbol = getOpeningSymbol(outline, type)

  return (
    <>
      <mesh
        frustumCulled={false}
        renderOrder={RENDER_ORDER.architectureGhostOpening}
        raycast={() => null}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[toOpeningFillPositions(outline, ARCHITECTURE_GHOST_ELEVATION_CM), 3]}
          />
        </bufferGeometry>
        <meshBasicMaterial color={SCENE_COLORS.background} depthWrite={false} toneMapped={false} />
      </mesh>

      {symbol.panel && (
        <mesh
          frustumCulled={false}
          renderOrder={RENDER_ORDER.architectureGhostOpening}
          raycast={() => null}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[toOpeningFillPositions(symbol.panel, GHOST_SYMBOL_ELEVATION_CM), 3]}
            />
          </bufferGeometry>
          <meshBasicMaterial
            color={PLUMBING_COLORS.architectureGhost}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {symbol.strokes.map((stroke) => (
        <GhostLine
          key={stroke.name}
          points={stroke.points.map((corner) => planToThree(corner, GHOST_SYMBOL_ELEVATION_CM))}
          lineWidth={GHOST_OPENING_STROKE_WIDTHS[stroke.role]}
        />
      ))}
    </>
  )
}
