import { formatLongDate } from '../adminFormat'

/** Bölge seçilmemişken kapsam "tüm bölgeler"dir (üst bardaki "Hepsi"). */
export const ALL_REGIONS_SCOPE = 'tüm bölgeler'

/** Başlık altındaki açıklama: "Sistem geneli durum — 14 Temmuz 2026, tüm bölgeler". */
export function buildScopeDescription(today: Date, region: string | null): string {
  return `Sistem geneli durum — ${formatLongDate(today)}, ${region ?? ALL_REGIONS_SCOPE}`
}

/** Özet kartlarının altındaki kapsam satırı: "Tüm bölgeler için" / "Ege için". */
export function buildCardScopeLabel(region: string | null): string {
  return region === null ? 'Tüm bölgeler için' : `${region} için`
}
