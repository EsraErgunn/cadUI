import { CM_PER_M } from './coords'

/**
 * Modül düzeyinde BİR kez kurulur: `Intl.NumberFormat` her çağrıda yeniden
 * kurulsaydı etiket sayısı kadar biçimlendirici ayrılırdı.
 */
const METERS_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Kalıcı veri santimetre, gösterim metre; ayırıcı Türkçe (virgül).
 * Tesisat ölçüleriyle mimari duvar ölçüleri AYNI biçimi kullanır — ikisi aynı
 * tuvalde yan yana okunuyor, biri "3,50 m" diğeri "3.50" olsaydı çizim iki
 * ayrı programdan çıkmış gibi görünürdü. Bu yüzden `plumbing/core/lengthFormat`
 * kendi kopyasını tutmuyor, buradan yeniden dışa veriyor.
 */
export function formatLengthMeters(lengthCm: number): string {
  return `${METERS_FORMATTER.format(lengthCm / CM_PER_M)} m`
}

/**
 * KOT yazımı: uzunluktan farklı olarak İŞARET taşır (`+2,00` / `-0,50`), çünkü
 * kot bir mesafe değil zemine göre YÖNLÜ bir konum — işaretsiz yazıldığında
 * bodrumdaki bir boru zemindekiyle aynı görünürdü. Birim EKİ YOK: kot çoğu
 * yerde parantez içinde, birimi zaten söylenmiş bir uzunluğun yanında duruyor
 * (`▲0,75 m (+2,00)`).
 */
export function formatSignedMeters(heightCm: number): string {
  const formatted = METERS_FORMATTER.format(Math.abs(heightCm) / CM_PER_M)
  // Yuvarlandığında sıfıra düşen değer (-0,004 m) "-0,00" yazardı; işaretsiz kalır.
  if (formatted === METERS_FORMATTER.format(0)) return formatted

  return `${heightCm < 0 ? '-' : '+'}${formatted}`
}

/** Tek başına duran kot (`+0,15 m`) — parantez içindekinin aksine birimini taşır. */
export function formatElevationMeters(heightCm: number): string {
  return `${formatSignedMeters(heightCm)} m`
}
