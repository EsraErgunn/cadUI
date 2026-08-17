import type { ProjectFirmAuthorizationRef } from './projectFirmAuthorizations'
import type { ProjectFirmGasFirm } from './projectFirmDto'
import type { ProjectFirm, ProjectFirmQuery } from './projectFirms'
import { includesTr } from './turkishText'

/**
 * Tabloya giren satır: firma alanları + yetki ucundan gelen G.D. firmaları.
 *
 * Alan ÇOĞUL çünkü bir proje firması aynı anda birden fazla gaz dağıtım
 * firmasında yetkili olabiliyor (gerçek veride var). Tekil `gasFirm | null`
 * bırakılsaydı çağıranın "ilk yetki" gibi sessiz bir seçim yapması gerekirdi ve
 * kullanıcı firmanın diğer yetkilerini hiç görmezdi.
 */
export interface ProjectFirmRow extends ProjectFirm {
  gasFirms: ProjectFirmGasFirm[]
}

/**
 * İki ucun sonucunu satırda birleştirir: `GET /api/projectfirms` firmayı,
 * `GET /api/project-firm-authorizations` yetkiyi veriyor, bağı kuran tek bir uç
 * yok.
 *
 * Yetki satırları çağıran tarafından ZATEN süzülmüş gelir
 * (`getEffectiveAuthorizations`): süresi dolmuş yetki kuralı tek kapıdan geçsin
 * diye burada ikinci bir tarih karşılaştırması yapılmıyor.
 *
 * Yetkisi olmayan firma listeden DÜŞMEZ, `gasFirms` boş kalır ve hücre "-"
 * gösterir. İç birleştirme yapılsaydı liste sessizce firma kaybederdi.
 */
export function buildProjectFirmRows(
  firms: readonly ProjectFirm[],
  effectiveAuthorizations: readonly ProjectFirmAuthorizationRef[],
): ProjectFirmRow[] {
  const gasFirmsByProjectFirm = new Map<number, Map<number, ProjectFirmGasFirm>>()

  for (const authorization of effectiveAuthorizations) {
    const byId =
      gasFirmsByProjectFirm.get(authorization.projectFirmId) ??
      new Map<number, ProjectFirmGasFirm>()

    // Aynı çift için yenilenmiş belge iki satır olabiliyor (S6); firma tek görünmeli.
    byId.set(authorization.gasDistributionFirmId, {
      id: authorization.gasDistributionFirmId,
      name: authorization.gasDistributionFirmName,
    })
    gasFirmsByProjectFirm.set(authorization.projectFirmId, byId)
  }

  return firms.map((firm) => ({
    ...firm,
    gasFirms: [...(gasFirmsByProjectFirm.get(firm.id)?.values() ?? [])].sort((left, right) =>
      left.name.localeCompare(right.name, 'tr'),
    ),
  }))
}

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
export function queryProjectFirmList<TFirm extends ProjectFirm>(
  firms: TFirm[],
  query: ProjectFirmQuery,
): { items: TFirm[]; totalCount: number } {
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
