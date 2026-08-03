import { Funnel } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import type { Lookup } from '../../../api/projects'
import { FilterSelect, type FilterSelectOption } from '../FilterSelect'
import { adminButtonVariants, adminFieldVariants } from '../adminVariants'
import type { ProjectFilters } from './useProjectListParams'

const SEARCH_FIELD = 'projectSearch'
const SEARCH_PLACEHOLDER = 'Proje Ara...'
const SEARCH_LABEL = 'Proje adı, P_ID veya tesisat numarasında ara'
const ANY_OPTION_LABEL = 'Tümü'

function toOptions(lookups: Lookup[]): FilterSelectOption[] {
  return lookups.map((lookup) => ({ value: String(lookup.id), label: lookup.name }))
}

function toLookupId(raw: string | null): number | null {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) ? parsed : null
}

interface ProjectFilterBarProps {
  /** URL'de uygulanmış olan değerler; taslak durumun başlangıcı. */
  filters: ProjectFilters
  districts: Lookup[]
  projectFirms: Lookup[]
  onApply: (filters: ProjectFilters) => void
}

/**
 * Filtre çubuğu kendi TASLAK durumunu tutar; istek yalnız "Filtrele" ile veya
 * arama alanında Enter ile atılır (her tuş vuruşunda değil).
 *
 * Taslak durum prop değişince kendiliğinden tazelenmez — dışarıdan gelen değişimi
 * (geri tuşu, filtre etiketi kaldırma) yansıtmak için sayfa bu bileşeni uygulanmış
 * filtrelerden türetilen bir `key` ile kurar. Arama kutusu ayrıca `defaultValue` +
 * `key` deseniyle çalışıyor (bkz. FirmTableToolbar).
 */
export function ProjectFilterBar({
  filters,
  districts,
  projectFirms,
  onApply,
}: ProjectFilterBarProps) {
  const [dateFrom, setDateFrom] = useState(filters.dateFrom)
  const [dateTo, setDateTo] = useState(filters.dateTo)
  const [districtId, setDistrictId] = useState(filters.districtId)
  const [projectFirmId, setProjectFirmId] = useState(filters.projectFirmId)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const rawSearch = new FormData(event.currentTarget).get(SEARCH_FIELD)

    onApply({
      dateFrom,
      dateTo,
      districtId,
      projectFirmId,
      search: typeof rawSearch === 'string' ? rawSearch.trim() : '',
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Proje filtreleri"
      className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-4
                 md:flex-row md:flex-wrap md:items-end"
    >
      <fieldset className="flex min-w-0 flex-col gap-1 border-0 p-0">
        <legend className="mb-1 text-xs font-medium text-ink-muted">Tarih Aralığı</legend>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            // Başlangıç bitişi geçemesin: geçersiz aralık isteğe hiç çıkmasın.
            max={dateTo}
            aria-label="Başlangıç tarihi"
            onChange={(event) => setDateFrom(event.target.value)}
            className={adminFieldVariants()}
          />
          <span aria-hidden className="text-ink-muted">
            –
          </span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            aria-label="Bitiş tarihi"
            onChange={(event) => setDateTo(event.target.value)}
            className={adminFieldVariants()}
          />
        </div>
      </fieldset>

      <FilterSelect
        id="project-filter-district"
        label="İlçe"
        emptyLabel={ANY_OPTION_LABEL}
        value={districtId === null ? null : String(districtId)}
        options={toOptions(districts)}
        onChange={(value) => setDistrictId(toLookupId(value))}
      />

      <FilterSelect
        id="project-filter-firm"
        label="Proje Firması"
        emptyLabel={ANY_OPTION_LABEL}
        value={projectFirmId === null ? null : String(projectFirmId)}
        options={toOptions(projectFirms)}
        onChange={(value) => setProjectFirmId(toLookupId(value))}
      />

      <div className="flex min-w-56 flex-1 flex-col gap-1">
        <label htmlFor="project-filter-search" className="text-xs font-medium text-ink-muted">
          Proje Ara
        </label>
        <input
          id="project-filter-search"
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
