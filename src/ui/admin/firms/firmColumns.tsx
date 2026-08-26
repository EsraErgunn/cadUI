import { Link } from 'react-router-dom'

import { FirmRowActions } from './FirmRowActions'
import type { GasDistributionFirm, GasFirmSortKey } from '../../../api/adminFirms'
import type { DataTableColumn } from '../DataTable'
import { gasFirmUpdatePath } from '../adminNavItems'
import { ADMIN_CELL_LINK } from '../adminVariants'

/** Grup firması olmayan kayıtta hücre boş bırakılmaz. */
const NO_GROUP_PLACEHOLDER = '-'

export const FIRM_TABLE_CAPTION =
  'Gaz dağıtım firmaları listesi. Sütun başlıkları sıralamayı değiştirir.'

type FirmColumn = DataTableColumn<GasDistributionFirm, GasFirmSortKey>

const DATA_COLUMNS: FirmColumn[] = [
  {
    key: 'dfirmNo',
    label: 'DFirm No',
    sortKey: 'dfirmNo',
    cellClassName: 'tabular-nums text-ink',
    cell: (firm) => firm.dfirmNo,
  },
  {
    key: 'groupName',
    label: 'Grup Adı',
    sortKey: 'groupName',
    cell: (firm) =>
      firm.groupName === null ? (
        <span className="text-ink-disabled">{NO_GROUP_PLACEHOLDER}</span>
      ) : (
        <Link to={gasFirmUpdatePath(firm.id)} className={ADMIN_CELL_LINK}>
          {firm.groupName}
        </Link>
      ),
  },
  {
    key: 'name',
    label: 'Firma',
    sortKey: 'name',
    // Güncelleme ekranının TEK girişi Grup Adı hücresi: firma adı düz metin.
    // Bağlantıydı, ama aynı kaydın aynı formuna giden iki hücre kullanıcıya iki
    // ayrı hedef varmış gibi okunuyordu.
    cell: (firm) => firm.name,
  },
]

/** Eylem sütunu içeriği kadar dursun; geniş ekranda düğme başlığın altında kalır. */
const ACTIONS_COLUMN_CLASS = 'w-px whitespace-nowrap text-right'

interface FirmColumnsOptions {
  /** İstek süren satır; o satırın düğmesi kilitlenir. */
  pendingFirmId: number | null
  /**
   * Yazma yetkisi olmayan kullanıcıda İşlemler sütunu HİÇ çizilmez — pasif
   * düğme göstermek, tıklayınca 403 alacak bir yol açık bırakmak olurdu.
   * Karar yalnız GÖRÜNÜRLÜK içindir; denetim sunucuda (`useIsAdmin`).
   */
  canManage: boolean
  onDeactivate: (firm: GasDistributionFirm) => void
}

export function buildFirmColumns({
  pendingFirmId,
  canManage,
  onDeactivate,
}: FirmColumnsOptions): FirmColumn[] {
  if (!canManage) return DATA_COLUMNS

  return [
    ...DATA_COLUMNS,
    {
      key: 'actions',
      label: 'İşlemler',
      cellClassName: ACTIONS_COLUMN_CLASS,
      headerClassName: ACTIONS_COLUMN_CLASS,
      cell: (firm) => (
        <FirmRowActions
          firm={firm}
          isPending={pendingFirmId === firm.id}
          onDeactivate={onDeactivate}
        />
      ),
    },
  ]
}
