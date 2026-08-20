import { useMemo } from 'react'

import { IsometricTube } from './IsometricTube'
import { ISOMETRIC_COLORS } from './isometricTheme'
import type { IsometricFloorLinkGeometry } from '../core/isometricModel'

/**
 * Kat geçişi bağlantısının gövde yarıçapı. Bağladığı boruların çapından
 * TÜRETİLMİYOR: `FloorPipeLink` hidrolik bir birleşim değil, iki ucu eşleştiren
 * bir işaret (core/model.ts). Sabit ve ince bir gövde onu gerçek borudan ayırır.
 */
const FLOOR_LINK_RADIUS_CM = 1.5

type IsometricFloorLinkProps = {
  geometry: IsometricFloorLinkGeometry
  opacity: number
}

/**
 * Alt kattaki boru ucunu üsttekine bağlayan düşey parça. "İzometrik tüm binayı
 * tek parça gösterir" ürün kuralı görsel olarak BURADA gerçekleşiyor: bu parça
 * olmasa katlar havada asılı ayrı çizimler gibi durur.
 *
 * Katları aralıklandırma kaydırıcısı açılınca kendiliğinden uzar — iki ucu da
 * hat geometrisinden okunuyor, aralık ikinci kez uygulanmıyor.
 */
export function IsometricFloorLink({ geometry, opacity }: IsometricFloorLinkProps) {
  const positions = useMemo(() => [geometry.from, geometry.to], [geometry.from, geometry.to])

  return (
    <IsometricTube
      positions={positions}
      radiusCm={FLOOR_LINK_RADIUS_CM}
      colorHex={ISOMETRIC_COLORS.floorLink}
      opacity={opacity}
    />
  )
}
