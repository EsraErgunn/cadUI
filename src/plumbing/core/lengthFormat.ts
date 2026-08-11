import { CM_PER_M } from '../../core/coords'

/**
 * Modül düzeyinde BİR kez kurulur: `Intl.NumberFormat` her çağrıda yeniden
 * kurulsaydı etiket sayısı kadar biçimlendirici ayrılırdı.
 */
const METERS_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Kalıcı veri santimetre, gösterim metre. `core/coords.ts`'teki
 * `formatLengthAsMeters` (toFixed) mimari tarafın kullanımında ve nokta ondalık
 * ayırıcı üretiyor; tesisat ölçüleri Türkçe biçimde (virgül) okunmalı.
 */
export function formatLengthMeters(lengthCm: number): string {
  return `${METERS_FORMATTER.format(lengthCm / CM_PER_M)} m`
}
