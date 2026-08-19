import { useQuery } from '@tanstack/react-query'
import { Funnel } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { getCities, getCityDistricts, type Lookup } from '../../../api/projects'
import { FilterSelect, type FilterSelectOption } from '../FilterSelect'
import { adminButtonVariants, adminFieldVariants } from '../adminVariants'
import type { ProjectFilters } from './useProjectListParams'

const SEARCH_FIELD = 'projectSearch'
const SEARCH_PLACEHOLDER = 'Proje Ara...'
const SEARCH_LABEL = 'Proje adı, P_ID veya tesisat numarasında ara'
const ANY_OPTION_LABEL = 'Tümü'
/** İl seçilmeden ilçe listesi ÇEKİLEMİYOR: uç il kimliği istiyor. */
const NO_CITY_LABEL = 'Önce il seçiniz'
const FIRM_ERROR_HINT = 'Firma listesi yüklenemedi.'

/** İl ve ilçe listeleri oturum boyunca değişmez (seeder ile sabit). */
export const LOCATION_STALE_MS = 60 * 60 * 1000

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
  /** `GET /api/projectfirms`ten gelen kimlik + unvan çiftleri. */
  projectFirms: Lookup[]
  /** Liste çekilemedi mi — kutu boş açılıp "firma yok" sanısı vermesin. */
  haveProjectFirmsFailed?: boolean
  onApply: (filters: ProjectFilters) => void
}

/**
 * Filtre çubuğu kendi TASLAK durumunu tutar; istek yalnız "Filtrele" ile veya
 * arama alanında Enter ile atılır (her tuş vuruşunda değil).
 *
 * İl ve ilçe listeleri BURADA çekiliyor, sayfadan prop olarak gelmiyor: ilçe
 * listesi TASLAK ildeki seçime bağlı (kullanıcı ili değiştirip henüz
 * "Filtrele"ye basmamışken de doğru ilçeleri görmeli).
 *
 * Taslak durum prop değişince kendiliğinden tazelenmez — dışarıdan gelen değişimi
 * (geri tuşu, filtre etiketi kaldırma) yansıtmak için sayfa bu bileşeni uygulanmış
 * filtrelerden türetilen bir `key` ile kurar. Arama kutusu ayrıca `defaultValue` +
 * `key` deseniyle çalışıyor (bkz. FirmTableToolbar).
 */
export function ProjectFilterBar({
  filters,
  projectFirms,
  haveProjectFirmsFailed = false,
  onApply,
}: ProjectFilterBarProps) {
  const [dateFrom, setDateFrom] = useState(filters.dateFrom)
  const [dateTo, setDateTo] = useState(filters.dateTo)
  const [cityId, setCityId] = useState(filters.cityId)
  const [districtId, setDistrictId] = useState(filters.districtId)
  const [projectFirmId, setProjectFirmId] = useState(filters.projectFirmId)

  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: ({ signal }) => getCities(signal),
    staleTime: LOCATION_STALE_MS,
  })

  const { data: districts, isPending: areDistrictsPending } = useQuery({
    queryKey: ['districts', cityId],
    queryFn: ({ signal }) => getCityDistricts(cityId ?? 0, signal),
    // İl seçilmeden istek ATILMAZ: uç kimliksiz ilçe listesi vermiyor.
    enabled: cityId !== null,
    staleTime: LOCATION_STALE_MS,
  })

  const handleCityChange = (raw: string | null) => {
    setCityId(toLookupId(raw))
    // İl değişti: eski ilçe yeni ilin listesinde bulunmayabilir.
    setDistrictId(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const rawSearch = new FormData(event.currentTarget).get(SEARCH_FIELD)

    onApply({
      dateFrom,
      dateTo,
      cityId,
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
      <fieldset className="flex min-w-0 flex-col gap-1 border-0 p-0 md:min-w-72 md:flex-1">
        <legend className="mb-1 text-xs font-medium text-ink-muted">Tarih Aralığı</legend>
        {/* `min-w-0 flex-1` şart: `input[type=date]` içeriğine göre ~150 px'lik
            bir asgari genişlik dayatıyor ve iki kutu + ayraç 375 px ekranda
            kabı taşırıyordu. Esneyince ikisi kalan alanı paylaşıyor. */}
        <div className="flex min-w-0 items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            // Başlangıç bitişi geçemesin: geçersiz aralık isteğe hiç çıkmasın.
            max={dateTo}
            aria-label="Başlangıç tarihi"
            onChange={(event) => setDateFrom(event.target.value)}
            className={adminFieldVariants({ className: 'min-w-0 flex-1' })}
          />
          <span aria-hidden className="shrink-0 text-ink-muted">
            –
          </span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            aria-label="Bitiş tarihi"
            onChange={(event) => setDateTo(event.target.value)}
            className={adminFieldVariants({ className: 'min-w-0 flex-1' })}
          />
        </div>
      </fieldset>

      <FilterSelect
        id="project-filter-city"
        label="İl"
        emptyLabel={ANY_OPTION_LABEL}
        value={cityId === null ? null : String(cityId)}
        options={toOptions(cities ?? [])}
        onChange={handleCityChange}
      />

      <FilterSelect
        id="project-filter-district"
        label="İlçe"
        emptyLabel={cityId === null ? NO_CITY_LABEL : ANY_OPTION_LABEL}
        value={districtId === null ? null : String(districtId)}
        options={toOptions(districts ?? [])}
        isDisabled={cityId === null || areDistrictsPending}
        onChange={(value) => setDistrictId(toLookupId(value))}
      />

      <FilterSelect
        id="project-filter-firm"
        label="Proje Firması"
        emptyLabel={ANY_OPTION_LABEL}
        value={projectFirmId === null ? null : String(projectFirmId)}
        options={toOptions(projectFirms)}
        isDisabled={haveProjectFirmsFailed}
        hint={haveProjectFirmsFailed ? FIRM_ERROR_HINT : undefined}
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
