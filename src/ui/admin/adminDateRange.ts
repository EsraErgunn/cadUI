/**
 * Liste ekranlarının ortak tarih aralığı yardımcıları. Proje listesinin
 * `useProjectListParams`'ından çıkarıldı: evrak listesi de aynı varsayılan
 * aralığı kullanıyor ve iki ekran ayrı kopya tutsaydı biri "son bir ay"ı
 * öbüründen farklı hesaplayabilirdi (klasör sözleşmesi).
 */

/**
 * yyyy-aa-gg. `toISOString()` UTC'ye çevirdiği için yerel saat diliminde günü bir
 * ileri/geri kaydırabilir; parçalar elle birleştiriliyor.
 */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Varsayılan aralık: son bir ay. 31 Mart gibi bir günde `setMonth(-1)` önceki ayda
 * karşılığı olmayan günü sonraki aya taşırdı (3 Mart); gün değiştiyse önceki ayın
 * son gününe çekiliyor.
 */
export function lastMonthRange(today: Date): { from: string; to: string } {
  const from = new Date(today)
  from.setMonth(from.getMonth() - 1)
  if (from.getDate() !== today.getDate()) from.setDate(0)

  return { from: toIsoDate(from), to: toIsoDate(today) }
}
