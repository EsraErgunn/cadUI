/** Yönetici ekranlarının ortak biçimlendiricileri. Tek yerde: iki ekran aynı
    tarihi farklı yazarsa kullanıcı iki farklı sistem görüyor sanır. */

/** Ekrandaki tüm sayılar binlik ayraçlı (belge + KK-3). */
const NUMBER_FORMATTER = new Intl.NumberFormat('tr-TR')

/** "14 Temmuz 2026" — başlık altındaki kapsam açıklamasının tarihi. */
const LONG_DATE_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "19.06.2026" — künye satırlarındaki tarih (proje tarihi gibi). */
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** "19.06.2026 12:00" — son güncelleme/onay satırlarında saat de gerekiyor:
    aynı gün birden çok kayıt değişebiliyor, sıralamayı yalnız tarih
    açıklamıyor. */
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatCount(value: number): string {
  return NUMBER_FORMATTER.format(value)
}

/** Veri henüz gelmediğinde başlıkta adet yerine görünen işaret. */
const PENDING_COUNT_LABEL = '…'

/**
 * Başlıktaki kayıt adedi (`PageHeader.countLabel`). Ekranlar adedi kendi
 * `String()`'iyle yazdığı sürece biri binlik ayraçlı, biri ayraçsız
 * gösteriyordu ("11.839" ve "11839").
 */
export function formatCountLabel(totalCount: number | undefined): string {
  return totalCount === undefined ? PENDING_COUNT_LABEL : formatCount(totalCount)
}

export function formatLongDate(date: Date): string {
  return LONG_DATE_FORMATTER.format(date)
}

export function formatShortDate(isoDate: string): string {
  return SHORT_DATE_FORMATTER.format(new Date(isoDate))
}

export function formatDateTime(isoDate: string): string {
  return DATE_TIME_FORMATTER.format(new Date(isoDate))
}

/**
 * Saat taşımayan düz tarih (`yyyy-aa-gg`). Proje detayından buraya taşındı:
 * poliçe listesi de aynı biçimi yazıyor ve iki kopya, iki farklı tarih biçimi
 * demekti.
 */
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

/** Teminat/tutar alanları; poliçe özeti, proje detayı ve poliçe listesi ortak. */
export function formatCurrency(value: number | null): string | null {
  return value === null ? null : CURRENCY_FORMATTER.format(value)
}
