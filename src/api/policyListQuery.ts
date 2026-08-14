import type { PagedResult } from './listQuery'
import type { PolicyListQuery, PolicyRow } from './policies'
import { includesTr } from './turkishText'

/**
 * Sunucunun yapması GEREKEN işi taklit eder: filtre → sırala → SADECE istenen
 * sayfayı dilimle. Saf fonksiyon, testi `__tests__/policyListQuery.test.ts`.
 *
 * Uç açıldığında bu dosya silinir ve çağıran taraf değişmez; bugün burada
 * durması, istemcinin diziyi dilimlediği anlamına gelmiyor — mock sözleşmenin
 * sunucu tarafını oynuyor (`documentListQuery` deseni).
 */
export function queryPolicyList(
  policies: PolicyRow[],
  query: PolicyListQuery,
): PagedResult<PolicyRow> {
  const matched = policies.filter((policy) => matchesQuery(policy, query))
  const sorted = [...matched].sort((left, right) => comparePolicies(left, right, query))
  const offset = (query.page - 1) * query.pageSize

  return {
    items: sorted.slice(offset, offset + query.pageSize),
    totalCount: matched.length,
    page: query.page,
    pageSize: query.pageSize,
  }
}

function matchesQuery(policy: PolicyRow, query: PolicyListQuery): boolean {
  if (
    query.insuranceCompanyId !== null &&
    policy.insuranceCompanyId !== query.insuranceCompanyId
  ) {
    return false
  }

  if (query.search === '') return true

  // `includesTr` şart: 'İ'.toLowerCase() birleşen nokta üretip eşleşmeyi
  // sessizce kaçırıyor (knowledge/turkish-collation).
  const projectName = policy.projectName ?? ''
  return includesTr(policy.policyNumber, query.search) || includesTr(projectName, query.search)
}

function comparePolicies(left: PolicyRow, right: PolicyRow, query: PolicyListQuery): number {
  const direction = query.sortDir === 'asc' ? 1 : -1

  if (query.sortBy === 'policyNumber') {
    return left.policyNumber.localeCompare(right.policyNumber, 'tr') * direction
  }

  // Aynı güne düşen poliçeler sırasız kalmasın: tarih saat taşımıyor ve
  // eşitlikte kimlik ayırmazsa aynı satır iki sayfada birden görünebilir.
  const byDate = left.startDate.localeCompare(right.startDate) * direction
  return byDate === 0 ? (left.id - right.id) * direction : byDate
}
