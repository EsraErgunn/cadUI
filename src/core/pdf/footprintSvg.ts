import type { BuildingFootprint } from './footprint'
import { svgLine, svgPolygon, svgText, SVG_COLORS } from './svgPrimitives'
import type { PlanPoint } from '../coords'

/** Kuşbakışı konturun parsel çerçevesinden içeri payı. */
const FOOTPRINT_INSET_RATIO = 0.12
/** Servis kutusu işaretinin yarı kenarı, etiket puntosuna oranla. */
const SERVICE_BOX_SIZE_RATIO = 0.35
const SERVICE_BOX_LABEL = 'Servis Kutusu'
/** Kontur çizgisi; kesitin duvar kalınlığıyla aynı ince kalem. */
const OUTLINE_WIDTH_CM = 1.5

export type ParcelBox = { leftCm: number; rightCm: number; bottomCm: number; topCm: number }

/**
 * Kuşbakışı konturu ve servis kutusunu parsel çerçevesinin İÇİNE yerleştirir;
 * binanın orta noktasını döndürür (kapı numarası oraya yazılıyor).
 *
 * Kontur çerçeveye SIĞDIRILIR, oranı korunur. Kesitle aynı gerekçe: bu sayfa
 * ölçekli değil, okunaklı olması yeterli. Servis kutusunun binaya göre HANGİ
 * kenarda durduğu bilgisi taşınıyor — vaziyet planının bu sayfadaki asıl işi o.
 */
export function drawFootprint(
  body: string[],
  footprint: BuildingFootprint,
  parcel: ParcelBox,
  text: { fontFamily: string; labelSizeCm: number; levelSizeCm: number },
): PlanPoint | undefined {
  const parcelWidthCm = parcel.rightCm - parcel.leftCm
  const parcelHeightCm = parcel.topCm - parcel.bottomCm
  const insetCm = Math.min(parcelWidthCm, parcelHeightCm) * FOOTPRINT_INSET_RATIO

  const innerWidthCm = parcelWidthCm - insetCm * 2
  const innerHeightCm = parcelHeightCm - insetCm * 2
  const spanXCm = footprint.bounds.maxX - footprint.bounds.minX
  const spanYCm = footprint.bounds.maxY - footprint.bounds.minY
  if (innerWidthCm <= 0 || innerHeightCm <= 0) return undefined

  // Tek noktaya inmiş bir kontur (tek duvar yok, yalnız servis kutusu var)
  // sıfıra bölerdi; o durumda ölçek anlamsız, çerçevenin ortasına konur.
  const scale =
    spanXCm > 0 || spanYCm > 0
      ? Math.min(
          spanXCm > 0 ? innerWidthCm / spanXCm : Number.POSITIVE_INFINITY,
          spanYCm > 0 ? innerHeightCm / spanYCm : Number.POSITIVE_INFINITY,
        )
      : 0

  const originXCm =
    parcel.leftCm + insetCm + (innerWidthCm - spanXCm * scale) / 2 - footprint.bounds.minX * scale
  const originYCm =
    parcel.bottomCm + insetCm + (innerHeightCm - spanYCm * scale) / 2 - footprint.bounds.minY * scale

  const place = (point: PlanPoint): PlanPoint => ({
    x: originXCm + point.x * scale,
    y: originYCm + point.y * scale,
  })

  for (const [from, to] of footprint.segments) {
    body.push(svgLine(place(from), place(to), OUTLINE_WIDTH_CM, SVG_COLORS.ink))
  }

  if (footprint.serviceBox) {
    const at = place(footprint.serviceBox)
    const halfCm = text.labelSizeCm * SERVICE_BOX_SIZE_RATIO

    body.push(
      svgPolygon(
        [
          { x: at.x - halfCm, y: at.y - halfCm },
          { x: at.x + halfCm, y: at.y - halfCm },
          { x: at.x + halfCm, y: at.y + halfCm },
          { x: at.x - halfCm, y: at.y + halfCm },
        ],
        SVG_COLORS.serviceBox,
      ),
      svgText(
        { x: at.x, y: at.y - halfCm - text.levelSizeCm * 1.2 },
        SERVICE_BOX_LABEL,
        { fontFamily: text.fontFamily, sizeCm: text.levelSizeCm, color: SVG_COLORS.serviceBox },
      ),
    )
  }

  const centerXCm = originXCm + (footprint.bounds.minX + footprint.bounds.maxX) / 2 * scale
  const centerYCm = originYCm + (footprint.bounds.minY + footprint.bounds.maxY) / 2 * scale
  return { x: centerXCm, y: centerYCm }
}
