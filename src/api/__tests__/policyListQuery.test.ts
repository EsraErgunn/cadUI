import { describe, expect, it } from 'vitest'

import type { PolicyListQuery, PolicyRow } from '../policies'
import { queryPolicyList } from '../policyListQuery'

const BASE_QUERY: PolicyListQuery = {
  search: '',
  insuranceCompanyId: null,
  page: 1,
  pageSize: 2,
  sortBy: 'startDate',
  sortDir: 'desc',
}

function buildPolicy(overrides: Partial<PolicyRow> & { id: number }): PolicyRow {
  return {
    policyNumber: `POL-${overrides.id}`,
    insuranceCompanyId: 1,
    insuranceCompanyName: 'Anadolu Sigorta',
    agencyName: 'Örnek Acente',
    method: 'manual',
    amount: 1000,
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    projectId: 10,
    projectName: 'Yıldız Apartmanı',
    projectPId: '30006185',
    ...overrides,
  }
}

const POLICIES: PolicyRow[] = [
  buildPolicy({ id: 1, policyNumber: 'POL-A', startDate: '2026-01-10' }),
  buildPolicy({
    id: 2,
    policyNumber: 'POL-B',
    startDate: '2026-03-10',
    insuranceCompanyId: 2,
    projectName: 'İSTASYON Sitesi',
  }),
  buildPolicy({ id: 3, policyNumber: 'POL-C', startDate: '2026-02-10', projectName: null }),
]

describe('queryPolicyList', () => {
  it('yalnızca istenen sayfayı döner, toplam filtrelenmiş adedi taşır', () => {
    const result = queryPolicyList(POLICIES, BASE_QUERY)

    expect(result.items).toHaveLength(2)
    expect(result.totalCount).toBe(3)
    expect(result.page).toBe(1)
  })

  it('varsayılan sırada en yeni başlangıç üstte', () => {
    const result = queryPolicyList(POLICIES, { ...BASE_QUERY, pageSize: 3 })

    expect(result.items.map((policy) => policy.id)).toEqual([2, 3, 1])
  })

  it('poliçe numarasına göre Türkçe sıralar', () => {
    const result = queryPolicyList(POLICIES, {
      ...BASE_QUERY,
      pageSize: 3,
      sortBy: 'policyNumber',
      sortDir: 'asc',
    })

    expect(result.items.map((policy) => policy.policyNumber)).toEqual(['POL-A', 'POL-B', 'POL-C'])
  })

  it('sigorta şirketi filtresi kimliğe göre süzer', () => {
    const result = queryPolicyList(POLICIES, { ...BASE_QUERY, insuranceCompanyId: 2 })

    expect(result.items.map((policy) => policy.id)).toEqual([2])
    expect(result.totalCount).toBe(1)
  })

  it('arama poliçe numarasını da proje adını da kapsar', () => {
    expect(queryPolicyList(POLICIES, { ...BASE_QUERY, search: 'pol-b' }).items).toHaveLength(1)
    expect(
      queryPolicyList(POLICIES, { ...BASE_QUERY, search: 'Yıldız' }).items.map((p) => p.id),
    ).toEqual([1])
  })

  /** 'İ'.toLowerCase() birleşen nokta üretiyor; `includesTr` olmadan bu arama
      sessizce boş dönerdi (knowledge/turkish-collation). */
  it('Türkçe büyük İ ile arama eşleşir', () => {
    const result = queryPolicyList(POLICIES, { ...BASE_QUERY, search: 'istasyon' })

    expect(result.items.map((policy) => policy.id)).toEqual([2])
  })

  it('proje adı olmayan satır aramada patlamaz', () => {
    expect(queryPolicyList(POLICIES, { ...BASE_QUERY, search: 'POL-C' }).items).toHaveLength(1)
  })
})
