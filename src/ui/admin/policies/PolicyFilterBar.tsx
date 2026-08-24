import { useRef, useState } from 'react'

import type { InsuranceCompany } from '../../../api/policies'
import { FilterSelect, type FilterSelectOption } from '../FilterSelect'
import { adminFieldVariants } from '../adminVariants'
import type { PolicyFilters } from './usePolicyListParams'

const SEARCH_FIELD = 'policySearch'
/**
 * Kapsam SUNUCUNUN aradığı alanlar: poliçe numarası, birim numarası, abone
 * numarası. Etiket bir süre "proje adında ara" diyordu ama uç proje adında
 * ARAMIYOR — kullanıcı proje adı yazıp boş sonuç alıyordu.
 */
const SEARCH_LABEL = 'Poliçe no, birim no veya abone numarasında ara'
const SEARCH_PLACEHOLDER = 'Poliçe No / Birim No / Abone No'
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
 * Seçim yapılır yapılmaz uygulanır ("Filtrele" düğmesi KALKTI); arama Enter'da.
 * Evrak ve proje listeleriyle aynı desen.
 *
 * Taslak durum prop değişince kendiliğinden tazelenmez — dışarıdan gelen değişimi
 * (geri tuşu, filtre etiketi kaldırma) yansıtmak için sayfa bu bileşeni uygulanmış
 * filtrelerden türetilen bir `key` ile kurar.
 */
export function PolicyFilterBar({ filters, companies, onApply }: PolicyFilterBarProps) {
  const [insuranceCompanyId, setInsuranceCompanyId] = useState(filters.insuranceCompanyId)
  const searchRef = useRef<HTMLInputElement>(null)

  const applyNow = (changed: Partial<PolicyFilters>) => {
    onApply({
      insuranceCompanyId,
      search: searchRef.current?.value.trim() ?? filters.search,
      ...changed,
    })
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

      <div className="flex min-w-56 flex-1 flex-col gap-1">
        <label htmlFor="policy-filter-search" className="text-xs font-medium text-ink-muted">
          Poliçe Ara
        </label>
        <input
          ref={searchRef}
          id="policy-filter-search"
          type="search"
          name={SEARCH_FIELD}
          defaultValue={filters.search}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            applyNow({ search: event.currentTarget.value.trim() })
          }}
          aria-label={SEARCH_LABEL}
          placeholder={SEARCH_PLACEHOLDER}
          className={adminFieldVariants()}
        />
      </div>
    </div>
  )
}
