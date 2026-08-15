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
