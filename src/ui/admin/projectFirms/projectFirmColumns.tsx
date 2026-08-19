import { Link } from 'react-router-dom'

import { ProjectFirmRowActions } from './ProjectFirmRowActions'
import type { ProjectFirmGasFirm } from '../../../api/projectFirmDto'
import type { ProjectFirmRow } from '../../../api/projectFirmListQuery'
import type { ProjectFirm, ProjectFirmSortKey } from '../../../api/projectFirms'
import { formatPhone, isValidPhone, toPhoneDigits } from '../../../core/phone'
import type { DataTableColumn } from '../DataTable'
import { EmptyValue } from '../EmptyValue'
import { gasFirmUpdatePath, projectFirmUpdatePath } from '../adminNavItems'
import { ADMIN_CELL_LINK } from '../adminVariants'

export const PROJECT_FIRM_TABLE_CAPTION =
  'Proje firmaları listesi. Firma Adı ve Yetkili başlıkları sıralamayı değiştirir.'

/** Beş veri sütunu + İşlemler dar ekrana sığmaz; bu eşiğin altında tablo
    yatay kayar (4.5). Kaydırma kabı `DataTable`'da, gövde düzeyinde DEĞİL.
    Üç sütun kalkınca eşik 320'den 240'a indi (K102). */
export const PROJECT_FIRM_TABLE_MIN_WIDTH = 'min-w-240'

/**
 * Eylem sütunu içeriği kadar dursun; artan genişlik metin sütunlarına gitsin
 * (proje listesindeki `NARROW_COLUMN_CLASS` ile aynı gerekçe).
 */
const NARROW_COLUMN_CLASS = 'w-px whitespace-nowrap'

/**
 * Hücre çiziciler bilerek BİLEŞEN değil, düz fonksiyon: dosya sütun dizisini de
 * dışa aktardığı için bileşen tanımı fast refresh'i bozuyor
 * (react-refresh/only-export-components). Çıktı aynı.
 *
 * Boş hücre projenin ortak `EmptyValue`'suna bağlandı: buradaki yerel tire
 * ekran okuyucuya "-" diye okunuyordu, ortak bileşen işareti `aria-hidden`
 * yapıp yerine "Değer yok" veriyor.
 */
function renderMissingValue() {
  return <EmptyValue />
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
 * Bir firma birden fazla gaz dağıtım firmasında yetkili olabiliyor; hepsi ALT
 * ALTA listeleniyor.
 *
 * Virgülle yan yana dizilmedi: her ad ayrı bir bağlantı hedefi ve virgülle
 * ayrılmış bağlantılar hem gözle hem ekran okuyucuda tek bağlantıya benziyor.
 * `<ul>` ayrıca öğe sayısını okuyucuya duyuruyor.
 */
function renderGasFirms(gasFirms: ProjectFirmGasFirm[]) {
  if (gasFirms.length === 0) return renderMissingValue()

  return (
    <ul className="flex flex-col gap-0.5">
      {gasFirms.map((gasFirm) => (
        <li key={gasFirm.id}>
          <Link to={gasFirmUpdatePath(gasFirm.id)} className={ADMIN_CELL_LINK}>
            {gasFirm.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * Sütun sırası gereksinim 4.5'ten alındı; `Seri No`, `Yeter No` ve `Gsm`
 * ÇIKARILDI (K102). Üçü de her satırda "-" gösteriyordu — ilki ve üçüncüsü
 * yalnız detay yanıtında, ikincisinin uçta hiç karşılığı yoktu. Hep boş bir
 * sütun, tabloyu geniş tutmaktan başka bir iş görmüyordu.
 */
const DATA_COLUMNS: DataTableColumn<ProjectFirmRow, ProjectFirmSortKey>[] = [
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
    key: 'gasFirms',
    label: 'G.D. Firması',
    cell: (firm) => renderGasFirms(firm.gasFirms),
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
]

interface ProjectFirmColumnsOptions {
  /** İstek süren satır; o satırın düğmesi kilitlenir. */
  pendingFirmId: number | null
  /**
   * Yazma yetkisi olmayan kullanıcıda İşlemler sütunu HİÇ çizilmez — pasif
   * düğme göstermek, tıklayınca 403 alacak bir yol açık bırakmak olurdu.
   * Karar yalnız GÖRÜNÜRLÜK içindir; denetim sunucuda (`useIsAdmin`).
   */
  canManage: boolean
  onDelete: (firm: ProjectFirm) => void
}

export function buildProjectFirmColumns({
  pendingFirmId,
  canManage,
  onDelete,
}: ProjectFirmColumnsOptions): DataTableColumn<ProjectFirmRow, ProjectFirmSortKey>[] {
  if (!canManage) return DATA_COLUMNS

  return [
    ...DATA_COLUMNS,
    {
      key: 'actions',
      label: 'İşlemler',
      cellClassName: `${NARROW_COLUMN_CLASS} text-right`,
      headerClassName: `${NARROW_COLUMN_CLASS} text-right`,
      cell: (firm) => (
        <ProjectFirmRowActions
          firm={firm}
          isPending={pendingFirmId === firm.id}
          onDelete={onDelete}
        />
      ),
    },
  ]
}
