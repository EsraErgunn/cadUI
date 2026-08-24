import { useEffect } from 'react'
import { DoubleSide, FrontSide, type BufferGeometry } from 'three'

type SolidSurfaceProps = {
  /** Birleştirilmiş geometri; boş öbekte `null` gelir ve hiç mesh açılmaz. */
  geometry: BufferGeometry | null
  colorHex: string
  /** 1'in altında saydam geçişe düşer (cam gibi). */
  opacity?: number
  /** Tek yüzeyli döşemede şart: alttan bakınca kaybolmasın. */
  isDoubleSided?: boolean
}

/**
 * Birleştirilmiş bir geometriyi tek malzemeyle çizer.
 *
 * Geometri React'in DIŞINDA (`solidGeometry.ts`) kuruluyor, bu yüzden ömrünü
 * de burası kapatıyor: R3F yalnız kendi kurduğu nesneleri güvenle imha eder,
 * dışarıdan verilen tampon sökülünce GPU'da kalırdı — katı model her kapsam
 * değişiminde baştan kuruluyor, sızıntı birkaç geçişte fark edilir olur.
 */
export function SolidSurface({
  geometry,
  colorHex,
  opacity = 1,
  isDoubleSided = false,
}: SolidSurfaceProps) {
  useEffect(() => () => geometry?.dispose(), [geometry])

  if (!geometry) return null

  return (
    <mesh geometry={geometry} castShadow={false} receiveShadow={false}>
      <meshStandardMaterial
        color={colorHex}
        transparent={opacity < 1}
        opacity={opacity}
        side={isDoubleSided ? DoubleSide : FrontSide}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  )
}
