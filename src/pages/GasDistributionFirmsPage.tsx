import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { PROJECT_LIST_PATH } from './useCloseEditor'
import { getGasDistributionFirms } from '../api/adminFirms'
import { ADMIN_FOCUS_RING, adminButtonVariants } from '../ui/admin/adminVariants'
import { FirmFilterChips } from '../ui/admin/firms/FirmFilterChips'
import { FirmFilterPanel } from '../ui/admin/firms/FirmFilterPanel'
import { FirmPagination } from '../ui/admin/firms/FirmPagination'
import { FirmTable } from '../ui/admin/firms/FirmTable'
import { FirmTableToolbar } from '../ui/admin/firms/FirmTableToolbar'
import { useFirmListParams } from '../ui/admin/useFirmListParams'

const PAGE_TITLE = 'Gaz Dağıtım Firmaları'

function PageHeader({ totalCountLabel }: { totalCountLabel: string }) {
  return (
    <div>
      <nav aria-label="Konum" className="text-xs text-ink-muted">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              to={PROJECT_LIST_PATH}
              className={`rounded text-selection hover:underline ${ADMIN_FOCUS_RING}`}
            >
              Anasayfa
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>Firmalar</li>
          <li aria-hidden>/</li>
          <li aria-current="page">{PAGE_TITLE}</li>
        </ol>
      </nav>

      <h1 className="mt-2 text-2xl font-semibold text-ink">
        {PAGE_TITLE} <span className="text-ink-muted">({totalCountLabel})</span>
      </h1>
      <p className="mt-1 text-sm text-ink-muted">Sisteme kayıtlı tüm gaz dağıtım firmaları</p>
    </div>
  )
}

export function GasDistributionFirmsPage() {
  const { query, setNameQuery, setGroupName, setRegion, toggleSort, setPage } = useFirmListParams()
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(
    () => query.groupName !== null || query.region !== null,
  )

  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['gasDistributionFirms', query],
    queryFn: ({ signal }) => getGasDistributionFirms(query, signal),
    // Sayfa değişince tablo boşalıp zıplamasın; yeni sayfa gelene kadar eskisi durur.
    placeholderData: keepPreviousData,
  })

  const hasActiveFilters =
    query.nameQuery !== '' || query.groupName !== null || query.region !== null

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader totalCountLabel={data === undefined ? '…' : String(data.totalCount)} />
        <FirmTableToolbar
          nameQuery={query.nameQuery}
          onApplyNameQuery={setNameQuery}
          onOpenFilterPanel={() => setIsFilterPanelOpen(true)}
        />
      </div>

      {isFilterPanelOpen && (
        <FirmFilterPanel
          groupName={query.groupName}
          region={query.region}
          onGroupNameChange={setGroupName}
          onRegionChange={setRegion}
          onClose={() => setIsFilterPanelOpen(false)}
        />
      )}

      <FirmFilterChips
        nameQuery={query.nameQuery}
        groupName={query.groupName}
        region={query.region}
        onRemoveNameQuery={() => setNameQuery('')}
        onRemoveGroupName={() => setGroupName(null)}
        onRemoveRegion={() => setRegion(null)}
      />

      {isPending && (
        <p className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-4 py-12 text-sm text-ink-muted">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          Firmalar yükleniyor…
        </p>
      )}

      {isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-surface px-4 py-6 text-sm text-ink"
        >
          <CircleAlert aria-hidden className="size-5 text-danger" />
          <span>Firma listesi yüklenemedi.</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className={adminButtonVariants({ tone: 'secondary' })}
          >
            Tekrar dene
          </button>
        </div>
      )}

      {data !== undefined && !isError && (
        <div className={isPlaceholderData ? 'flex flex-col gap-4 opacity-60' : 'flex flex-col gap-4'}>
          <FirmTable
            firms={data.items}
            sortKey={query.sortKey}
            sortDir={query.sortDir}
            onToggleSort={toggleSort}
            emptyMessage={
              hasActiveFilters
                ? 'Arama ve filtre kriterlerine uyan firma bulunamadı. Kriterleri değiştirip tekrar deneyin.'
                : 'Sisteme kayıtlı gaz dağıtım firması yok.'
            }
          />
          {data.totalCount > 0 && (
            <FirmPagination
              page={data.page}
              pageSize={data.pageSize}
              totalCount={data.totalCount}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  )
}
