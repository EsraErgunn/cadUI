import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { EmptyState } from './EmptyState'
import { sortHeaderVariants } from './adminVariants'
import type { SortDirection } from '../../api/listQuery'

export interface DataTableColumn<TRow, TSort extends string = string> {
  key: string
  label: string
  /** Doldurulmuşsa başlık sıralama düğmesine dönüşür; boşsa düz metin kalır. */
  sortKey?: TSort
  /** `index` sayfa İÇİ sıra (0 tabanlı); sayfa genelindeki numarayı çağıran hesaplar. */
  cell: (row: TRow, index: number) => ReactNode
  /** Hücreye eklenen hizalama/tipografi sınıfları (ör. `tabular-nums`). */
  cellClassName?: string
}

interface DataTableProps<TRow, TSort extends string = string> {
  rows: TRow[]
  columns: DataTableColumn<TRow, TSort>[]
  rowKey: (row: TRow) => string | number
  /** Ekran okuyucu için tablo özeti; görsel olarak gizlidir. */
  caption: string
  emptyMessage: string
  sortKey?: TSort
  sortDir?: SortDirection
  onToggleSort?: (key: TSort) => void
  /** Sütun sayısı arttıkça yatay kaydırmanın başlayacağı eşik değişir. */
  minWidthClassName?: string
  /** Satıra duruma göre eklenen sınıf (ör. yeni kaydın vurgusu). */
  rowClassName?: (row: TRow) => string | undefined
}

const ROW_BASE_CLASS =
  'border-b border-edge last:border-0 transition-colors hover:bg-surface-sunken'

const DEFAULT_MIN_WIDTH_CLASS = 'min-w-160'

function SortIcon({ isSorted, sortDir }: { isSorted: boolean; sortDir: SortDirection }) {
  if (!isSorted) return <ChevronsUpDown aria-hidden className="size-3.5 text-ink-disabled" />
  if (sortDir === 'asc') return <ArrowUp aria-hidden className="size-3.5" />
  return <ArrowDown aria-hidden className="size-3.5" />
}

/**
 * Yönetici liste tablolarının ortak gövdesi. Hangi sütunların olduğunu ve
 * hücrenin nasıl çizileceğini ÇAĞIRAN ekran bilir; tablo yalnız iskeleti,
 * sıralama başlıklarını ve boş durumu yönetir.
 */
export function DataTable<TRow, TSort extends string = string>({
  rows,
  columns,
  rowKey,
  caption,
  emptyMessage,
  sortKey,
  sortDir = 'asc',
  onToggleSort,
  minWidthClassName = DEFAULT_MIN_WIDTH_CLASS,
  rowClassName,
}: DataTableProps<TRow, TSort>) {
  return (
    // `relative` ŞART, süs değil: hücrelerdeki `sr-only` metinler
    // `position: absolute` ve konumlanmış bir ata yoksa kapsayan blokları
    // KÖK öğe olur. O hâlde kaydırma kabı onları kırpamıyor — geniş tablonun
    // sağ ucundaki gizli metin belgenin genişliğini uzatıp SAYFA seviyesinde
    // yatay kaydırma çubuğu doğuruyordu (Evraklar ekranı, 1440 px'ten aşağıda).
    // Kap konumlanınca sr-only metinlerin kapsayan bloğu burası olur ve kırpılır.
    <div className="relative overflow-x-auto rounded-xl border border-edge bg-surface">
      <table className={`w-full ${minWidthClassName} border-collapse text-sm`}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-edge bg-surface-sunken">
            {columns.map((column) => {
              const columnSortKey = column.sortKey
              if (columnSortKey === undefined || onToggleSort === undefined) {
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {column.label}
                  </th>
                )
              }

              const isSorted = columnSortKey === sortKey
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => onToggleSort(columnSortKey)}
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
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => {
              const extraClass = rowClassName?.(row)
              return (
                <tr
                  key={rowKey(row)}
                  className={
                    extraClass === undefined ? ROW_BASE_CLASS : `${ROW_BASE_CLASS} ${extraClass}`
                  }
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={
                        column.cellClassName === undefined
                          ? 'px-4 py-3'
                          : `px-4 py-3 ${column.cellClassName}`
                      }
                    >
                      {column.cell(row, rowIndex)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
