import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { getFirmGroups, getGasDistributionFirms } from '../api/adminFirms'
import { ConfirmDialog } from '../ui/admin/ConfirmDialog'
import { DataTable } from '../ui/admin/DataTable'
import { FilterChips } from '../ui/admin/FilterChips'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading, StaleContent } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { FirmFilterPanel } from '../ui/admin/firms/FirmFilterPanel'
import { FirmTableToolbar } from '../ui/admin/firms/FirmTableToolbar'
import { FIRM_TABLE_CAPTION, buildFirmColumns } from '../ui/admin/firms/firmColumns'
import { buildFirmFilterChips } from '../ui/admin/firms/firmFilterChips'
import { useGasFirmActions } from '../ui/admin/firms/useGasFirmActions'
import { useFirmListParams } from '../ui/admin/useFirmListParams'
import { useIsAdmin } from '../ui/admin/useIsAdmin'
import { useSavedFirmNotice } from '../ui/admin/useSavedFirmNotice'

/** Liste sorgusunun anahtar kökü; silmeden sonra bu anahtar geçersizleşir. */
const GAS_FIRMS_QUERY_KEY = 'gasDistributionFirms'

const PAGE_TITLE = 'Gaz Dağıtım Firmaları'

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Firmalar' },
  { label: PAGE_TITLE },
]

export function GasDistributionFirmsPage() {
  const { query, setNameQuery, setGroupId, toggleSort, setPage } = useFirmListParams()
  const savedNotice = useSavedFirmNotice()
  const queryClient = useQueryClient()
  const canManage = useIsAdmin()
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
    queryKey: [GAS_FIRMS_QUERY_KEY, query],
    queryFn: ({ signal }) => getGasDistributionFirms(query, signal),
    // Sayfa değişince tablo boşalıp zıplamasın; yeni sayfa gelene kadar eskisi durur.
    placeholderData: keepPreviousData,
  })

  // Anahtarın yalnız KÖKÜ veriliyor: silinen kayıt hangi sayfada/filtrede
  // olursa olsun, önbellekteki tüm liste sorguları tazelensin.
  const refreshList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [GAS_FIRMS_QUERY_KEY] })
  }, [queryClient])

  const actions = useGasFirmActions({ onChanged: refreshList })
  const { pendingFirmId, requestDeactivate } = actions

  const columns = useMemo(
    () => buildFirmColumns({ pendingFirmId, canManage, onDeactivate: requestDeactivate }),
    [pendingFirmId, canManage, requestDeactivate],
  )

  const hasActiveFilters = query.nameQuery !== '' || query.groupId !== null

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      {savedNotice !== null && (
        <NoticeBar
          tone={savedNotice.tone}
          message={savedNotice.message}
          onDismiss={savedNotice.dismiss}
        />
      )}

      {actions.notice !== null && (
        <NoticeBar
          tone={actions.notice.tone}
          message={actions.notice.message}
          onDismiss={actions.dismissNotice}
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          breadcrumb={BREADCRUMB}
          title={PAGE_TITLE}
          countLabel={formatCountLabel(data?.totalCount)}
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
          onGroupIdChange={setGroupId}
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
            columns={columns}
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

      {actions.deactivateTarget !== null && (
        <ConfirmDialog
          title="Firmayı Sil"
          description={
            <>
              <strong>{actions.deactivateTarget.name}</strong> firmasını silmek istediğinize
              emin misiniz? Firma listelerde görünmeyecek; kayıt veritabanından kaldırılmaz
              ve firmaya bağlı veriler korunur.
            </>
          }
          confirmLabel="Sil"
          confirmTone="danger"
          isPending={pendingFirmId !== null}
          onConfirm={() => void actions.confirmDeactivate()}
          onCancel={actions.cancelDeactivate}
        />
      )}
    </div>
  )
}
