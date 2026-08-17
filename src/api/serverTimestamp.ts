/** Sonunda `Z` ya da `+03:00`/`-0500` gibi bir dilim eki var mı. */
const HAS_TIME_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i

/**
 * Sunucunun zaman damgasını milisaniyeye çevirir.
 *
 * **Dilim eki YOKSA UTC varsayılır.** ECMAScript, `2026-08-15T09:30:00` gibi
 * eksiz bir tarih-saati YEREL saat kabul ediyor; sunucu ise UTC üretiyor
 * (.NET `DateTime`, `Kind=Unspecified` olduğunda eki yazmaz). UTC+3'te bu üç
 * saatlik kayma demek — oturum süresinde taze token'ı "dolmuş" gösteriyordu,
 * yetki geçerliliğinde ise gün sınırındaki kaydı yanlış tarafa düşürür.
 *
 * Tarih-saat değilse (yalnız `2026-08-15` gibi) ek konmaz: `...15Z` geçersiz
 * olur ve okunamayan tarih kuralına düşerdi.
 */
export function parseServerTimestampMs(raw: string): number {
  const shouldAssumeUtc = raw.includes('T') && !HAS_TIME_ZONE.test(raw)
  return Date.parse(shouldAssumeUtc ? `${raw}Z` : raw)
}

/** Damganın ait olduğu UTC gününün İLK anı. */
export function startOfUtcDayMs(timestampMs: number): number {
  const date = new Date(timestampMs)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** Damganın ait olduğu UTC gününün SON anı (ertesi günün başlangıcından 1 ms önce). */
export function endOfUtcDayMs(timestampMs: number): number {
  const date = new Date(timestampMs)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1) - 1
}
