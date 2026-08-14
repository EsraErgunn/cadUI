import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { listInsuranceCompanies, listPolicies } from '../api/policies'
import { DataTable } from '../ui/admin/DataTable'
import { FilterChips } from '../ui/admin/FilterChips'
import { MissingSourceNotice } from '../ui/admin/MissingSourceNotice'
import { MockDataNotice } from '../ui/admin/MockDataNotice'
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

export function PolicyListPage() {
  const { query, applyFilters, toggleSort, setPage } = usePolicyListParams()

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

  const columns = useMemo(
    () => buildPolicyColumns({ rowOffset: (query.page - 1) * query.pageSize }),
    [query.page, query.pageSize],
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
    <div className="mx-auto flex max-w-320 flex-col gap-5">
      <PageHeader
        breadcrumb={BREADCRUMB}
        title={PAGE_TITLE}
        countLabel={formatCountLabel(data?.totalCount)}
        description={PAGE_DESCRIPTION}
      />

      <MockDataNotice sections={sourced?.source === 'mock' ? MOCK_SECTIONS : []} />

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
    </div>
  )
}
