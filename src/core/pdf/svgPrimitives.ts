import type { PlanPoint } from '../coords'

/**
 * Baskı paleti. Pafta bir TESİSAT çıktısıdır: gaz hattı ve armatürler konu,
 * mimari bağlamdır — ama bağlam OKUNMALI, silinmemeli.
 *
 * ⚠️ KAPSAM: burası artık görünüş, izometri, vaziyet ve oturum paftalarının
 * paleti. Kat planı K154'ten beri `PLAN_COLORS`u kullanıyor; buradaki bir
 * değeri değiştirmek kat planını ETKİLEMEZ, öteki dört paftayı birden etkiler.
 *
 * ⚠️ Ton seçimi iki tur ayar istedi. Önce duvarlar neredeyse siyahtı (#1f2933)
 * ve üstündeki boruyu yutuyordu; sonra tesisat hayaletinin tonuna (#94a3b8)
 * çekilince fazla soluk kaldı. Şimdiki değer ikisinin ortası.
 */
export const SVG_COLORS = {
  /** Mimari kütle. Boruyu yutmayacak kadar açık, bağlam olacak kadar okunur. */
  ink: '#6b7280',
  /** Ölçü ve açı yazıları. */
  annotation: '#7c8899',
  /** Etiket ve ad yazıları. */
  label: '#475569',
  /** Kiriş ve alan nesnesi konturu. */
  object: '#94a3b8',
  /** Etiketi nesnesine bağlayan kesikli kılavuz çizgisi. */
  leader: '#94a3b8',
  /**
   * Servis kutusu — vaziyet planında gazın binaya GİRDİĞİ nokta. Paletteki tek
   * sıcak renk: sayfadaki her şey griyken göz doğrudan oraya gitsin diye.
   */
  serviceBox: '#b91c1c',
} as const

/**
 * KAT PLANI paftasının mimari paleti. Pafta tesisat odaklıdır (K154): mimari
 * yalnız bağlam, o yüzden hiçbir mimari yüzey DOLU basılmaz — her şey içi boş,
 * ince konturdur ve göz doğrudan renkli tesisata gider.
 *
 * ⚠️ `SVG_COLORS`ten AYRI durmasının sebebi kapsam: aynı palet görünüş,
 * izometri, vaziyet ve oturum paftalarında da kullanılıyor ve onlar bu karardan
 * etkilenmiyor. Ortak sabitleri değiştirmek dört paftayı birden silikleştirirdi.
 *
 * İki kademe var, tek ton değil: duvar taşıyıcı kütle olarak okunmalı, geri
 * kalan mimari (kapı kanadı, kolon, merdiven, menfez…) ondan belirgin biçimde
 * daha silik kalır. Tek tonda merdiven basamağı ile duvar aynı ağırlıkta çıkıyor
 * ve plan yine kalabalık görünüyordu.
 */
export const PLAN_COLORS = {
  /** Duvar ve kiriş konturu — mimarideki en belirgin ton. */
  wall: '#5b6674',
  /** Duvarın İÇİ: dolu değil, altındakini kapatan boşluk. */
  wallVoid: '#ffffff',
  /** Kapı/pencere, yapı elemanı, cihaz sembolü — bağlam, konu değil. */
  faint: '#a8b0bb',
  /** Oda adı/alanı, serbest metin, yapı elemanı adı. */
  architectureText: '#8a94a1',
  /** Ölçü ve açı yazıları; mimari yazıdan da siliktir. */
  annotation: '#a8b0bb',
  /**
   * Tesisat eleman etiketi ve kılavuzu. Mimari yazıdan KOYU olmak zorunda:
   * ikisi de aynı tonda basılınca cihaz adı plan yazısı gibi okunuyordu.
   */
  installationText: '#334155',
} as const

/**
 * Duvar konturunun kalınlığı (cm). Kâğıtta ince ama kesintisiz okunan en az
 * değer. `svgPrimitives`te duruyor çünkü İKİ dosya bağlı: duvarı `planSvg`
 * çiziyor, açıklık beyazını o çizginin üstüne `planSvgArchitecture` taşırıyor.
 */
export const WALL_OUTLINE_CM = 2

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
