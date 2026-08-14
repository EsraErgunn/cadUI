import { Funnel } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import type { InsuranceCompany } from '../../../api/policies'
import { FilterSelect, type FilterSelectOption } from '../FilterSelect'
import { adminButtonVariants, adminFieldVariants } from '../adminVariants'
import type { PolicyFilters } from './usePolicyListParams'

const SEARCH_FIELD = 'policySearch'
const SEARCH_LABEL = 'Poliçe numarası veya proje adında ara'
const SEARCH_PLACEHOLDER = 'Poliçe No / Proje Ara'
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
 * Filtre çubuğu kendi TASLAK durumunu tutar; istek yalnız "Filtrele" ile veya
 * arama alanında Enter ile atılır (evrak listesindeki desenin aynısı, K47).
 *
 * Taslak durum prop değişince kendiliğinden tazelenmez — dışarıdan gelen değişimi
 * (geri tuşu, filtre etiketi kaldırma) yansıtmak için sayfa bu bileşeni uygulanmış
 * filtrelerden türetilen bir `key` ile kurar.
 */
export function PolicyFilterBar({ filters, companies, onApply }: PolicyFilterBarProps) {
  const [insuranceCompanyId, setInsuranceCompanyId] = useState(filters.insuranceCompanyId)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const rawSearch = new FormData(event.currentTarget).get(SEARCH_FIELD)

    onApply({
      insuranceCompanyId,
      search: typeof rawSearch === 'string' ? rawSearch.trim() : '',
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Poliçe filtreleri"
      className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-4
                 md:flex-row md:flex-wrap md:items-end"
    >
      <FilterSelect
        id="policy-filter-company"
        label="Sigorta Şirketi"
        emptyLabel={ANY_OPTION_LABEL}
        value={insuranceCompanyId === null ? null : String(insuranceCompanyId)}
        options={toCompanyOptions(companies)}
        onChange={(value) => setInsuranceCompanyId(toLookupId(value))}
      />

      <div className="flex min-w-56 flex-1 flex-col gap-1">
        <label htmlFor="policy-filter-search" className="text-xs font-medium text-ink-muted">
          Poliçe Ara
        </label>
        <input
          id="policy-filter-search"
          type="search"
          name={SEARCH_FIELD}
          defaultValue={filters.search}
          aria-label={SEARCH_LABEL}
          placeholder={SEARCH_PLACEHOLDER}
          className={adminFieldVariants()}
        />
      </div>

      <button
        type="submit"
        className={adminButtonVariants({ tone: 'secondary', className: 'w-full md:w-auto' })}
      >
        <Funnel aria-hidden className="size-4" />
        Filtrele
      </button>
    </form>
  )
}
