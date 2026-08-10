import type { ProjectFirm, ProjectFirmQuery } from './projectFirms'
import { includesTr } from './turkishText'

/**
 * Sunucunun yapması GEREKEN işi istemcide yapar: filtre → sırala → dilimle.
 *
 * Uç (`GET /api/projectfirms`) filtresiz, sayfalamasız düz dizi döndürüyor.
 * Geçici çözüm — bkz. docs/kararlar.md K29 (ve aynı gerekçenin ilki, K27).
 *
 * Saf fonksiyon: React Query'nin `queryFn`'i içinde DEĞİL, sayfada `useMemo`
 * içinde çağrılır. Böylece arama değişince liste yeniden ÇEKİLMEZ, yalnız
 * yeniden süzülür.
 *
 * Mock yol da aynı fonksiyondan geçer: iki yerde iki farklı eşleşme/sıralama
 * kuralı olsaydı, mock'tan gerçeğe geçerken davranış sessizce değişirdi.
 */
export function queryProjectFirmList(
  firms: ProjectFirm[],
  query: ProjectFirmQuery,
): { items: ProjectFirm[]; totalCount: number } {
  const matched = firms.filter((firm) => matchesQuery(firm, query))
  const sorted = [...matched].sort((left, right) => compareFirms(left, right, query))
  const offset = (query.page - 1) * query.pageSize

  return {
    items: sorted.slice(offset, offset + query.pageSize),
    totalCount: matched.length,
  }
}

/** Arama YALNIZ firma ünvanı üzerinde (gereksinim 4.2), içerik bazlı. */
function matchesQuery(firm: ProjectFirm, query: ProjectFirmQuery): boolean {
  if (query.nameQuery === '') return true
  return includesTr(firm.name, query.nameQuery)
}

function compareFirms(
  left: ProjectFirm,
  right: ProjectFirm,
  query: ProjectFirmQuery,
): number {
  const direction = query.sortDir === 'asc' ? 1 : -1

  if (query.sortKey === 'name') {
    return left.name.localeCompare(right.name, 'tr') * direction
  }

  // Yetkilisi olmayan kayıt her iki yönde de sona düşsün — "-" satırları
  // listeyi ortadan bölmesin (grup sütunundaki desenin aynısı, K27).
  const leftValue = left.authorizedPerson
  const rightValue = right.authorizedPerson
  if (leftValue === null) return rightValue === null ? 0 : 1
  if (rightValue === null) return -1

  return leftValue.localeCompare(rightValue, 'tr') * direction
}
