import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'

import {
  getDistricts,
  getProjectFirms,
  getProjectStatusCounts,
  listProjects,
  PROJECT_STATUS_LABELS,
  type ProjectStatusCountsQuery,
} from '../api/projects'
import { ConfirmDialog } from '../ui/admin/ConfirmDialog'
import { DataTable } from '../ui/admin/DataTable'
import { FilterChips } from '../ui/admin/FilterChips'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading, StaleContent } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH, PROJECT_CREATE_PATH } from '../ui/admin/adminNavItems'
import { adminButtonVariants } from '../ui/admin/adminVariants'
import { ProjectFilterBar } from '../ui/admin/projects/ProjectFilterBar'
import { StatusTabs } from '../ui/admin/projects/StatusTabs'
import {
  buildProjectColumns,
  PROJECT_TABLE_CAPTION,
  PROJECT_TABLE_MIN_WIDTH_CLASS,
} from '../ui/admin/projects/projectColumns'
import { buildProjectFilterChips } from '../ui/admin/projects/projectFilterChips'
import { useProjectActions } from '../ui/admin/projects/useProjectActions'
import { useProjectListParams } from '../ui/admin/projects/useProjectListParams'

const PANEL_ID = 'project-list-panel'
const LOOKUP_STALE_MS = 5 * 60 * 1000

const DOCUMENT_HINT = 'İşlemler sütunundaki evrak ikonu yeşilse projede yüklü evrak vardır.'
const EMPTY_WITH_FILTERS =
  'Kriterlere uyan proje bulunamadı. Tarih aralığını genişletin veya ilçe/firma seçimini kaldırın.'
const EMPTY_WITHOUT_FILTERS = 'Bu durumda kayıtlı proje yok.'

export function ProjectListPage() {
  const { query, setStatus, applyFilters, toggleSort, setPage } = useProjectListParams()
  const queryClient = useQueryClient()

  // Rozetler sekmeden ve sayfalamadan bağımsız, yalnız filtre kriterlerine bakar.
  const countsQuery = useMemo<ProjectStatusCountsQuery>(
    () => ({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      districtId: query.districtId,
      projectFirmId: query.projectFirmId,
      search: query.search,
      region: query.region,
    }),
    [
      query.dateFrom,
      query.dateTo,
      query.districtId,
      query.projectFirmId,
      query.search,
      query.region,
    ],
  )

  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['projects', query],
    queryFn: ({ signal }) => listProjects(query, signal),
    // Sayfa değişince tablo boşalıp zıplamasın; yeni sayfa gelene kadar eskisi durur.
    placeholderData: keepPreviousData,
  })

  const { data: statusCounts } = useQuery({
    queryKey: ['projectStatusCounts', countsQuery],
    queryFn: ({ signal }) => getProjectStatusCounts(countsQuery, signal),
    placeholderData: keepPreviousData,
  })

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: ({ signal }) => getDistricts(signal),
    staleTime: LOOKUP_STALE_MS,
  })

  const { data: projectFirms } = useQuery({
    queryKey: ['projectFirms'],
    queryFn: ({ signal }) => getProjectFirms(signal),
    staleTime: LOOKUP_STALE_MS,
  })

  const refreshLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['projectStatusCounts'] })
  }, [queryClient])

  const actions = useProjectActions({ onChanged: refreshLists })
  const { pendingProjectId, requestDelete, submit } = actions

  const columns = useMemo(
    () =>
      buildProjectColumns({
        rowOffset: (query.page - 1) * query.pageSize,
        status: query.status,
        pendingProjectId,
        onDelete: requestDelete,
        onSubmit: (projectId) => void submit(projectId),
      }),
    [query.page, query.pageSize, query.status, pendingProjectId, requestDelete, submit],
  )

  const statusTitle = `${PROJECT_STATUS_LABELS[query.status]} Projeler`
  const hasActiveFilters =
    query.search !== '' || query.districtId !== null || query.projectFirmId !== null
  // Filtre çubuğu taslak durumunu kendi tutuyor; dışarıdan gelen değişim (geri
  // tuşu, sekme değişimi) ancak bileşen yeni bir key ile kurulunca yansır.
  const appliedFilters = {
    dateFrom: query.dateFrom ?? '',
    dateTo: query.dateTo ?? '',
    districtId: query.districtId,
    projectFirmId: query.projectFirmId,
    search: query.search,
  }
  const filterKey = Object.values(appliedFilters).join('|')

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          breadcrumb={[
            { label: 'Anasayfa', to: ADMIN_HOME_PATH },
            { label: 'Projeler' },
            { label: statusTitle },
          ]}
          title={statusTitle}
          countLabel={data === undefined ? '…' : String(data.totalCount)}
          description={DOCUMENT_HINT}
        />

        <Link to={PROJECT_CREATE_PATH} className={adminButtonVariants({ tone: 'primary' })}>
          <Plus aria-hidden className="size-4" />
          Yeni Proje
        </Link>
      </div>

      {actions.notice !== null && (
        <NoticeBar
          tone={actions.notice.tone}
          message={actions.notice.message}
          details={actions.notice.details}
          onDismiss={actions.dismissNotice}
        />
      )}

      <StatusTabs
        value={query.status}
        counts={statusCounts}
        onChange={setStatus}
        panelId={PANEL_ID}
      />

      <ProjectFilterBar
        key={filterKey}
        filters={appliedFilters}
        districts={districts ?? []}
        projectFirms={projectFirms ?? []}
        onApply={applyFilters}
      />

      <FilterChips
        filters={buildProjectFilterChips({
          filters: appliedFilters,
          districts: districts ?? [],
          projectFirms: projectFirms ?? [],
          onApply: applyFilters,
        })}
      />

      <div id={PANEL_ID} role="tabpanel" aria-label="Proje listesi">
        {isPending && <QueryLoading message="Projeler yükleniyor…" />}

        {isError && (
          <QueryError message="Proje listesi yüklenemedi." onRetry={() => void refetch()} />
        )}

        {data !== undefined && !isError && (
          <StaleContent isStale={isPlaceholderData}>
            <DataTable
              rows={data.items}
              columns={columns}
              rowKey={(project) => project.id}
              caption={PROJECT_TABLE_CAPTION}
              minWidthClassName={PROJECT_TABLE_MIN_WIDTH_CLASS}
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

      {actions.deleteTargetId !== null && (
        <ConfirmDialog
          title="Proje silinsin mi?"
          description="Proje ve çizimi kalıcı olarak silinir; bu işlem geri alınamaz."
          confirmLabel="Sil"
          confirmTone="danger"
          isPending={actions.pendingProjectId !== null}
          onConfirm={() => void actions.confirmDelete()}
          onCancel={actions.cancelDelete}
        />
      )}
    </div>
  )
}
