import { Line } from '@react-three/drei'
import { useMemo } from 'react'

import { SymbolInstance } from './SymbolInstance'
import {
  ARCHITECTURE_GHOST_ELEVATION_CM,
  ARCHITECTURE_GHOST_SYMBOL_LIFT_CM,
} from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { planToThree, type PlanPoint, type ThreePosition } from '../../core/coords'
import type { OpeningType, Point, Wall as WallData } from '../../core/model'
import { getOpeningOutline } from '../../core/opening'
import { getOpeningSymbol, type OpeningSymbolRole } from '../../core/openingSymbol'
import { getWallCapsule } from '../../core/wallShape'
import { RENDER_ORDER } from '../../scene/layers'
import { toOpeningFillPositions } from '../../scene/openingFill'
import { SCENE_COLORS } from '../../scene/sceneTheme'
import { useCadStore } from '../../store/cadStore'

/*
 * Karşı katmanın soluk izi — iki yönlü. İkisi de SceneRoot'ta mount edilir (çizen
 * katmanın içinde değil: hayalet katmanın parçası değil GÖRÜNÜMÜN bağlamıdır) ve
 * ikisi de aktif katı KENDİ okur, mount eden kat bilgisi geçirmez.
 * Yöntemleri bilerek farklı: mimari tek soluk renge boyanır ve tesisatın altında
 * durur; tesisat rengini korur, saydamlaşır ve mimarinin üstünde durur.
 * Gerekçeler: .claude/knowledge/ghost-layers.md
 */

/**
 * Mimari görünümün 1.8 / 1.2 / 1 oranı, hayalette bir tık ince: açıklık bağlam,
 * konu değil — duvar kütlesi baskın kalsın, delik onun üstünde okunsun.
 */
const GHOST_STROKE_WIDTHS: Record<OpeningSymbolRole, number> = {
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

const GHOST_SYMBOL_ELEVATION_CM =
  ARCHITECTURE_GHOST_ELEVATION_CM + ARCHITECTURE_GHOST_SYMBOL_LIFT_CM

/**
 * Hayalet açıklık, mimari görünümle AYNI plan simgesinden çizilir
 * (core/openingSymbol.ts): kapı kanadından, pencere cam çizgilerinden tanınsın.
 * Zemin rengindeki dolgu hayalet duvar bandını DELER — açıklık bandın üstüne
 * çizilmiş bir kutu değil, gerçek boşluk gibi okunsun.
 */
function GhostOpening({ outline, type }: { outline: readonly PlanPoint[]; type: OpeningType }) {
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
          lineWidth={GHOST_STROKE_WIDTHS[stroke.role]}
        />
      ))}
    </>
  )
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

        return [{ id: opening.id, outline, type: opening.type }]
      }),
    [floorWalls, openings, points],
  )

  return (
    <group name="architecture-ghost">
      {floorWalls.map((wall) => (
        <GhostWall key={wall.id} wall={wall} points={points} />
      ))}

      {openingGhosts.map((opening) => (
        <GhostOpening key={opening.id} outline={opening.outline} type={opening.type} />
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
