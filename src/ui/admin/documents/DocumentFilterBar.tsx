import { useState } from 'react'

import type { DocumentType } from '../../../api/documentTypes'
import type { Lookup } from '../../../api/projects'
import { FilterSelect, type FilterSelectOption } from '../FilterSelect'
import { adminFieldVariants } from '../adminVariants'
import type { DocumentFilters } from './useDocumentListParams'

const ANY_OPTION_LABEL = 'Tümü'

function toFirmOptions(lookups: Lookup[]): FilterSelectOption[] {
  return lookups.map((lookup) => ({ value: String(lookup.id), label: lookup.name }))
}

function toTypeOptions(types: DocumentType[]): FilterSelectOption[] {
  return types.map((type) => ({ value: type.code, label: type.label }))
}

function toLookupId(raw: string | null): number | null {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) ? parsed : null
}

interface DocumentFilterBarProps {
  /** URL'de uygulanmış olan değerler; taslak durumun başlangıcı. */
  filters: DocumentFilters
  documentTypes: DocumentType[]
  projectFirms: Lookup[]
  /**
   * Yönetim görünümü mü. "Proje Firması" süzgeci YALNIZ orada anlamlı: proje
   * firması kullanıcısının listesi zaten tek firmaya ait.
   */
  isManagementView: boolean
  onApply: (filters: DocumentFilters) => void
}

/**
 * Seçim yapılır yapılmaz uygulanır ("Filtrele" düğmesi KALKTI); arama Enter'da.
 * Proje listesindeki desenin aynısı — iki liste ayrışmasın.
 *
 * Taslak durum prop değişince kendiliğinden tazelenmez — dışarıdan gelen değişimi
 * (geri tuşu, filtre etiketi kaldırma) yansıtmak için sayfa bu bileşeni uygulanmış
 * filtrelerden türetilen bir `key` ile kurar.
 */
export function DocumentFilterBar({
  filters,
  documentTypes,
  projectFirms,
  isManagementView,
  onApply,
}: DocumentFilterBarProps) {
  const [dateFrom, setDateFrom] = useState(filters.dateFrom)
  const [dateTo, setDateTo] = useState(filters.dateTo)
  const [docTypeCode, setDocTypeCode] = useState(filters.docTypeCode)
  const [projectFirmId, setProjectFirmId] = useState(filters.projectFirmId)
  // Kontrolsüz arama kutusu; değeri uygulama anında ref'ten okunuyor ki seçim

  const applyNow = (changed: Partial<DocumentFilters>) => {
    onApply({
      dateFrom,
      dateTo,
      docTypeCode,
      projectFirmId,
      ...changed,
    })
  }

  return (
    <div
      aria-label="Evrak filtreleri"
      role="group"
      className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-4
                 md:flex-row md:flex-wrap md:items-end"
    >
      <fieldset className="flex min-w-0 flex-col gap-1 border-0 p-0 md:min-w-72 md:flex-1">
        <legend className="mb-1 text-xs font-medium text-ink-muted">Tarih Aralığı</legend>
        {/* `min-w-0 flex-1`: `input[type=date]` içeriğine göre ~150 px'lik bir
            asgari genişlik dayatıyor, iki kutu 375 px ekranda kabı taşırıyordu. */}
        <div className="flex min-w-0 items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            // Başlangıç bitişi geçemesin: geçersiz aralık isteğe hiç çıkmasın.
            max={dateTo}
            aria-label="Başlangıç tarihi"
            onChange={(event) => {
              setDateFrom(event.target.value)
              applyNow({ dateFrom: event.target.value })
            }}
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
            onChange={(event) => {
              setDateTo(event.target.value)
              applyNow({ dateTo: event.target.value })
            }}
            className={adminFieldVariants({ className: 'min-w-0 flex-1' })}
          />
        </div>
      </fieldset>

      <FilterSelect
        id="document-filter-type"
        label="Döküman Tipi"
        emptyLabel={ANY_OPTION_LABEL}
        value={docTypeCode}
        options={toTypeOptions(documentTypes)}
        onChange={(value) => {
          setDocTypeCode(value)
          applyNow({ docTypeCode: value })
        }}
      />

      {isManagementView && (
        <FilterSelect
          id="document-filter-firm"
          label="Proje Firması"
          emptyLabel={ANY_OPTION_LABEL}
          value={projectFirmId === null ? null : String(projectFirmId)}
          options={toFirmOptions(projectFirms)}
          onChange={(value) => {
            const nextFirmId = toLookupId(value)
            setProjectFirmId(nextFirmId)
            applyNow({ projectFirmId: nextFirmId })
          }}
        />
      )}

    </div>
  )
}
