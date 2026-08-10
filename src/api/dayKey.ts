/**
 * "Bugün" kavramının TEK tanımı. Gün anahtarı `YYYY-MM-DD` biçiminde yerel
 * takvim günüdür ve sunucuya `?date=` olarak bu biçimde gider.
 *
 * `toISOString()` KULLANILMAZ: o UTC'ye çevirir, Türkiye saatinde gece
 * yarısından sonra açılan ekran bir önceki günü sorardı. "Bugün" kullanıcının
 * takvim günüdür, sunucunun saat diliminin değil.
 */

/** Ay ve gün iki basamağa tamamlanır — `2026-8-9` değil `2026-08-09`. */
const DATE_PART_DIGITS = 2

export function toDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(DATE_PART_DIGITS, '0')
  const day = String(date.getDate()).padStart(DATE_PART_DIGITS, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Bir sonraki YEREL gece yarısına kalan süre (ms). Gün + 1 ile kurulan tarih
 * ay/yıl taşmasını ve yaz saati kaymasını tarayıcıya bırakır; 24 saat eklemek
 * saat değişimi olan gecelerde bir saat şaşardı.
 */
export function msUntilNextDay(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  return nextMidnight.getTime() - now.getTime()
}
