import type { PlanPoint } from '../coords'

/**
 * Baskı paleti. Pafta bir TESİSAT çıktısıdır: gaz hattı ve armatürler konu,
 * mimari bağlamdır — ama bağlam OKUNMALI, silinmemeli.
 *
 * ⚠️ İki tur ayar gerekti. Önce duvarlar neredeyse siyahtı (#1f2933) ve
 * üstündeki boruyu yutuyordu. Sonra tesisat hayaletinin tonuna (#94a3b8)
 * çekilince fazla soluk kaldı VE duvara oturan mimari semboller (menfez, pano)
 * duvarla aynı renge düşüp GÖRÜNMEZ oldu. Şimdiki değerler ikisinin ortası:
 * duvar okunur bir gri, sembol ondan belirgin biçimde koyu.
 */
export const SVG_COLORS = {
  /** Mimari kütle. Boruyu yutmayacak kadar açık, bağlam olacak kadar okunur. */
  ink: '#6b7280',
  /** Oda dolgusu: yalnız "burası kapalı hacim" desin. Neredeyse beyaz. */
  roomFill: '#f7f9fb',
  openingFill: '#ffffff',
  /**
   * Duvara oturan mimari semboller (menfez, pano, aydınlatma…). Duvardan KOYU
   * olmak zorunda: aynı tonda olsalar duvarın üstünde kaybolurlar.
   */
  symbol: '#334155',
  /** Ölçü ve açı yazıları. */
  annotation: '#7c8899',
  /** Oda adı/alanı, serbest metin ve tesisat eleman etiketleri. */
  label: '#475569',
  /** Kiriş ve alan nesnesi konturu. */
  object: '#94a3b8',
  /** Etiketi nesnesine bağlayan kesikli kılavuz çizgisi. */
  leader: '#94a3b8',
  /** Kolon gibi DOLU çizilen yapı elemanları. */
  objectFill: '#c9d1db',
  /**
   * Servis kutusu — vaziyet planında gazın binaya GİRDİĞİ nokta. Paletteki tek
   * sıcak renk: sayfadaki her şey griyken göz doğrudan oraya gitsin diye.
   */
  serviceBox: '#b91c1c',
} as const

/** Koordinatları iki ondalıkla yazar: PDF'te fazlası görünmez, dosya şişer. */
export function n(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '0'
}

/**
 * SVG y ekseni AŞAĞI, plan y ekseni YUKARI büyür. Çevirme SADECE burada yapılır
 * — `core/coords.ts`'in plan→three kuralıyla aynı gerekçe: birden çok yerde
 * tekrarlanırsa biri unutulur ve hata ancak baskıda görülür.
 */
export function sy(planY: number): string {
  return n(-planY)
}

export function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function toPolygonPoints(corners: readonly PlanPoint[]): string {
  return corners.map((corner) => `${n(corner.x)},${sy(corner.y)}`).join(' ')
}

export type SvgTextOptions = {
  fontFamily: string
  /** Yazı yüksekliği PLAN santimi cinsinden; SVG uzayı da cm. */
  sizeCm: number
  color?: string
  anchor?: 'start' | 'middle' | 'end'
  /** Derece, saat yönünün TERSİNE (plan sözleşmesi). SVG ters yönde döndüğü için işaret çevrilir. */
  angleDeg?: number
}

export function svgText(at: PlanPoint, text: string, options: SvgTextOptions): string {
  const { fontFamily, sizeCm, color = SVG_COLORS.ink, anchor = 'middle', angleDeg } = options
  // SVG rotate() saat YÖNÜNDE pozitif; plan açısı tersine, ayrıca y çevrildiği
  // için işaret bir kez daha dönüyor — ikisi sadeleşince eksi kalıyor.
  const transform =
    angleDeg === undefined || angleDeg === 0
      ? ''
      : ` transform="rotate(${n(-angleDeg)} ${n(at.x)} ${sy(at.y)})"`

  return (
    `<text x="${n(at.x)}" y="${sy(at.y)}" font-family="${escapeXml(fontFamily)}" ` +
    `font-size="${n(sizeCm)}" fill="${color}" text-anchor="${anchor}"${transform}>` +
    `${escapeXml(text)}</text>`
  )
}

export function svgLine(
  p1: PlanPoint,
  p2: PlanPoint,
  strokeWidthCm: number,
  color: string,
  isRoundCapped = false,
): string {
  const cap = isRoundCapped ? ' stroke-linecap="round"' : ''
  return (
    `<line x1="${n(p1.x)}" y1="${sy(p1.y)}" x2="${n(p2.x)}" y2="${sy(p2.y)}" ` +
    `stroke="${color}" stroke-width="${n(strokeWidthCm)}"${cap} />`
  )
}

export function svgPolyline(
  corners: readonly PlanPoint[],
  strokeWidthCm: number,
  color: string,
  isRoundCapped = false,
): string {
  const cap = isRoundCapped ? ' stroke-linecap="round" stroke-linejoin="round"' : ''
  return (
    `<polyline points="${toPolygonPoints(corners)}" fill="none" ` +
    `stroke="${color}" stroke-width="${n(strokeWidthCm)}"${cap} />`
  )
}

export function svgPolygon(
  corners: readonly PlanPoint[],
  fill: string,
  stroke?: { color: string; widthCm: number },
): string {
  const strokeAttrs = stroke
    ? ` stroke="${stroke.color}" stroke-width="${n(stroke.widthCm)}"`
    : ''
  return `<polygon points="${toPolygonPoints(corners)}" fill="${fill}"${strokeAttrs} />`
}
