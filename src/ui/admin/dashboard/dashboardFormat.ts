/**
 * Özet kartlarının altındaki kapsam satırı. Kapsam üst bardaki seçiciden geliyor
 * (docs/kararlar.md K44); seçim varsa grubun ya da firmanın ADI yazılıyor —
 * sayılar süzülmüşken "tümü" demek yanlış olurdu. Coğrafi bölge kavramı
 * kalktığı için metin "bölge" DEMİYOR.
 */
export function buildCardScopeLabel(scopeName: string | null): string {
  return scopeName === null ? 'Tüm gruplar ve firmalar için' : `${scopeName} için`
}
