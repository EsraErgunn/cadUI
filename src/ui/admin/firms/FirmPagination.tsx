import { ChevronLeft, ChevronRight } from 'lucide-react'

import { pageButtonVariants } from '../adminVariants'

const MAX_VISIBLE_PAGES = 7
/** Aktif sayfanın iki yanında kaç komşu numara gösterilsin. */
const NEIGHBOR_COUNT = 1

interface PageSlot {
  key: string
  /** null = "…" boşluğu. */
  page: number | null
}

function buildPageSlots(currentPage: number, pageCount: number): PageSlot[] {
  if (pageCount <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: pageCount }, (_, index) => ({
      key: `page-${index + 1}`,
      page: index + 1,
    }))
  }

  const shown = new Set<number>([1, pageCount])
  for (let page = currentPage - NEIGHBOR_COUNT; page <= currentPage + NEIGHBOR_COUNT; page += 1) {
    if (page >= 1 && page <= pageCount) shown.add(page)
  }

  const slots: PageSlot[] = []
  let previous = 0
  for (const page of [...shown].sort((left, right) => left - right)) {
    if (page - previous > 1) slots.push({ key: `gap-${previous}`, page: null })
    slots.push({ key: `page-${page}`, page })
    previous = page
  }
  return slots
}

interface FirmPaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}

export function FirmPagination({ page, pageSize, totalCount, onPageChange }: FirmPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const firstShown = (page - 1) * pageSize + 1
  const lastShown = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-muted" aria-live="polite">
        {totalCount} kayıttan {firstShown}-{lastShown} arası gösteriliyor
      </p>

      <nav aria-label="Sayfalama" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Önceki sayfa"
          className={pageButtonVariants()}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>

        {buildPageSlots(page, pageCount).map((slot) => {
          const slotPage = slot.page
          if (slotPage === null) {
            return (
              <span key={slot.key} aria-hidden className="px-1 text-ink-disabled">
                …
              </span>
            )
          }
          return (
            <button
              key={slot.key}
              type="button"
              onClick={() => onPageChange(slotPage)}
              aria-label={`Sayfa ${slotPage}`}
              aria-current={slotPage === page ? 'page' : undefined}
              className={pageButtonVariants({ tone: slotPage === page ? 'active' : 'plain' })}
            >
              {slotPage}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Sonraki sayfa"
          className={pageButtonVariants()}
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </nav>
    </div>
  )
}
