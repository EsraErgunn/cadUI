import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Link } from 'react-router-dom'

import type {
  GasDistributionFirm,
  GasFirmSortKey,
  SortDirection,
} from '../../../api/adminFirms'
import { gasFirmUpdatePath } from '../adminNavItems'
import { ADMIN_FOCUS_RING, sortHeaderVariants } from '../adminVariants'

/** Grup firması olmayan kayıtta hücre boş bırakılmaz. */
const NO_GROUP_PLACEHOLDER = '-'

const FIRM_COLUMNS: { key: GasFirmSortKey; label: string }[] = [
  { key: 'dfirmNo', label: 'DFirm No' },
  { key: 'groupName', label: 'Grup Adı' },
  { key: 'name', label: 'Firma' },
]

const CELL_LINK_CLASS = `rounded text-selection hover:underline ${ADMIN_FOCUS_RING}`

interface FirmTableProps {
  firms: GasDistributionFirm[]
  sortKey: GasFirmSortKey
  sortDir: SortDirection
  onToggleSort: (key: GasFirmSortKey) => void
  emptyMessage: string
}

function SortIcon({ isSorted, sortDir }: { isSorted: boolean; sortDir: SortDirection }) {
  if (!isSorted) return <ChevronsUpDown aria-hidden className="size-3.5 text-ink-disabled" />
  if (sortDir === 'asc') return <ArrowUp aria-hidden className="size-3.5" />
  return <ArrowDown aria-hidden className="size-3.5" />
}

export function FirmTable({ firms, sortKey, sortDir, onToggleSort, emptyMessage }: FirmTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-edge bg-surface">
      <table className="w-full min-w-160 border-collapse text-sm">
        <caption className="sr-only">
          Gaz dağıtım firmaları listesi. Sütun başlıkları sıralamayı değiştirir.
        </caption>
        <thead>
          <tr className="border-b border-edge bg-surface-sunken">
            {FIRM_COLUMNS.map((column) => {
              const isSorted = column.key === sortKey
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => onToggleSort(column.key)}
                    className={sortHeaderVariants({ tone: isSorted ? 'active' : 'plain' })}
                  >
                    {column.label}
                    <SortIcon isSorted={isSorted} sortDir={sortDir} />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {firms.length === 0 ? (
            <tr>
              <td colSpan={FIRM_COLUMNS.length} className="px-4 py-12 text-center text-ink-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            firms.map((firm) => (
              <tr key={firm.id} className="border-b border-edge last:border-0 hover:bg-surface-sunken">
                <td className="px-4 py-3 tabular-nums text-ink">{firm.dfirmNo}</td>
                <td className="px-4 py-3">
                  {firm.groupName === null ? (
                    <span className="text-ink-disabled">{NO_GROUP_PLACEHOLDER}</span>
                  ) : (
                    <Link to={gasFirmUpdatePath(firm.id)} className={CELL_LINK_CLASS}>
                      {firm.groupName}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link to={gasFirmUpdatePath(firm.id)} className={CELL_LINK_CLASS}>
                    {firm.name}
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
