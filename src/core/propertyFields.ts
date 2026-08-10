import type { SelectionItem } from './selection'

/**
 * Özellik panelinin hangi alan kümesini göstereceği (KK-12). Seçimdeki TÜRLERE
 * bakar, sayıya değil: aynı türden beş duvar da tek duvar da "wall"dır, fark
 * alanların tekil mi toplu mu yazıldığındadır.
 */
export type PropertySelectionKind = 'none' | 'wall' | 'opening' | 'symbol' | 'area' | 'mixed'

export function getPropertySelectionKind(
  selection: readonly SelectionItem[],
): PropertySelectionKind {
  if (selection.length === 0) return 'none'

  const [first] = selection
  return selection.every((item) => item.kind === first.kind) ? first.kind : 'mixed'
}

/**
 * Ortak değer: hepsi aynıysa o değer, ayrışıyorsa undefined. Panel ayrışan alanı
 * boş gösterir — rastgele birini yazmak, kullanıcıya dokunmadığı nesnelerin de o
 * değerde olduğunu söyler.
 */
export function getCommonNumber(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined

  const [first] = values
  return values.every((value) => value === first) ? first : undefined
}

/** Panel başlığı; nesnenin türünü gösterir (KK-12). */
export function getPropertyPanelTitle(
  kind: PropertySelectionKind,
  count: number,
  isDoor: boolean,
  /** Tek sembol seçiliyken başlıkta türünün Türkçe adı görünür ("Pano Özellikleri"). */
  symbolTypeLabel = '',
  /** Tek alan nesnesi seçiliyken başlıkta türünün Türkçe adı görünür ("Kolon Özellikleri"). */
  areaObjectTypeLabel = '',
): string {
  if (kind === 'wall') return count > 1 ? `${count} Duvar` : 'Duvar Özellikleri'
  if (kind === 'opening') {
    if (count > 1) return `${count} Açıklık`
    return isDoor ? 'Kapı Özellikleri' : 'Pencere Özellikleri'
  }
  if (kind === 'symbol') return count > 1 ? `${count} Sembol` : symbolTypeLabel
  if (kind === 'area') return count > 1 ? `${count} Alan Nesnesi` : areaObjectTypeLabel
  if (kind === 'mixed') return `${count} Nesne`
  return ''
}

/** Sıfır/negatif kalınlık görünmez duvar üretir; akıl sağlığı sınırı. */
export const MIN_WALL_THICKNESS_CM = 1
export const MIN_WALL_HEIGHT_CM = 1
