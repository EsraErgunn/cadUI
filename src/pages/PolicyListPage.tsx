import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import { deletePolicy, listInsuranceCompanies, listPolicies } from '../api/policies'
import { ConfirmDialog } from '../ui/admin/ConfirmDialog'
import { DataTable } from '../ui/admin/DataTable'
import { FilterChips } from '../ui/admin/FilterChips'
import { MissingSourceNotice } from '../ui/admin/MissingSourceNotice'
import { MockDataNotice } from '../ui/admin/MockDataNotice'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading, StaleContent } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { PolicyFilterBar } from '../ui/admin/policies/PolicyFilterBar'
import {
  POLICY_TABLE_CAPTION,
  POLICY_TABLE_MIN_WIDTH_CLASS,
  buildPolicyColumns,
} from '../ui/admin/policies/policyColumns'
import { buildPolicyFilterChips } from '../ui/admin/policies/policyFilterChips'
import { usePolicyListParams } from '../ui/admin/policies/usePolicyListParams'
import { useRowDelete } from '../ui/admin/useRowDelete'

const PAGE_TITLE = 'Poliçeler'
const PAGE_DESCRIPTION = 'Tüm projelere ait poliçeler'

const BREADCRUMB = [{ label: 'Anasayfa', to: ADMIN_HOME_PATH }, { label: PAGE_TITLE }]

const EMPTY_WITH_FILTERS =
  'Kriterlere uyan poliçe bulunamadı. Aramayı veya sigorta şirketi seçimini kaldırın.'
const EMPTY_WITHOUT_FILTERS =
  'Sistemde henüz poliçe yok. Poliçe, proje detayındaki "Poliçelendir" ile oluşturulur.'

/** Şeritte sayılan bölüm: bu ekranda uydurma olan HER ŞEY, satırların tamamı. */
const MOCK_SECTIONS = ['Poliçe listesinin tamamı (satırlar, adet ve sayfalama)']

const MISSING_ENDPOINT_HINT = 'GET /api/policies'

const DELETE_DIALOG = {
  title: 'Poliçe silinsin mi?',
  description:
    'Poliçe listeden kaldırılacak. Depo bellekte olduğu için sayfa yenilenince örnek liste geri gelir.',
  confirmLabel: 'Sil',
}

const DELETE_MESSAGES = {
  success: 'Poliçe silindi.',
  unavailable:
    'Poliçe silme ucu sunucuda henüz yok (DELETE /api/policies/{id}); kayıt düşmedi.',
  error: 'Poliçe silinemedi. Bağlantınızı kontrol edip tekrar deneyin.',
}

export function PolicyListPage() {
  const { query, applyFilters, toggleSort, setPage } = usePolicyListParams()
  const queryClient = useQueryClient()

  const { data: sourced, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['policies', query],
    queryFn: ({ signal }) => listPolicies(query, signal),
    // Sayfa değişince tablo boşalıp zıplamasın; yeni sayfa gelene kadar eskisi durur.
    placeholderData: keepPreviousData,
  })

  // Üretim derlemesinde sahte veri HİÇ üretilmiyor (K51): tablo yerine bölümün
  // sunucuya bağlı olmadığını söyleyen kutu çıkar.
  const data = sourced?.source === 'unavailable' ? undefined : sourced?.data
  const isSourceMissing = sourced?.source === 'unavailable'

  const { data: companies } = useQuery({
    queryKey: ['insuranceCompanies'],
    queryFn: ({ signal }) => listInsuranceCompanies(signal),
  })
  const companyRows =
    companies === undefined || companies.source === 'unavailable' ? [] : companies.data

  const refreshList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['policies'] })
    // Proje detayındaki poliçe sekmesi AYNI depodan besleniyor.
    void queryClient.invalidateQueries({ queryKey: ['projectPolicies'] })
  }, [queryClient])

  const deletion = useRowDelete({
    remove: async (policyId) => (await deletePolicy(policyId)).ok,
    messages: DELETE_MESSAGES,
    onDeleted: refreshList,
  })

  const columns = useMemo(
    () =>
      buildPolicyColumns({
        rowOffset: (query.page - 1) * query.pageSize,
        pendingPolicyId: deletion.pendingId,
        onDelete: deletion.request,
      }),
    [query.page, query.pageSize, deletion.pendingId, deletion.request],
  )

  const hasActiveFilters = query.search !== '' || query.insuranceCompanyId !== null

  // Filtre çubuğu taslak durumunu kendi tutuyor; dışarıdan gelen değişim (geri
  // tuşu, etiket kaldırma) ancak bileşen yeni bir key ile kurulunca yansır.
  const appliedFilters = {
    search: query.search,
    insuranceCompanyId: query.insuranceCompanyId,
  }
  const filterKey = Object.values(appliedFilters).join('|')

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <PageHeader
        breadcrumb={BREADCRUMB}
        title={PAGE_TITLE}
        countLabel={formatCountLabel(data?.totalCount)}
        description={PAGE_DESCRIPTION}
      />

      <MockDataNotice sections={sourced?.source === 'mock' ? MOCK_SECTIONS : []} />

      {deletion.notice !== null && (
        <NoticeBar
          tone={deletion.notice.tone}
          message={deletion.notice.message}
          onDismiss={deletion.dismissNotice}
        />
      )}

      <PolicyFilterBar
        key={filterKey}
        filters={appliedFilters}
        companies={companyRows}
        onApply={applyFilters}
      />

      <FilterChips
        filters={buildPolicyFilterChips({
          filters: appliedFilters,
          companies: companyRows,
          onApply: applyFilters,
        })}
      />

      {isPending && <QueryLoading message="Poliçeler yükleniyor…" />}

      {isError && (
        <QueryError message="Poliçe listesi yüklenemedi." onRetry={() => void refetch()} />
      )}

      {isSourceMissing && <MissingSourceNotice endpointHint={MISSING_ENDPOINT_HINT} />}

      {data !== undefined && !isError && (
        <StaleContent isStale={isPlaceholderData}>
          <DataTable
            rows={data.items}
            columns={columns}
            rowKey={(policy) => policy.id}
            caption={POLICY_TABLE_CAPTION}
            minWidthClassName={POLICY_TABLE_MIN_WIDTH_CLASS}
            sortKey={query.sortBy}
            sortDir={query.sortDir}
            onToggleSort={toggleSort}
            emptyMessage={hasActiveFilters ? EMPTY_WITH_FILTERS : EMPTY_WITHOUT_FILTERS}
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

      {deletion.targetId !== null && (
        <ConfirmDialog
          title={DELETE_DIALOG.title}
          description={DELETE_DIALOG.description}
          confirmLabel={DELETE_DIALOG.confirmLabel}
          confirmTone="danger"
          isPending={deletion.pendingId !== null}
          onConfirm={() => void deletion.confirm()}
          onCancel={deletion.cancel}
        />
      )}
    </div>
  )
}
