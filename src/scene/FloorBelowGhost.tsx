import { Line } from '@react-three/drei'
import { useMemo } from 'react'

import { FLOOR_BELOW_GHOST_ELEVATION_CM, OPENING_SYMBOL_LIFT_CM } from './architectureLayers'
import { ARCHITECTURE_COLORS } from './architectureTheme'
import { RENDER_ORDER } from './layers'
import { toOpeningFillPositions } from './openingFill'
import { SCENE_COLORS } from './sceneTheme'
import { planToThree, type PlanPoint } from '../core/coords'
import { getFloorBelowId } from '../core/floors'
import type { OpeningType, Point, Wall } from '../core/model'
import { getOpeningOutline } from '../core/opening'
import { getOpeningSymbol, type OpeningSymbolRole } from '../core/openingSymbol'
import { getWallCapsule } from '../core/wallShape'
import { useCadStore } from '../store/cadStore'

/**
 * Aktif katın açıklığından da tesisat hayaletininkinden de ince: bu katman en
 * geride, salt hizalama referansı. Oranlar mimari görünümdekiyle aynı.
 */
const GHOST_STROKE_WIDTHS: Record<OpeningSymbolRole, number> = {
  jamb: 1.2,
  face: 0.8,
  detail: 0.7,
}

const GHOST_SYMBOL_ELEVATION_CM = FLOOR_BELOW_GHOST_ELEVATION_CM + OPENING_SYMBOL_LIFT_CM

function GhostWall({ wall, points }: { wall: Wall; points: readonly Point[] }) {
  const capsule = getWallCapsule(wall, points)
  if (!capsule) return null

  return (
    <Line
      points={[
        planToThree(capsule.p1, FLOOR_BELOW_GHOST_ELEVATION_CM),
        planToThree(capsule.p2, FLOOR_BELOW_GHOST_ELEVATION_CM),
      ]}
      color={ARCHITECTURE_COLORS.floorBelowGhost}
      // lineWidth kapsülün TAM genişliği; worldUnits ile birimi cm.
      worldUnits
      lineWidth={wall.thickness}
      alphaToCoverage
      frustumCulled={false}
      renderOrder={RENDER_ORDER.floorBelowGhost}
      depthWrite={false}
      // Alt kat SEÇİLEMEZ (KK-13): salt hizalama referansı.
      raycast={() => null}
      toneMapped={false}
    />
  )
}

/**
 * Alt kat açıklığı da mimari görünümle AYNI plan simgesinden (core/openingSymbol.ts)
 * çizilir, yalnız solgun ve ince. Hizalama referansı olduğu için tip ayrımı gerekli:
 * üst kat kapısı alttakiyle çakışmasın diye kapı kanadından pencereden ayrılmalı.
 * Dolgu duvar bandını deler — açıklık bandın üstündeki bir kutu değil boşluktur.
 */
function GhostOpening({ outline, type }: { outline: readonly PlanPoint[]; type: OpeningType }) {
  const symbol = getOpeningSymbol(outline, type)

  return (
    <>
      <mesh
        frustumCulled={false}
        renderOrder={RENDER_ORDER.floorBelowGhostOpening}
        // Alt kat SEÇİLEMEZ (KK-13): salt hizalama referansı.
        raycast={() => null}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[toOpeningFillPositions(outline, FLOOR_BELOW_GHOST_ELEVATION_CM), 3]}
          />
        </bufferGeometry>
        <meshBasicMaterial color={SCENE_COLORS.background} depthWrite={false} toneMapped={false} />
      </mesh>

      {symbol.panel && (
        <mesh
          frustumCulled={false}
          renderOrder={RENDER_ORDER.floorBelowGhostOpening}
          raycast={() => null}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[toOpeningFillPositions(symbol.panel, GHOST_SYMBOL_ELEVATION_CM), 3]}
            />
          </bufferGeometry>
          <meshBasicMaterial
            color={ARCHITECTURE_COLORS.floorBelowGhost}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {symbol.strokes.map((stroke) => (
        <Line
          key={stroke.name}
          points={stroke.points.map((corner) => planToThree(corner, GHOST_SYMBOL_ELEVATION_CM))}
          color={ARCHITECTURE_COLORS.floorBelowGhost}
          lineWidth={GHOST_STROKE_WIDTHS[stroke.role]}
          frustumCulled={false}
          renderOrder={RENDER_ORDER.floorBelowGhostOpening}
          depthWrite={false}
          raycast={() => null}
          toneMapped={false}
        />
      ))}
    </>
  )
}

/**
 * Aktif katın altındaki katın soluk izi (KK-13). Hizalama içindir: üst kat duvarı
 * alttakiyle aynı eksene oturtulabilsin.
 *
 * ghost-layers.md deseni: hayalet çizen katmanın parçası değil GÖRÜNÜMÜN bağlamı,
 * bu yüzden SceneRoot'ta mount edilir ve aktif katı KENDİ okur. Ondan farkı, karşı
 * KATMANI değil karşı KATI göstermesi — bu yüzden ArchitectureGhost'tan türetilmedi,
 * o aktif katı çiziyor.
 */
export function FloorBelowGhost() {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const openings = useCadStore((state) => state.openings)

  const floorBelowId = getFloorBelowId(floors, activeFloorId)

  const ghostWalls = useMemo(
    () => (floorBelowId === undefined ? [] : walls.filter((wall) => wall.floorId === floorBelowId)),
    [floorBelowId, walls],
  )

  // Açıklık floorId taşımaz (K9): kat, bağlı olduğu duvardan türetilir.
  const ghostOpenings = useMemo(
    () =>
      openings.flatMap((opening) => {
        const wall = ghostWalls.find((candidate) => candidate.id === opening.wallId)
        if (!wall) return []

        const outline = getOpeningOutline(wall, points, opening)
        return outline ? [{ id: opening.id, outline, type: opening.type }] : []
      }),
    [ghostWalls, openings, points],
  )

  if (floorBelowId === undefined) return null

  return (
    <group name="floor-below-ghost">
      {ghostWalls.map((wall) => (
        <GhostWall key={wall.id} wall={wall} points={points} />
      ))}

      {ghostOpenings.map((opening) => (
        <GhostOpening key={opening.id} outline={opening.outline} type={opening.type} />
      ))}
    </group>
  )
}
