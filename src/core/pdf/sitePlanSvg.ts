import { buildElevationSvg } from './elevationSvg'
import { getFloorLevels } from './floorLevels'
import type { BuildingFootprint } from './footprint'
import { drawFootprint } from './footprintSvg'
import { n, svgPolygon, svgText, SVG_COLORS } from './svgPrimitives'
import type { Floor } from '../model'

/** Kesit için varsayılan bina genişliği (cm); çağıran zemin katın genişliğini verebilir. */
export const DEFAULT_SITE_BUILDING_WIDTH_CM = 900

const ROOF_HEIGHT_RATIO = 0.22
/** Zemin çizgisinin binanın iki yanından taşma payı. */
const GROUND_OVERHANG_RATIO = 0.35

const THIN_WIDTH_CM = 1.5

const TITLE_SIZE_RATIO = 0.075
const LABEL_SIZE_RATIO = 0.038
const LEVEL_SIZE_RATIO = 0.032

/** Kesit ile parsel çerçevesi arasındaki boşluk ve parselin kesite oranı. */
const SECTION_GAP_RATIO = 0.18
const PARCEL_HEIGHT_RATIO = 0.75


export type SitePlanInput = {
  /** Kat listesi, dizideki sırasıyla (index 0 EN ALT kat). */
  floors: readonly Floor[]
  /** Kesitteki bina genişliği (cm). Temsilî; oran dışında anlam taşımaz. */
  buildingWidthCm?: number
  /** Parsel çerçevesinin altına yazılan sokak adı. Boşsa yazılmaz. */
  streetName: string
  /** Parselin içine yazılan kapı numarası. Boşsa yazılmaz. */
  doorNumber: string
  /** Kuşbakışı kat konturu ve servis kutusu; çizim yoksa `undefined`. */
  footprint: BuildingFootprint | undefined
  /** Yazı tipi ailesi; PDF'e gömülen fontun adıyla AYNI olmalı (planSvg ile aynı kural). */
  fontFamily: string
}

export type SitePlanSvg = {
  /** Tam SVG belgesi; birimi plan santimi, y çevrili (svgPrimitives sözleşmesi). */
  markup: string
  /** Çizimin en-boy oranı; sayfaya sığdırma bunu kullanır. */
  widthCm: number
  heightCm: number
}

/**
 * Vaziyet planı sayfası.
 *
 * İKİ PARÇA, iki farklı güven düzeyi:
 *  1. Kat yığını kesiti — GERÇEK veriden (`Floor.heightCm`, `isBasement`).
 *     Kotlar zeminden ölçülür; bodrumlar zemin çizgisinin altına iner.
 *  2. Parsel çerçevesi — SINIRI uydurma değil BOŞ: projede parsel/ada geometrisi
 *     yok, çizilen dikdörtgen elle tamamlanacak alandır. İÇİ ise gerçek:
 *     zemin katın kuşbakışı konturu ve servis kutusunun o kontura göre yeri.
 *
 * Birim PLAN SANTİMİ — `planSvg.ts` ile aynı uzay, aynı `svgPrimitives` yardımcıları.
 * Ama bu sayfa ÖLÇEKLİ DEĞİL: kesitte yükseklikler gerçek oranda, parsel kutusu
 * temsilî. Bu yüzden sayfaya `fitPlanToPage` ile değil, alana SIĞDIRILARAK
 * yerleşir ve üstünde ölçek yazmaz — cetvelle ölçülecek bir pafta değil.
 */
export function buildSitePlanSvg(input: SitePlanInput): SitePlanSvg {
  const { fontFamily } = input
  const widthCm = input.buildingWidthCm ?? DEFAULT_SITE_BUILDING_WIDTH_CM
  const levels = getFloorLevels(input.floors)

  // Kat yoksa kesit tek bir zemin çizgisine iner; sayfa yine basılır.
  const topCm = levels.reduce((highest, level) => Math.max(highest, level.topCm), 0)
  const bottomCm = levels.reduce((lowest, level) => Math.min(lowest, level.baseCm), 0)
  const roofCm = topCm + widthCm * ROOF_HEIGHT_RATIO

  const body: string[] = []
  const titleSizeCm = widthCm * TITLE_SIZE_RATIO
  const labelSizeCm = widthCm * LABEL_SIZE_RATIO
  const levelSizeCm = widthCm * LEVEL_SIZE_RATIO

  const leftCm = 0
  const rightCm = widthCm
  const overhangCm = widthCm * GROUND_OVERHANG_RATIO

  // --- Başlık
  body.push(
    svgText({ x: widthCm / 2, y: roofCm + titleSizeCm * 1.6 }, 'VAZİYET PLANI', {
      fontFamily,
      sizeCm: titleSizeCm,
      color: SVG_COLORS.label,
    }),
  )

  body.push(
    ...buildElevationSvg({
      levels,
      widthCm,
      topCm,
      bottomCm,
      roofCm,
      overhangCm,
      fontFamily,
      labelSizeCm,
      levelSizeCm,
    }),
  )

  // --- Parsel çerçevesi: BOŞ bırakılır, elle tamamlanır
  const parcelHeightCm = (topCm - bottomCm || widthCm) * PARCEL_HEIGHT_RATIO
  const parcelTopCm = bottomCm - widthCm * SECTION_GAP_RATIO
  const parcelBottomCm = parcelTopCm - parcelHeightCm
  const parcelLeftCm = leftCm - overhangCm
  const parcelRightCm = rightCm + overhangCm

  body.push(
    svgPolygon(
      [
        { x: parcelLeftCm, y: parcelBottomCm },
        { x: parcelRightCm, y: parcelBottomCm },
        { x: parcelRightCm, y: parcelTopCm },
        { x: parcelLeftCm, y: parcelTopCm },
      ],
      'none',
      { color: SVG_COLORS.object, widthCm: THIN_WIDTH_CM },
    ),
  )

  const parcel = {
    leftCm: parcelLeftCm,
    rightCm: parcelRightCm,
    bottomCm: parcelBottomCm,
    topCm: parcelTopCm,
  }
  const placedFootprint = input.footprint
    ? drawFootprint(body, input.footprint, parcel, {
        fontFamily,
        labelSizeCm,
        levelSizeCm,
      })
    : undefined

  if (input.doorNumber !== '') {
    // Kapı no binanın İÇİNE yazılır (kontur varsa); parselin ortasında dururken
    // hangi yapıya ait olduğu belirsizdi.
    const center = placedFootprint ?? {
      x: (parcelLeftCm + parcelRightCm) / 2,
      y: (parcelTopCm + parcelBottomCm) / 2,
    }
    body.push(
      svgText(center, `NO: ${input.doorNumber}`, {
        fontFamily,
        sizeCm: labelSizeCm,
        color: SVG_COLORS.label,
      }),
    )
  }

  if (input.streetName !== '') {
    body.push(
      svgText(
        { x: (parcelLeftCm + parcelRightCm) / 2, y: parcelBottomCm - labelSizeCm * 1.4 },
        input.streetName,
        { fontFamily, sizeCm: labelSizeCm, color: SVG_COLORS.label },
      ),
    )
  }

  // Başlığın TABAN çizgisi 1.6'da; harflerin üst uzantısı için bir punto daha
  // pay bırakılıyor, yoksa kutu yazının tepesini kesiyor (ölçüldü).
  const boxTopCm = roofCm + titleSizeCm * 2.8
  const boxBottomCm = parcelBottomCm - labelSizeCm * 2.2
  const boxLeftCm = parcelLeftCm - widthCm * 0.12
  const boxRightCm = parcelRightCm + widthCm * 0.12

  return {
    markup: wrapSvg(body, {
      xCm: boxLeftCm,
      yCm: -boxTopCm,
      widthCm: boxRightCm - boxLeftCm,
      heightCm: boxTopCm - boxBottomCm,
    }),
    widthCm: boxRightCm - boxLeftCm,
    heightCm: boxTopCm - boxBottomCm,
  }
}

function wrapSvg(
  body: readonly string[],
  box: { xCm: number; yCm: number; widthCm: number; heightCm: number },
): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="${n(box.xCm)} ${n(box.yCm)} ${n(box.widthCm)} ${n(box.heightCm)}">` +
    body.join('') +
    `</svg>`
  )
}

