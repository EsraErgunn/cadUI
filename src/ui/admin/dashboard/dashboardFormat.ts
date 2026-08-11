import { formatLongDate } from '../adminFormat'

/**
 * Kapsam üst bardaki bölge seçicisinden geliyor (docs/kararlar.md K44). Seçim
 * yokken metinler gereksinim belgesindeki hâlinde kalıyor; seçim varsa bölgenin
 * ADI yazılıyor — sayılar süzülmüşken "tüm bölgeler" demek yanlış olurdu.
 */
export const ALL_REGIONS_SCOPE = 'tüm bölgeler'

/** Başlık altındaki açıklama: "Sistem geneli durum — 14 Temmuz 2026, tüm bölgeler". */
export function buildScopeDescription(today: Date, regionName: string | null): string {
  const scope = regionName ?? ALL_REGIONS_SCOPE
  return `Sistem geneli durum — ${formatLongDate(today)}, ${scope}`
}

/** Özet kartlarının altındaki kapsam satırı. */
export function buildCardScopeLabel(regionName: string | null): string {
  return regionName === null ? 'Tüm bölgeler için' : `${regionName} için`
}
