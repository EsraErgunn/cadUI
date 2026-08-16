/** Tam sayıdan bu kadar sapan açı ondalıklı yazılır. */
const WHOLE_DEGREE_TOLERANCE = 0.05

/**
 * Modül düzeyinde BİR kez kurulur — `lengthFormat` ile aynı gerekçe: etiket
 * sayısı kadar biçimlendirici ayırmanın anlamı yok.
 */
const DEGREE_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Açı yazısı. Dik köşe "90°" olarak çıkar, "90,0°" değil: planların ezici
 * çoğunluğu dik açılardan oluşuyor ve her köşeye anlamsız bir ondalık eklemek
 * çizimi kalabalıklaştırırdı. Eğik duvarda ondalık geri gelir, çünkü orada
 * yuvarlanmış sayı yanlış bir kesinlik iddiası olurdu.
 */
export function formatAngleDegrees(angleDeg: number): string {
  const rounded = Math.round(angleDeg)
  if (Math.abs(angleDeg - rounded) < WHOLE_DEGREE_TOLERANCE) return `${rounded}°`
  return `${DEGREE_FORMATTER.format(angleDeg)}°`
}
