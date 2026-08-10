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

/** "19.06.2026" — duyuru alt satırındaki tarih. */
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** "19.06.2026 12:00" — duyuru listesinde saat de gerekiyor: aynı gün birden
    çok duyuru yayınlanabiliyor, sıralamayı yalnız tarih açıklamıyor. */
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

export function formatLongDate(date: Date): string {
  return LONG_DATE_FORMATTER.format(date)
}

export function formatShortDate(isoDate: string): string {
  return SHORT_DATE_FORMATTER.format(new Date(isoDate))
}

export function formatDateTime(isoDate: string): string {
  return DATE_TIME_FORMATTER.format(new Date(isoDate))
}
