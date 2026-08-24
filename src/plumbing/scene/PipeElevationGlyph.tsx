import { ElevationNodeRing } from './ElevationNodeRing'
import { LengthText } from './LengthLabels'
import { PREVIEW_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { planToThree, type PlanPoint } from '../../core/coords'
import { formatLengthMeters, formatSignedMeters } from '../core/lengthFormat'

/** Normal ölçü etiketinden (12px) BÜYÜK — bu tek satır Z eksenindeki tek bilgi
 *  kaynağı, gövde çizgisi yok, küçük kalınca borunun/köşe işaretinin üstünde
 *  kayboluyordu (kullanıcı bulgusu, 2026-08: "pek okunmuyor"). */
const ELEVATION_LABEL_SIZE_PX = 15
/** Beyaz anahat: altındaki boru çizgisinden/köşe işaretinden AYRIŞTIRIR — tuval
 *  her temada beyaz olduğu için ek bir koyu/açık tema karşılığı gerekmiyor. */
const ELEVATION_LABEL_OUTLINE_PX = 0.9
const ELEVATION_LABEL_OUTLINE_COLOR = '#ffffff'

/**
 * Plan boyu SIFIR bir boru segmenti (saf dikey bağlantı, K102) ortografik plan
 * görünümünden TEK NOKTA gibi görünür — çizgi yok, işaret yok. Bu glif orada
 * okunabilir bir kot etiketi bırakır ve düğümü bir halkayla İÇİNE ALIR
 * (`ElevationNodeRing`, kullanıcı isteği 2026-08): yazı tek başına düğümün TAM
 * YERİNİ göstermiyordu, halka onu gözle bulunur kılıyor.
 *
 * Yazı İKİ sayı taşır (K133): ne kadar yükselindiği + VARILAN kot,
 * `▲0,75 m (+2,00)`. Yalnız fark yazılınca kolonun hangi kota çıktığı ancak
 * baştaki kot bilinerek hesaplanabiliyordu; yalnız mutlak kot yazılınca da
 * K129'un koruduğu "ne kadar yükseldi" bilgisi kayboluyordu.
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
  const riseLabel = formatLengthMeters(Math.abs(toHeightCm - fromHeightCm))
  const label = `${arrow}${riseLabel} (${formatSignedMeters(toHeightCm)})`

  return (
    <>
      <ElevationNodeRing position={position} zoom={zoom} />
      <group position={planToThree(position, PREVIEW_ELEVATION_CM)}>
        <LengthText
          label={label}
          zoom={zoom}
          fontSizePx={ELEVATION_LABEL_SIZE_PX}
          color={PLUMBING_COLORS.pipeElevationLabel}
          outlineWidthPx={ELEVATION_LABEL_OUTLINE_PX}
          outlineColor={ELEVATION_LABEL_OUTLINE_COLOR}
        />
      </group>
    </>
  )
}
