import { normalizeZero, type PlanPoint } from './coords'
import type { TextLabel } from './model'

/** Yeni metnin varsayılan yüksekliği (cm). 1:50 planda okunur, duvarı bastırmaz. */
export const DEFAULT_TEXT_HEIGHT_CM = 25

/** Kullanıcı boyu bu aralığın dışına çıkaramaz: sıfır boy görünmez, aşırısı planı yutar. */
export const MIN_TEXT_HEIGHT_CM = 5
export const MAX_TEXT_HEIGHT_CM = 500

/** Yeni metnin ilk içeriği; kutu bununla açılır ve kullanıcı üzerine yazar. */
export const DEFAULT_TEXT = 'Metin'

/**
 * Kutuyu boşaltmak metni SİLMEK demektir (K81 eki). Kuralın tek adresi burası:
 * düzenleme kutusu "silecek miyim" diye, store "yazacak mıyım" diye aynı
 * fonksiyonu soruyor — ikisi ayrışsaydı boşaltılan metin ne silinir ne yazılır,
 * eski hâliyle geri gelirdi.
 */
export function isBlankText(text: string): boolean {
  return text.trim().length === 0
}

/**
 * Harf genişliğinin yüksekliğe ORANI. Gerçek genişlik yazı tipinden gelir ama
 * core `troika`yı (ve DOM'u) tanımaz; tutma dikdörtgeni için kaba bir tahmin
 * yeter — Roboto'da ortalama karakter genişliği yüksekliğin ~0.55'i.
 *
 * Tahminin YÖNÜ önemli: fazla dar bir kutu metni tutulamaz yapardı, fazla geniş
 * olan yalnız biraz cömert davranır. Bu yüzden yukarı yuvarlanmış bir değer.
 */
const CHARACTER_WIDTH_RATIO = 0.6

/** Tek harflik metin bile tutulabilsin: kutu en az bu kadar geniş sayılır. */
const MIN_HIT_WIDTH_RATIO = 1

export type TextLabelBounds = {
  /** Metnin kendi ekseninde (dönmemiş) yarım genişlik ve yarım yükseklik (cm). */
  halfWidthCm: number
  halfHeightCm: number
}

export function getTextLabelBounds(text: TextLabel): TextLabelBounds {
  const widthRatio = Math.max(text.text.length * CHARACTER_WIDTH_RATIO, MIN_HIT_WIDTH_RATIO)

  return {
    halfWidthCm: (text.heightCm * widthRatio) / 2,
    halfHeightCm: text.heightCm / 2,
  }
}

/**
 * Metnin dört köşesi (dönmüş hâliyle), sırayla. Çerçeve seçimi bunu okur:
 * `getAreaObjectCorners` ile aynı sözleşme, böylece "tamamen kapsanıyorsa
 * seçilir" kuralı metinde de aynı şekilde uygulanır.
 */
export function getTextLabelCorners(text: TextLabel): PlanPoint[] {
  const { halfWidthCm, halfHeightCm } = getTextLabelBounds(text)
  const angleRad = (text.angleDeg * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  return [
    [-halfWidthCm, -halfHeightCm],
    [halfWidthCm, -halfHeightCm],
    [halfWidthCm, halfHeightCm],
    [-halfWidthCm, halfHeightCm],
  ].map(([offsetX, offsetY]) => ({
    x: normalizeZero(text.x + offsetX! * cos - offsetY! * sin),
    y: normalizeZero(text.y + offsetX! * sin + offsetY! * cos),
  }))
}

/**
 * Nokta metnin kutusunun içinde mi? Test metnin KENDİ eksenine geri döndürülüp
 * yapılıyor — dönmüş bir dikdörtgene doğrudan sınır kutusu testi uygulamak,
 * eğik metinlerde köşelerdeki boşluğu da "üstünde" sayardı.
 */
export function isPointOnTextLabel(point: PlanPoint, text: TextLabel): boolean {
  const { halfWidthCm, halfHeightCm } = getTextLabelBounds(text)
  const angleRad = (-text.angleDeg * Math.PI) / 180
  const dx = point.x - text.x
  const dy = point.y - text.y
  const localX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad)
  const localY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad)

  return Math.abs(localX) <= halfWidthCm && Math.abs(localY) <= halfHeightCm
}

/**
 * İmlecin altındaki metin; üst üste binenlerde SONUNCU kazanır çünkü sonradan
 * eklenen üstte çiziliyor — kullanıcı gördüğünü tutar.
 */
export function findTextLabelAt(
  point: PlanPoint,
  texts: readonly TextLabel[],
  floorId: number,
): TextLabel | undefined {
  for (let index = texts.length - 1; index >= 0; index -= 1) {
    const text = texts[index]!
    if (text.floorId !== floorId) continue
    if (isPointOnTextLabel(point, text)) return text
  }
  return undefined
}
