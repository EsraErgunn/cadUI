import type { Lookup } from '../../../api/projects'
import type { AppliedFilter } from '../FilterChips'
import { lastMonthRange } from '../adminDateRange'
import type { ProjectFilters } from './useProjectListParams'

/** Seçim kutusu kaynağı henüz gelmediyse etiket kimliği değil bunu gösterir:
    kullanıcıya iç kimlik sızmasın, etiket yine de kaldırılabilir kalsın. */
const PENDING_LOOKUP_LABEL = '…'

/**
 * yyyy-aa-gg → gg.aa.yyyy. `new Date(iso)` üzerinden gidilmiyor: yalnız tarih
 * içeren metin UTC gece yarısı sayılır ve yerel saat diliminde günü kaydırabilir.
 */
function toDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}

function findLookupName(lookups: Lookup[], id: number): string {
  return lookups.find((lookup) => lookup.id === id)?.name ?? PENDING_LOOKUP_LABEL
}

interface ProjectFilterChipsOptions {
  filters: ProjectFilters
  districts: Lookup[]
  projectFirms: Lookup[]
  onApply: (filters: ProjectFilters) => void
}

/**
 * Üst bardaki "Bölge" bilerek listelenmez: o, sayfanın filtre çubuğuna ait
 * değil — kapsam seçimi zaten üst barda görünür duruyor.
 */
export function buildProjectFilterChips({
  filters,
  districts,
  projectFirms,
  onApply,
}: ProjectFilterChipsOptions): AppliedFilter[] {
  const applied: AppliedFilter[] = []
  const defaultRange = lastMonthRange(new Date())
  const hasDateRange = filters.dateFrom !== '' && filters.dateTo !== ''
  const isDefaultRange =
    filters.dateFrom === defaultRange.from && filters.dateTo === defaultRange.to

  // Varsayılan aralık (son bir ay) filtre sayılmaz — URL'e de yazılmıyor.
  if (hasDateRange && !isDefaultRange) {
    applied.push({
      key: 'date',
      label: 'Tarih',
      value: `${toDisplayDate(filters.dateFrom)} – ${toDisplayDate(filters.dateTo)}`,
      onRemove: () =>
        onApply({ ...filters, dateFrom: defaultRange.from, dateTo: defaultRange.to }),
    })
  }

  const districtId = filters.districtId
  if (districtId !== null) {
    applied.push({
      key: 'district',
      label: 'İlçe',
      value: findLookupName(districts, districtId),
      onRemove: () => onApply({ ...filters, districtId: null }),
    })
  }

  const projectFirmId = filters.projectFirmId
  if (projectFirmId !== null) {
    applied.push({
      key: 'firm',
      label: 'Proje Firması',
      value: findLookupName(projectFirms, projectFirmId),
      onRemove: () => onApply({ ...filters, projectFirmId: null }),
    })
  }

  if (filters.search !== '') {
    applied.push({
      key: 'q',
      label: 'Arama',
      value: filters.search,
      onRemove: () => onApply({ ...filters, search: '' }),
    })
  }

  return applied
}
