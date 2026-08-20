import { Billboard } from '@react-three/drei'
import { useMemo } from 'react'

import type { ThreePosition } from '../../core/coords'
import type { InstallationElement } from '../../plumbing/core/installationModel'
import { getGhostMaterial, getLoadedSymbol } from '../../plumbing/scene/symbolLoader'

/**
 * Sembol SVG'si plan düzleminde (XZ) yatık üretiliyor; billboard'ın çalışması
 * için önce XY düzlemine DİKİLİYOR. X ekseni etrafında +90°: (x, 0, z) →
 * (x, −z, 0), yani planda "yukarı" olan yön (−z) ekranda yukarı (+y) olur.
 */
const STAND_UP_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0]

type IsometricElementProps = {
  element: InstallationElement
  position: ThreePosition
  isDimmed: boolean
}

/**
 * Tesisat elemanının izometrikteki karşılığı: sembol KAMERAYA DÖNÜK durur,
 * izdüşüme girmez. Referans çıktıda da (izometrik_ornek.png) semboller dik ve
 * okunur; eğilseydi vana/sayaç ayırt edilemezdi.
 *
 * Elemanın plandaki `angleDeg` dönüşü BİLEREK uygulanmıyor: billboard zaten
 * sembolü kameraya çeviriyor, üstüne plan açısı eklenirse sembol ekranda
 * eğik durur ve okunurluk kaybolur.
 */
export function IsometricElement({ element, position, isDimmed }: IsometricElementProps) {
  const loaded = useMemo(() => getLoadedSymbol(element.type), [element.type])

  if (loaded.shapes.length === 0) return null

  return (
    <Billboard position={position}>
      <group rotation={STAND_UP_ROTATION} scale={element.scale}>
        {loaded.shapes.map(({ geometry, material }, index) => (
          // Bu dizi bir sembol tipinin SVG'sinden bir kez türetilip
          // önbellekleniyor, yeniden sıralanmıyor — indeks anahtar güvenli.
          <mesh
            key={index}
            geometry={geometry}
            // Soluklaştırma için PAYLAŞILAN material klonlanmaz: `symbolLoader`
            // zaten önbellekli bir hayalet varyantı veriyor. Örnek başına klon
            // üretilseydi her elemanda ayrı material ayrılırdı.
            material={isDimmed ? getGhostMaterial(material) : material}
          />
        ))}
      </group>
    </Billboard>
  )
}
