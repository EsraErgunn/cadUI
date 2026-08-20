import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'

import { ISOMETRIC_PIPE_METALNESS, ISOMETRIC_PIPE_ROUGHNESS } from './isometricTheme'
import type { ThreePosition } from '../../core/coords'

/** Silindir gövdesi varsayılan olarak +Y boyunca uzanır; yön bundan türetilir. */
const CYLINDER_AXIS = new Vector3(0, 1, 0)

const RADIAL_SEGMENTS = 12
const JOINT_SEGMENTS = 10

/**
 * Sıfır uzunluklu segment atlanır: `setFromUnitVectors` normalize edilemeyen
 * yönle NaN quaternion üretir ve mesh sahneden kaybolur. Saf dikey bağlantı
 * (K102) sıfır PLAN uzunluğuna sahip ama 3B uzunluğu vardır — o çizilir.
 */
const MIN_SEGMENT_LENGTH_CM = 1e-6

type Segment = {
  position: ThreePosition
  quaternion: [number, number, number, number]
  lengthCm: number
}

function buildSegments(positions: readonly ThreePosition[]): Segment[] {
  const segments: Segment[] = []
  const from = new Vector3()
  const to = new Vector3()
  const direction = new Vector3()
  const quaternion = new Quaternion()

  for (let index = 1; index < positions.length; index += 1) {
    from.set(...positions[index - 1])
    to.set(...positions[index])
    direction.subVectors(to, from)

    const lengthCm = direction.length()
    if (lengthCm < MIN_SEGMENT_LENGTH_CM) continue

    direction.divideScalar(lengthCm)
    quaternion.setFromUnitVectors(CYLINDER_AXIS, direction)

    segments.push({
      position: [(from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2],
      quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
      lengthCm,
    })
  }

  return segments
}

type IsometricTubeProps = {
  positions: readonly ThreePosition[]
  radiusCm: number
  colorHex: string
  opacity: number
  onPointerDown?: () => void
}

/**
 * Kırıklı bir eksen boyunca 3B boru gövdesi: segment başına silindir, ara
 * köşelerde küre. Küreler dirsekleri kapatır — yalnız silindirlerle her
 * dönüşte gövdede kama biçimli bir boşluk kalıyordu.
 *
 * drei `<Line>` KULLANILMAZ: `worldUnits` shader'ı perspektif kamera varsayar
 * (knowledge/capsule-walls.md) ve düz çizgi gerçek derinlik/örtüşme vermez —
 * izometrikte üst katın alt katı örtmesi tam da bu geometriye bağlı.
 */
export function IsometricTube({
  positions,
  radiusCm,
  colorHex,
  opacity,
  onPointerDown,
}: IsometricTubeProps) {
  const segments = useMemo(() => buildSegments(positions), [positions])

  // Ara köşeler: uçlarda küre gerekmez, orada gövde zaten bitiyor.
  const joints = positions.slice(1, -1)
  const isTransparent = opacity < 1

  return (
    <group onPointerDown={onPointerDown}>
      {segments.map((segment, index) => (
        // Segment dizisi köşe sırasından türetiliyor ve yeniden sıralanmıyor;
        // domain nesnesi değil, indeks anahtar olarak güvenli.
        <mesh key={index} position={segment.position} quaternion={segment.quaternion}>
          <cylinderGeometry args={[radiusCm, radiusCm, segment.lengthCm, RADIAL_SEGMENTS]} />
          <meshStandardMaterial
            color={colorHex}
            metalness={ISOMETRIC_PIPE_METALNESS}
            roughness={ISOMETRIC_PIPE_ROUGHNESS}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
      ))}

      {joints.map((position, index) => (
        <mesh key={`joint-${index}`} position={position}>
          <sphereGeometry args={[radiusCm, JOINT_SEGMENTS, JOINT_SEGMENTS]} />
          <meshStandardMaterial
            color={colorHex}
            metalness={ISOMETRIC_PIPE_METALNESS}
            roughness={ISOMETRIC_PIPE_ROUGHNESS}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  )
}
