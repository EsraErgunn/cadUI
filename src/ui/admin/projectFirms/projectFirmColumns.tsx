import { Link } from 'react-router-dom'

import type { ProjectFirm, ProjectFirmSortKey } from '../../../api/projectFirms'
import { formatPhone, isValidPhone, toPhoneDigits } from '../../../core/phone'
import type { DataTableColumn } from '../DataTable'
import { gasFirmUpdatePath, projectFirmUpdatePath } from '../adminNavItems'
import { ADMIN_CELL_LINK } from '../adminVariants'

export const PROJECT_FIRM_TABLE_CAPTION =
  'Proje firmaları listesi. Firma Adı ve Yetkili başlıkları sıralamayı değiştirir.'

/** Sekiz sütun dar ekrana sığmaz; bu eşiğin altında tablo yatay kayar (4.5). */
export const PROJECT_FIRM_TABLE_MIN_WIDTH = 'min-w-280'

const MISSING_VALUE_LABEL = '-'

/**
 * Hücre çiziciler bilerek BİLEŞEN değil, düz fonksiyon: dosya sütun dizisini de
 * dışa aktardığı için bileşen tanımı fast refresh'i bozuyor
 * (react-refresh/only-export-components). Çıktı aynı.
 */
function renderMissingValue() {
  return <span className="text-ink-disabled">{MISSING_VALUE_LABEL}</span>
}

function renderPhone(value: string | null) {
  if (value === null || value === '') return renderMissingValue()

  const digits = toPhoneDigits(value)
  // Sunucudaki numara maskeye uymayabilir (dahili hat, eski kayıt): uymuyorsa
  // ham metin gösterilir, uydurma bir biçim dayatılmaz ve bağlantı kurulmaz.
  if (!isValidPhone(digits)) return <span>{value}</span>

  return (
    <a href={`tel:${digits}`} className={ADMIN_CELL_LINK}>
      {formatPhone(digits)}
    </a>
  )
}

function renderEmail(value: string | null) {
  if (value === null || value === '') return renderMissingValue()

  return (
    <a href={`mailto:${value}`} className={ADMIN_CELL_LINK}>
      {value}
    </a>
  )
}

/**
 * Sütun sırası gereksinim 4.5'ten birebir alındı.
 *
 * `Seri No`, `Yeter No`, `Gsm` ve `G.D. Firması` bugün HER SATIRDA "-" gösterir:
 * ilk üçü liste ucunda yok (ikisi yalnız detay yanıtında), sonuncusunu üreten
 * hiçbir uç yok. Sütunlar yine de duruyor ki uç genişleyince yalnız
 * `projectFirmDto.ts`'teki eşleme değişsin (bkz. o dosyadaki TODO).
 */
export const PROJECT_FIRM_COLUMNS: DataTableColumn<ProjectFirm, ProjectFirmSortKey>[] = [
  {
    key: 'serialNumber',
    label: 'Seri No',
    // Salt okunur kimlik bilgisi: gereksinim 4.5 soluk gösterilmesini istiyor.
    cellClassName: 'tabular-nums text-ink-muted',
    cell: (firm) =>
      firm.serialNumber === null ? renderMissingValue() : firm.serialNumber,
  },
  {
    key: 'qualificationNumber',
    label: 'Yeter No',
    cellClassName: 'tabular-nums text-ink-muted',
    cell: (firm) =>
      firm.qualificationNumber === null ? renderMissingValue() : firm.qualificationNumber,
  },
  {
    key: 'name',
    label: 'Firma Adı',
    sortKey: 'name',
    cell: (firm) => (
      <Link to={projectFirmUpdatePath(firm.id)} className={ADMIN_CELL_LINK}>
        {firm.name}
      </Link>
    ),
  },
  {
    key: 'gasFirm',
    label: 'G.D. Firması',
    cell: (firm) =>
      firm.gasFirm === null ? (
        renderMissingValue()
      ) : (
        <Link to={gasFirmUpdatePath(firm.gasFirm.id)} className={ADMIN_CELL_LINK}>
          {firm.gasFirm.name}
        </Link>
      ),
  },
  {
    key: 'authorizedPerson',
    label: 'Yetkili',
    sortKey: 'authorizedPerson',
    cell: (firm) =>
      firm.authorizedPerson === null ? renderMissingValue() : firm.authorizedPerson,
  },
  {
    key: 'email',
    label: 'E-Mail',
    cell: (firm) => renderEmail(firm.email),
  },
  {
    key: 'phone',
    label: 'Telefon',
    cellClassName: 'tabular-nums',
    cell: (firm) => renderPhone(firm.phone),
  },
  {
    key: 'mobilePhone',
    label: 'Gsm',
    cellClassName: 'tabular-nums',
    cell: (firm) => renderPhone(firm.mobilePhone),
  },
]
