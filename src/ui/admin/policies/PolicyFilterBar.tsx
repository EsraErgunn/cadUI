import { useState } from 'react'

import type { InsuranceCompany } from '../../../api/policies'
import { FilterSelect, type FilterSelectOption } from '../FilterSelect'
import type { PolicyFilters } from './usePolicyListParams'

const ANY_OPTION_LABEL = 'Tümü'

function toCompanyOptions(companies: InsuranceCompany[]): FilterSelectOption[] {
  return companies.map((company) => ({ value: String(company.id), label: company.name }))
}

function toLookupId(raw: string | null): number | null {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) ? parsed : null
}

interface PolicyFilterBarProps {
  /** URL'de uygulanmış olan değerler; taslak durumun başlangıcı. */
  filters: PolicyFilters
  companies: InsuranceCompany[]
  onApply: (filters: PolicyFilters) => void
}

/**
 * Seçim yapılır yapılmaz uygulanır ("Filtrele" düğmesi KALKTI). Arama kutusu
 * YOK — "Poliçe Ara" kaldırıldı, bu adla yeni alan eklenmez.
 *
 * Taslak durum prop değişince kendiliğinden tazelenmez — dışarıdan gelen değişimi
 * (geri tuşu, filtre etiketi kaldırma) yansıtmak için sayfa bu bileşeni uygulanmış
 * filtrelerden türetilen bir `key` ile kurar.
 */
export function PolicyFilterBar({ filters, companies, onApply }: PolicyFilterBarProps) {
  const [insuranceCompanyId, setInsuranceCompanyId] = useState(filters.insuranceCompanyId)

  const applyNow = (changed: Partial<PolicyFilters>) => {
    onApply({ insuranceCompanyId, ...changed })
  }

  return (
    <div
      aria-label="Poliçe filtreleri"
      role="group"
      className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-4
                 md:flex-row md:flex-wrap md:items-end"
    >
      <FilterSelect
        id="policy-filter-company"
        label="Sigorta Şirketi / Poliçe Firması"
        emptyLabel={ANY_OPTION_LABEL}
        value={insuranceCompanyId === null ? null : String(insuranceCompanyId)}
        options={toCompanyOptions(companies)}
        onChange={(value) => {
          const nextCompanyId = toLookupId(value)
          setInsuranceCompanyId(nextCompanyId)
          applyNow({ insuranceCompanyId: nextCompanyId })
        }}
      />
    </div>
  )
}
