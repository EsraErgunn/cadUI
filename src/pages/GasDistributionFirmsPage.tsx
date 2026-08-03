import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { getGasDistributionFirms } from '../api/adminFirms'
import { DataTable } from '../ui/admin/DataTable'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading, StaleContent } from '../ui/admin/QueryStates'
import { FirmFilterChips } from '../ui/admin/firms/FirmFilterChips'
import { FirmFilterPanel } from '../ui/admin/firms/FirmFilterPanel'
import { FirmTableToolbar } from '../ui/admin/firms/FirmTableToolbar'
import { FIRM_COLUMNS, FIRM_TABLE_CAPTION } from '../ui/admin/firms/firmColumns'
import { useFirmListParams } from '../ui/admin/useFirmListParams'

const PAGE_TITLE = 'Gaz Dağıtım Firmaları'

const BREADCRUMB = [
  // "Anasayfa" bağlantısız: gerçek anasayfa ekranı gelince `to` eklenecek
  // (sol menüdeki maddesi de aynı sebeple devre dışı, bkz. adminNavItems.ts).
  { label: 'Anasayfa' },
  { label: 'Firmalar' },
  { label: PAGE_TITLE },
]

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
        <PageHeader
          breadcrumb={BREADCRUMB}
          title={PAGE_TITLE}
          countLabel={data === undefined ? '…' : String(data.totalCount)}
          description="Sisteme kayıtlı tüm gaz dağıtım firmaları"
        />
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

      {isPending && <QueryLoading message="Firmalar yükleniyor…" />}

      {isError && (
        <QueryError message="Firma listesi yüklenemedi." onRetry={() => void refetch()} />
      )}

      {data !== undefined && !isError && (
        <StaleContent isStale={isPlaceholderData}>
          <DataTable
            rows={data.items}
            columns={FIRM_COLUMNS}
            rowKey={(firm) => firm.id}
            caption={FIRM_TABLE_CAPTION}
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
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              totalCount={data.totalCount}
              onPageChange={setPage}
            />
          )}
        </StaleContent>
      )}
    </div>
  )
}
