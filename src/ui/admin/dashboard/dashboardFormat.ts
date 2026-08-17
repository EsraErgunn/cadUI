import { formatLongDate } from '../adminFormat'

/**
 * Kapsam üst bardaki seçiciden geliyor (docs/kararlar.md K44). Seçim yokken
 * metin sistem genelini söylüyor; seçim varsa grubun ya da firmanın ADI
 * yazılıyor — sayılar süzülmüşken "tümü" demek yanlış olurdu.
 *
 * Coğrafi bölge kavramı kalktığı için metinler artık "bölge" DEMİYOR.
 */
export const ALL_SCOPES_LABEL = 'tüm gruplar ve firmalar'

/** Başlık altındaki açıklama: "Sistem geneli durum — 14 Temmuz 2026, AKSA". */
export function buildScopeDescription(today: Date, scopeName: string | null): string {
  const scope = scopeName ?? ALL_SCOPES_LABEL
  return `Sistem geneli durum — ${formatLongDate(today)}, ${scope}`
}

/** Özet kartlarının altındaki kapsam satırı. */
export function buildCardScopeLabel(scopeName: string | null): string {
  return scopeName === null ? 'Tüm gruplar ve firmalar için' : `${scopeName} için`
}
