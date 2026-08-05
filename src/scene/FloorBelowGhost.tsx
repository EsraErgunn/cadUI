import { Line } from '@react-three/drei'
import { useMemo } from 'react'

import { FLOOR_BELOW_GHOST_ELEVATION_CM } from './architectureLayers'
import { ARCHITECTURE_COLORS } from './architectureTheme'
import { RENDER_ORDER } from './layers'
import { planToThree, type PlanPoint, type ThreePosition } from '../core/coords'
import { getFloorBelowId } from '../core/floors'
import type { Point, Wall } from '../core/model'
import { getOpeningOutline } from '../core/opening'
import { getWallCapsule } from '../core/wallShape'
import { useCadStore } from '../store/cadStore'

/** Açıklık duvardan ince: duvar kütlesi baskın kalsın, delik onun üstünde okunsun. */
const GHOST_OPENING_LINE_WIDTH = 1.2

function toGhostRing(corners: readonly PlanPoint[]): ThreePosition[] {
  // Halka elle kapatılıyor: drei <Line>'ın bu sürümünde `closed` propu yok.
  return [...corners, corners[0]].map((corner) =>
    planToThree(corner, FLOOR_BELOW_GHOST_ELEVATION_CM),
  )
}

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
        return outline ? [{ id: opening.id, ring: toGhostRing(outline) }] : []
      }),
    [ghostWalls, openings, points],
  )

  if (floorBelowId === undefined) return null

  return (
    <group name="floor-below-ghost">
      {ghostWalls.map((wall) => (
        <GhostWall key={wall.id} wall={wall} points={points} />
      ))}

      {/* Duvarın ÜSTÜNE çiziliyor (sıra önemli): delik duvarın altında kalmasın. */}
      {ghostOpenings.map((opening) => (
        <Line
          key={opening.id}
          points={opening.ring}
          color={ARCHITECTURE_COLORS.openingFill}
          lineWidth={GHOST_OPENING_LINE_WIDTH}
          renderOrder={RENDER_ORDER.floorBelowGhost}
          depthWrite={false}
          raycast={() => null}
          toneMapped={false}
        />
      ))}
    </group>
  )
}
