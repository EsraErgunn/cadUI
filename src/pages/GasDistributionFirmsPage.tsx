import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { getFirmGroups, getGasDistributionFirms } from '../api/adminFirms'
import { DataTable } from '../ui/admin/DataTable'
import { FilterChips } from '../ui/admin/FilterChips'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading, StaleContent } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { FirmFilterPanel } from '../ui/admin/firms/FirmFilterPanel'
import { FirmTableToolbar } from '../ui/admin/firms/FirmTableToolbar'
import { FIRM_COLUMNS, FIRM_TABLE_CAPTION } from '../ui/admin/firms/firmColumns'
import { buildFirmFilterChips } from '../ui/admin/firms/firmFilterChips'
import { useSavedFirmNotice } from '../ui/admin/firms/useSavedFirmNotice'
import { useFirmListParams } from '../ui/admin/useFirmListParams'

const PAGE_TITLE = 'Gaz Dağıtım Firmaları'

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Firmalar' },
  { label: PAGE_TITLE },
]

export function GasDistributionFirmsPage() {
  const { query, setNameQuery, setGroupId, setRegion, toggleSort, setPage } = useFirmListParams()
  const savedNotice = useSavedFirmNotice()
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(() => query.groupId !== null)

  // Süzgeç kimlikle çalışıyor; çipte gösterilecek ADI aynı önbellekten çözülür
  // (FirmFilterPanel de bu anahtarı kullanıyor, ikinci istek çıkmaz).
  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
  })
  const selectedGroupLabel =
    groups?.find((group) => group.id === query.groupId)?.name ?? null

  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['gasDistributionFirms', query],
    queryFn: ({ signal }) => getGasDistributionFirms(query, signal),
    // Sayfa değişince tablo boşalıp zıplamasın; yeni sayfa gelene kadar eskisi durur.
    placeholderData: keepPreviousData,
  })

  const hasActiveFilters = query.nameQuery !== '' || query.groupId !== null

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5">
      {savedNotice !== null && (
        <NoticeBar tone="success" message={savedNotice.message} onDismiss={savedNotice.dismiss} />
      )}

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
          groupId={query.groupId}
          region={query.region}
          onGroupIdChange={setGroupId}
          onRegionChange={setRegion}
          onClose={() => setIsFilterPanelOpen(false)}
        />
      )}

      <FilterChips
        filters={buildFirmFilterChips({
          nameQuery: query.nameQuery,
          groupLabel: selectedGroupLabel,
          onRemoveNameQuery: () => setNameQuery(''),
          onRemoveGroupId: () => setGroupId(null),
        })}
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
