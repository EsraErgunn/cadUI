import type { GasDistributionFirm, GasDistributionFirmQuery } from './adminFirms'
import { includesTr } from './turkishText'

/**
 * Sunucunun yapması GEREKEN işi istemcide yapar: filtre → sırala → dilimle.
 *
 * Uç (`GET /api/gasdistributionfirms`) filtresiz, sayfalamasız düz dizi
 * döndürüyor; `q`, `page`, `pageSize`, `sort` parametreleri yok. Backend sayfalı
 * uç açana kadar geçici çözüm — bkz. docs/kararlar.md K27.
 *
 * Mock yol da aynı fonksiyonu kullanıyor: iki yerde iki farklı sıralama/eşleşme
 * kuralı olsaydı, mock'tan gerçeğe geçerken davranış sessizce değişirdi.
 */
export function queryFirmList(
  firms: GasDistributionFirm[],
  query: GasDistributionFirmQuery,
): { items: GasDistributionFirm[]; totalCount: number } {
  const matched = firms.filter((firm) => matchesQuery(firm, query))
  const sorted = [...matched].sort((left, right) => compareFirms(left, right, query))
  const offset = (query.page - 1) * query.pageSize

  return {
    items: sorted.slice(offset, offset + query.pageSize),
    totalCount: matched.length,
  }
}

function matchesQuery(firm: GasDistributionFirm, query: GasDistributionFirmQuery): boolean {
  // Arama Türkçe karakter ve büyük/küçük harf duyarsız (KK-4).
  if (query.nameQuery !== '' && !includesTr(firm.name, query.nameQuery)) return false
  if (query.groupId !== null && firm.groupId !== query.groupId) return false
  // Kapsam firması grup süzgecinden BAĞIMSIZ değerlendirilir: ikisi aynı anda
  // dolu olamaz (üst bar birini yazarken öbürünü siliyor), o yüzden sıralama
  // önemli değil.
  if (query.scopeFirmId !== null && firm.id !== query.scopeFirmId) return false

  // Bölge BİLEREK süzülmüyor: sunucu bu alanı taşımıyor, süzülseydi bölge
  // seçili her aramada liste boşalır ve kullanıcı veri kaybettiğini sanırdı.
  return true
}

function compareFirms(
  left: GasDistributionFirm,
  right: GasDistributionFirm,
  query: GasDistributionFirmQuery,
): number {
  const direction = query.sortDir === 'asc' ? 1 : -1

  if (query.sortKey === 'dfirmNo') {
    return (left.dfirmNo - right.dfirmNo) * direction
  }

  // Grubu olmayan kayıt her iki yönde de sona düşsün — "-" satırları listeyi bölmesin.
  const leftValue = query.sortKey === 'name' ? left.name : left.groupName
  const rightValue = query.sortKey === 'name' ? right.name : right.groupName
  if (leftValue === null) return rightValue === null ? 0 : 1
  if (rightValue === null) return -1

  return leftValue.localeCompare(rightValue, 'tr') * direction
}
