import { LengthText } from './LengthLabels'
import { PREVIEW_ELEVATION_CM } from './plumbingLayers'
import { planToThree, type PlanPoint } from '../../core/coords'
import { formatLengthMeters } from '../core/lengthFormat'

/**
 * Plan boyu SIFIR bir boru segmenti (saf dikey bağlantı, K102) ortografik plan
 * görünümünden TEK NOKTA gibi görünür — çizgi yok, işaret yok. Bu glif orada
 * okunabilir bir kot etiketi bırakır (`▲0,75 m` / `▼0,50 m`), eski
 * `RiserMarkers.tsx`'in küçültülmüş hâli: yön/taban glifi yok, yalnız metin.
 */
export function PipeElevationGlyph({
  position,
  fromHeightCm,
  toHeightCm,
  zoom,
}: {
  position: PlanPoint
  fromHeightCm: number
  toHeightCm: number
  zoom: number
}) {
  if (fromHeightCm === toHeightCm) return null

  const arrow = toHeightCm > fromHeightCm ? '▲' : '▼'
  const label = `${arrow}${formatLengthMeters(Math.abs(toHeightCm - fromHeightCm))}`

  return (
    <group position={planToThree(position, PREVIEW_ELEVATION_CM)}>
      <LengthText label={label} zoom={zoom} />
    </group>
  )
}
