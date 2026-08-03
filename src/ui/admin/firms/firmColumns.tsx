import { Link } from 'react-router-dom'

import type { GasDistributionFirm, GasFirmSortKey } from '../../../api/adminFirms'
import type { DataTableColumn } from '../DataTable'
import { gasFirmUpdatePath } from '../adminNavItems'
import { ADMIN_CELL_LINK } from '../adminVariants'

/** Grup firması olmayan kayıtta hücre boş bırakılmaz. */
const NO_GROUP_PLACEHOLDER = '-'

export const FIRM_TABLE_CAPTION =
  'Gaz dağıtım firmaları listesi. Sütun başlıkları sıralamayı değiştirir.'

export const FIRM_COLUMNS: DataTableColumn<GasDistributionFirm, GasFirmSortKey>[] = [
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
    cell: (firm) => (
      <Link to={gasFirmUpdatePath(firm.id)} className={ADMIN_CELL_LINK}>
        {firm.name}
      </Link>
    ),
  },
]
