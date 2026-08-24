import type { PlanPoint } from '../coords'

/** Kullanıcının seçebildiği kâğıtlar (issue: A4/A3, varsayılan A3). */
export const PAPER_SIZE_IDS = ['A4', 'A3'] as const
export type PaperSizeId = (typeof PAPER_SIZE_IDS)[number]
export const DEFAULT_PAPER_SIZE: PaperSizeId = 'A3'

export const ORIENTATIONS = ['landscape', 'portrait'] as const
export type Orientation = (typeof ORIENTATIONS)[number]
export const DEFAULT_ORIENTATION: Orientation = 'landscape'

export const PDF_SCALE_IDS = ['1:50', '1:100', '1:200'] as const
export type PdfScaleId = (typeof PDF_SCALE_IDS)[number]
export const DEFAULT_PDF_SCALE: PdfScaleId = '1:100'

/** Ölçeğin paydası: 1:100'de kâğıttaki 1 birim, gerçekte 100 birim. */
const SCALE_DENOMINATOR: Record<PdfScaleId, number> = {
  '1:50': 50,
  '1:100': 100,
  '1:200': 200,
}

/**
 * Kâğıt ölçüleri DİKEY hâliyle (mm). Yatay istendiğinde kenarlar takas edilir —
 * iki yönü ayrı ayrı yazmak, birini güncelleyip diğerini unutmaya davetiye.
 */
const PAPER_MM: Record<PaperSizeId, { widthMm: number; heightMm: number }> = {
  A4: { widthMm: 210, heightMm: 297 },
  A3: { widthMm: 297, heightMm: 420 },
}

const MM_PER_INCH = 25.4
const POINTS_PER_INCH = 72

/**
 * PDF'in kendi birimi PUNTO (1/72 inç). Dönüşüm SADECE burada yazılır — sahne
 * tarafındaki plan→three kuralının (core/coords.ts) aynısı: birim dönüşümü tek
 * yerde durmazsa iki çağıran farklı sabit kullanır ve fark ancak baskıda görülür.
 */
export function mmToPoints(mm: number): number {
  return (mm / MM_PER_INCH) * POINTS_PER_INCH
}

export type PageSizePt = { widthPt: number; heightPt: number }

export function getPageSizePt(paper: PaperSizeId, orientation: Orientation): PageSizePt {
  const { widthMm, heightMm } = PAPER_MM[paper]
  const isLandscape = orientation === 'landscape'
  return {
    widthPt: mmToPoints(isLandscape ? heightMm : widthMm),
    heightPt: mmToPoints(isLandscape ? widthMm : heightMm),
  }
}

/**
 * Plan santimi → kâğıt puntosu. 1:100'de 100 cm plan = 1 cm kâğıt.
 *
 * Bu ORAN sabittir ve çizimin büyüklüğüne bakmaz: ölçekli çıktının anlamı budur.
 * "Sayfaya sığdır" diye ölçeği oynatmak çıktıyı ölçeksiz yapar — cetvelle
 * ölçen kullanıcı yanlış sonuç alır. Sığmama durumu bu yüzden GİZLENMEZ,
 * `fitPlanToPage` ayrıca bildirir.
 */
export function planCmToPoints(cm: number, scale: PdfScaleId): number {
  const paperCm = cm / SCALE_DENOMINATOR[scale]
  return mmToPoints(paperCm * 10)
}

export type PlanBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Çizimin plan uzayındaki sınırları; nokta yoksa `undefined` (boş kat). */
export function getPlanBounds(points: readonly PlanPoint[]): PlanBounds | undefined {
  if (points.length === 0) return undefined

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }

  return { minX, minY, maxX, maxY }
}

/** Çizim alanının kâğıt kenarlarından uzaklığı (mm). Antet bu alanın İÇİNDEN yer alır. */
export const PAGE_MARGIN_MM = 10

export type PageTransform = {
  /** Plan cm → punto katsayısı. Ölçekten gelir, sığdırmaya göre DEĞİŞMEZ. */
  scalePt: number
  /** Plan (0,0)'ın sayfadaki karşılığı (punto, sol-alt köşeden). */
  originXPt: number
  originYPt: number
}

export type PageFit = {
  transform: PageTransform
  /**
   * Çizim, çizim alanına sığmıyor mu? Sığmıyorsa kullanıcı UYARILIR ama üretim
   * ENGELLENMEZ: ölçeği bilerek seçmiş olabilir, kırpılmış bir pafta da işine
   * yarayabilir. Karar kullanıcının, sürpriz olmaması bizim işimiz.
   */
  isOverflowing: boolean
  /** Çizimin kâğıttaki boyutu (punto); sığmama uyarısında gösterilir. */
  drawingWidthPt: number
  drawingHeightPt: number
}

export type PageArea = {
  xPt: number
  yPt: number
  widthPt: number
  heightPt: number
}

/** Kenar boşlukları düşülmüş çizim alanı. */
export function getDrawableArea(pageSize: PageSizePt): PageArea {
  const marginPt = mmToPoints(PAGE_MARGIN_MM)
  return {
    xPt: marginPt,
    yPt: marginPt,
    widthPt: pageSize.widthPt - marginPt * 2,
    heightPt: pageSize.heightPt - marginPt * 2,
  }
}

/**
 * Çizimi sayfaya ORTALAR ve dönüşümü verir.
 *
 * Ölçek sabit kaldığı için "sığdırma" yalnız KONUMLANDIRMADIR: çizim alanın
 * ortasına oturur, taşarsa iki yana da taşar. Boş katta (`bounds` yok) dönüşüm
 * yine üretilir — sayfa boş çıkacak ama antetiyle basılacak, yoksa çıktıda
 * hangi katın boş olduğu anlaşılmaz.
 */
export function fitPlanToPage(
  bounds: PlanBounds | undefined,
  area: PageArea,
  scale: PdfScaleId,
): PageFit {
  const scalePt = planCmToPoints(1, scale)

  if (!bounds) {
    return {
      transform: { scalePt, originXPt: area.xPt, originYPt: area.yPt },
      isOverflowing: false,
      drawingWidthPt: 0,
      drawingHeightPt: 0,
    }
  }

  const drawingWidthPt = (bounds.maxX - bounds.minX) * scalePt
  const drawingHeightPt = (bounds.maxY - bounds.minY) * scalePt

  return {
    transform: {
      scalePt,
      originXPt: area.xPt + (area.widthPt - drawingWidthPt) / 2 - bounds.minX * scalePt,
      originYPt: area.yPt + (area.heightPt - drawingHeightPt) / 2 - bounds.minY * scalePt,
    },
    isOverflowing: drawingWidthPt > area.widthPt || drawingHeightPt > area.heightPt,
    drawingWidthPt,
    drawingHeightPt,
  }
}

/**
 * Plan noktasını sayfa puntosuna taşır.
 *
 * Y ÇEVRİLMEZ: planda +y yukarı (core/coords.ts plan y'yi three'de −z'ye
 * gönderiyor, tepeden bakışta ekranda yukarı) ve PDF'te de +y yukarı.
 */
export function planPointToPage(
  point: PlanPoint,
  transform: PageTransform,
): { xPt: number; yPt: number } {
  return {
    xPt: transform.originXPt + point.x * transform.scalePt,
    yPt: transform.originYPt + point.y * transform.scalePt,
  }
}
