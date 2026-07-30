import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import { MathUtils } from 'three'

import { RENDER_ORDER, WALL_ELEVATION_CM, WALL_OUTLINE_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { planToThree } from '../core/coords'
import type { Point, Wall as WallData } from '../core/model'
import { getWallOutlines, getWallRenderGeometry } from '../core/wallShape'
import { useCadStore } from '../store/cadStore'

const OUTLINE_WIDTH = 1.4

type WallProps = {
  wall: WallData
  points: readonly Point[]
  walls: readonly WallData[]
}

export function Wall({ wall, points, walls }: WallProps) {
  // Köşe birleşimi için uçları uzatılmış dikdörtgen; hesap core/wall.ts'te.
  const geometry = getWallRenderGeometry(wall, points, walls)
  if (!geometry) return null

  return (
    // Düzlem varsayılan olarak dik durur; rotation.x = -90° onu plan düzlemine
    // yatırır. Bu döndürmeden sonra yerel eksenler plan eksenleriyle örtüştüğü
    // için duvar açısı doğrudan z bileşenine yazılabiliyor.
    <mesh
      position={planToThree(geometry.center, WALL_ELEVATION_CM)}
      rotation={[-Math.PI / 2, 0, MathUtils.degToRad(geometry.angleDeg)]}
      renderOrder={RENDER_ORDER.wall}
      // Sahne state'in türevi: mesh'te veri değil yalnız id taşınır.
      userData={{ id: wall.id }}
    >
      <planeGeometry args={[geometry.lengthCm, wall.thickness]} />
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
