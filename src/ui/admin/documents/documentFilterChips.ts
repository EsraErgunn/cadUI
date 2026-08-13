import { resolveDocumentTypeLabel, type DocumentType } from '../../../api/documentTypes'
import type { Lookup } from '../../../api/projects'
import type { AppliedFilter } from '../FilterChips'
import { lastMonthRange } from '../adminDateRange'
import type { DocumentFilters } from './useDocumentListParams'

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

interface DocumentFilterChipsOptions {
  filters: DocumentFilters
  documentTypes: DocumentType[]
  projectFirms: Lookup[]
  onApply: (filters: DocumentFilters) => void
}

export function buildDocumentFilterChips({
  filters,
  documentTypes,
  projectFirms,
  onApply,
}: DocumentFilterChipsOptions): AppliedFilter[] {
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

  const docTypeCode = filters.docTypeCode
  if (docTypeCode !== null) {
    applied.push({
      key: 'type',
      label: 'Döküman Tipi',
      value: resolveDocumentTypeLabel(docTypeCode, documentTypes),
      onRemove: () => onApply({ ...filters, docTypeCode: null }),
    })
  }

  const projectFirmId = filters.projectFirmId
  if (projectFirmId !== null) {
    applied.push({
      key: 'firm',
      label: 'Proje Firması',
      value:
        projectFirms.find((firm) => firm.id === projectFirmId)?.name ?? PENDING_LOOKUP_LABEL,
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
