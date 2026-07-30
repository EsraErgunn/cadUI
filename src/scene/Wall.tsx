import { MathUtils } from 'three'

import { RENDER_ORDER, WALL_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { planToThree } from '../core/coords'
import type { Point, Wall as WallData } from '../core/model'
import {
  getSegmentAngleDeg,
  getSegmentLength,
  getSegmentMidpoint,
  getWallEnds,
  MIN_WALL_LENGTH_CM,
} from '../core/wall'
import { useCadStore } from '../store/cadStore'

type WallProps = {
  wall: WallData
  points: readonly Point[]
}

export function Wall({ wall, points }: WallProps) {
  const ends = getWallEnds(wall, points)
  if (!ends) return null

  const lengthCm = getSegmentLength(ends.p1, ends.p2)
  if (lengthCm < MIN_WALL_LENGTH_CM) return null

  return (
    // Düzlem varsayılan olarak dik durur; rotation.x = -90° onu plan düzlemine
    // yatırır. Bu döndürmeden sonra yerel eksenler plan eksenleriyle örtüştüğü
    // için duvar açısı doğrudan z bileşenine yazılabiliyor.
    <mesh
      position={planToThree(getSegmentMidpoint(ends.p1, ends.p2), WALL_ELEVATION_CM)}
      rotation={[-Math.PI / 2, 0, MathUtils.degToRad(getSegmentAngleDeg(ends.p1, ends.p2))]}
      renderOrder={RENDER_ORDER.wall}
      // Sahne state'in türevi: mesh'te veri değil yalnız id taşınır.
      userData={{ id: wall.id }}
    >
      <planeGeometry args={[lengthCm, wall.thickness]} />
      <meshBasicMaterial color={SCENE_COLORS.wall} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** Aktif kattaki duvarlar. Store'daki dizileri olduğu gibi okur — türetilmiş dizi
 *  seçici döndürseydi her store değişiminde yeni referans çıkar ve gereksiz render olurdu. */
export function Walls() {
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  return (
    <group name="walls">
      {walls
        .filter((wall) => wall.floorId === activeFloorId)
        .map((wall) => (
          <Wall key={wall.id} wall={wall} points={points} />
        ))}
    </group>
  )
}
