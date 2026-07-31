import { Line } from '@react-three/drei'
import { useMemo } from 'react'

import { RENDER_ORDER, WALL_ELEVATION_CM, WALL_OUTLINE_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { planToThree, type PlanPoint } from '../core/coords'
import type { Point, Wall as WallData } from '../core/model'
import { getWallOutlines, getWallPolygon } from '../core/wallShape'
import { useCadStore } from '../store/cadStore'

const OUTLINE_WIDTH = 1.4

/** Dört köşeden iki üçgen: (0,1,2) ve (0,2,3). */
function toFillPositions(polygon: readonly PlanPoint[]): Float32Array {
  const order = [0, 1, 2, 0, 2, 3]
  const positions = new Float32Array(order.length * 3)

  order.forEach((cornerIndex, slot) => {
    positions.set(planToThree(polygon[cornerIndex], WALL_ELEVATION_CM), slot * 3)
  })

  return positions
}

type WallProps = {
  wall: WallData
  points: readonly Point[]
  walls: readonly WallData[]
}

export function Wall({ wall, points, walls }: WallProps) {
  // Gönyeli köşelerden sonra duvar artık döndürülmüş bir dikdörtgen değil;
  // dört köşesi ayrı hesaplanan bir dörtgen. Hesap core/wallShape.ts'te.
  const polygon = getWallPolygon(wall, points, walls)
  if (!polygon) return null

  return (
    <mesh
      frustumCulled={false}
      renderOrder={RENDER_ORDER.wall}
      // Sahne state'in türevi: mesh'te veri değil yalnız id taşınır.
      userData={{ id: wall.id }}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[toFillPositions(polygon), 3]} />
      </bufferGeometry>
      <meshBasicMaterial color={SCENE_COLORS.wallFill} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

type WallOutlinesProps = {
  points: readonly Point[]
  walls: readonly WallData[]
}

/** Duvarların birleşiminin dış konturu — tek tek çerçeve çizilseydi köşelerde iç çizgiler görünürdü. */
function WallOutlines({ points, walls }: WallOutlinesProps) {
  // Union her karede değil, yalnız duvar/nokta değiştiğinde hesaplanır.
  const rings = useMemo(
    () =>
      getWallOutlines(walls, points).map((ring) =>
        ring.map((point) => planToThree(point, WALL_OUTLINE_ELEVATION_CM)),
      ),
    [walls, points],
  )

  return (
    <>
      {rings.map((ring, index) => (
        // Halkalar birleşim sonucundan türüyor, kalıcı bir id'leri yok.
        <Line
          key={index}
          points={ring}
          color={SCENE_COLORS.wallOutline}
          lineWidth={OUTLINE_WIDTH}
          renderOrder={RENDER_ORDER.wall}
          depthWrite={false}
          toneMapped={false}
        />
      ))}
    </>
  )
}

/** Aktif kattaki duvarlar. Store'daki dizileri olduğu gibi okur — türetilmiş dizi
 *  seçici döndürseydi her store değişiminde yeni referans çıkar ve gereksiz render olurdu. */
export function Walls() {
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  const floorWalls = walls.filter((wall) => wall.floorId === activeFloorId)

  return (
    <group name="walls">
      {floorWalls.map((wall) => (
        <Wall key={wall.id} wall={wall} points={points} walls={floorWalls} />
      ))}
      <WallOutlines points={points} walls={floorWalls} />
    </group>
  )
}
