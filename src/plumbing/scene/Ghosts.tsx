import { Line } from '@react-three/drei'
import { useMemo } from 'react'

import { SymbolInstance } from './SymbolInstance'
import { ARCHITECTURE_GHOST_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { planToThree, type PlanPoint, type ThreePosition } from '../../core/coords'
import type { Point, Wall as WallData } from '../../core/model'
import { getOpeningOutline, getOpeningSymbolPoints } from '../../core/opening'
import { getWallCapsule } from '../../core/wallShape'
import { RENDER_ORDER } from '../../scene/layers'
import { useCadStore } from '../../store/cadStore'

/*
 * Karşı katmanın soluk izi — iki yönlü. İkisi de SceneRoot'ta mount edilir (çizen
 * katmanın içinde değil: hayalet katmanın parçası değil GÖRÜNÜMÜN bağlamıdır) ve
 * ikisi de aktif katı KENDİ okur, mount eden kat bilgisi geçirmez.
 * Yöntemleri bilerek farklı: mimari tek soluk renge boyanır ve tesisatın altında
 * durur; tesisat rengini korur, saydamlaşır ve mimarinin üstünde durur.
 * Gerekçeler: .claude/knowledge/ghost-layers.md
 */

/** Açıklık duvardan ince: duvar kütlesi baskın kalsın, delik onun üstünde okunsun. */
const GHOST_OPENING_LINE_WIDTH = 1.4

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
      renderOrder={RENDER_ORDER.architectureGhost}
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
function GhostWall({ wall, points }: { wall: WallData; points: readonly Point[] }) {
  const capsule = getWallCapsule(wall, points)
  if (!capsule) return null

  return (
    <Line
      points={[
        planToThree(capsule.p1, ARCHITECTURE_GHOST_ELEVATION_CM),
        planToThree(capsule.p2, ARCHITECTURE_GHOST_ELEVATION_CM),
      ]}
      color={PLUMBING_COLORS.architectureGhost}
      // lineWidth kapsülün TAM genişliği; worldUnits ile birimi cm.
      worldUnits
      lineWidth={wall.thickness}
      alphaToCoverage
      frustumCulled={false}
      renderOrder={RENDER_ORDER.architectureGhost}
      depthWrite={false}
      raycast={() => null}
      toneMapped={false}
    />
  )
}

function toGhostPoints(corners: readonly PlanPoint[]): ThreePosition[] {
  return corners.map((corner) => planToThree(corner, ARCHITECTURE_GHOST_ELEVATION_CM))
}

function toGhostRing(corners: readonly PlanPoint[]): ThreePosition[] {
  // Halka elle kapatılıyor: drei <Line>'ın bu sürümünde `closed` propu yok.
  return toGhostPoints([...corners, corners[0]])
}

/** Tesisat görünümündeki mimari: aktif kattaki duvarlar + kapı/pencere delikleri. */
export function ArchitectureGhost() {
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const openings = useCadStore((state) => state.openings)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  const floorWalls = useMemo(
    () => walls.filter((wall) => wall.floorId === activeFloorId),
    [activeFloorId, walls],
  )

  // Açıklık floorId taşımaz (K9): kat, bağlı olduğu duvardan türetilir.
  const openingGhosts = useMemo(
    () =>
      openings.flatMap((opening) => {
        const wall = floorWalls.find((candidate) => candidate.id === opening.wallId)
        if (!wall) return []

        const outline = getOpeningOutline(wall, points, opening)
        if (!outline) return []

        // Kanat/kayıt simgesi mimari görünümle AYNI fonksiyondan gelir
        // (core/opening.ts): hayalet plandan sapmasın, kapı pencereden ayırt edilsin.
        return [
          {
            id: opening.id,
            ring: toGhostRing(outline),
            symbol: toGhostPoints(getOpeningSymbolPoints(outline, opening.type)),
          },
        ]
      }),
    [floorWalls, openings, points],
  )

  return (
    <group name="architecture-ghost">
      {floorWalls.map((wall) => (
        <GhostWall key={wall.id} wall={wall} points={points} />
      ))}

      {/* Duvarın ÜSTÜNE çiziliyor (sıra önemli): delik duvar konturunun altında kalmasın. */}
      {openingGhosts.map((opening) => (
        <group key={opening.id}>
          <GhostLine points={opening.ring} lineWidth={GHOST_OPENING_LINE_WIDTH} />
          {opening.symbol.length > 0 && (
            <GhostLine points={opening.symbol} lineWidth={GHOST_OPENING_LINE_WIDTH} />
          )}
        </group>
      ))}
    </group>
  )
}

/** Mimari görünümdeki tesisat. Renkler korunur, yalnız saydamlaşır (symbolLoader). */
export function InstallationGhost() {
  const elements = useCadStore((state) => state.installationElements)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  return (
    <group name="installation-ghost">
      {elements
        .filter((element) => element.floorId === activeFloorId)
        .map((element) => (
          <SymbolInstance key={element.id} element={element} tone="ghost" />
        ))}
    </group>
  )
}
