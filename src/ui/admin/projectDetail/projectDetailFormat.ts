import { formatCount } from '../adminFormat'

/**
 * Detay ekranının birim ve sayı biçimlendirmesi. Birimler METNE gömülü
 * (belge + KK-5): basınç "mbar", alan "m²". Tabloda birim sütun BAŞLIĞINDA
 * durduğu için oradaki hücreler çıplak sayı gösterir — aynı değeri iki kez
 * etiketlemek sütunu şişirirdi.
 */

/** Ondalıklı teknik değer ("3,50" gibi); tr-TR ayracı virgül. */
const DECIMAL_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

export function formatDecimal(value: number | null): string | null {
  return value === null ? null : DECIMAL_FORMATTER.format(value)
}

export function formatInteger(value: number | null): string | null {
  return value === null ? null : formatCount(value)
}

export function formatPressureMbar(value: number | null): string | null {
  return value === null ? null : `${formatCount(value)} mbar`
}

export function formatAreaSquareMeters(value: number | null): string | null {
  return value === null ? null : `${formatCount(value)} m²`
}

/** Saat taşımayan düz tarih (`yyyy-aa-gg`). */
export function formatPlainDate(value: string | null): string | null {
  if (value === null) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toLocaleDateString('tr-TR')
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
})

export function formatCurrency(value: number | null): string | null {
  return value === null ? null : CURRENCY_FORMATTER.format(value)
}

/** Bayt eşikleri ikilik tabanda; ekranda KB/MB olarak gösterilir. */
const BYTES_PER_KILOBYTE = 1024

export function formatFileSize(bytes: number | null): string | null {
  if (bytes === null) return null
  if (bytes < BYTES_PER_KILOBYTE) return `${formatCount(bytes)} B`

  const kilobytes = bytes / BYTES_PER_KILOBYTE
  if (kilobytes < BYTES_PER_KILOBYTE) return `${DECIMAL_FORMATTER.format(kilobytes)} KB`

  return `${DECIMAL_FORMATTER.format(kilobytes / BYTES_PER_KILOBYTE)} MB`
}

/**
 * "Müstakil" ve "Ruhsat" gibi evet/hayır alanları. `null` bilinmiyor demek ve
 * "Hayır"a çevrilmez — bilinmeyen bir ruhsatı "yok" göstermek, olmayan bilgiyi
 * olumsuz bir cevaba dönüştürürdü.
 */
export function formatYesNo(value: boolean | null): string | null {
  if (value === null) return null
  return value ? 'Evet' : 'Hayır'
}
