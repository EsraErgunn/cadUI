import { useQuery } from '@tanstack/react-query'

import type { ProjectFirmUserQuery } from '../api/projectFirmUserDto'
import { getProjectFirmUserList } from '../api/projectFirmUsers'
import { DataTable } from '../ui/admin/DataTable'
import { EmptyState } from '../ui/admin/EmptyState'
import { FilterChips } from '../ui/admin/FilterChips'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { ProjectFirmUserFilterBar } from '../ui/admin/projectFirmUsers/ProjectFirmUserFilterBar'
import {
  PROJECT_FIRM_USER_COLUMNS,
  PROJECT_FIRM_USER_TABLE_CAPTION,
  PROJECT_FIRM_USER_TABLE_MIN_WIDTH,
} from '../ui/admin/projectFirmUsers/projectFirmUserColumns'
import { buildProjectFirmUserFilterChips } from '../ui/admin/projectFirmUsers/projectFirmUserFilterChips'
import { useProjectFirmUserListParams } from '../ui/admin/projectFirmUsers/useProjectFirmUserListParams'
import { useSavedProjectFirmUserNotice } from '../ui/admin/projectFirmUsers/useSavedProjectFirmUserNotice'

const PAGE_TITLE = 'Proje Firması Kullanıcıları'

/** Belge madde 1 / KK-1, birebir. */
const DESCRIPTION = 'Firma mühendisleri ve yetkilileri'

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Firmalar' },
  { label: PAGE_TITLE },
]

/** Belge KK-7, birebir. */
const NO_RESULT_MESSAGE = 'Arama kriterlerine uygun kayıt bulunamadı.'

export function ProjectFirmUsersPage() {
  const { query, applyFilters, setPage } = useProjectFirmUserListParams()
  const savedNotice = useSavedProjectFirmUserNotice()

  // Sorgu `queryKey`'in PARÇASI: sayfalama ve süzme sunucuda, her kriter
  // değişimi yeni bir sayfa isteği demek (KK-12). Kriterler "Filtrele" ile
  // uygulandığı için bu, tuş başına değil uygulama başına bir istektir.
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['projectFirmUserList', query],
    queryFn: ({ signal }) => getProjectFirmUserList(query, signal),
  })

  const applyPatch = (patch: Partial<ProjectFirmUserQuery>) =>
    applyFilters({
      nameQuery: patch.nameQuery ?? query.nameQuery,
      authorityType: patch.authorityType === undefined ? query.authorityType : patch.authorityType,
      onlyActive: patch.onlyActive ?? query.onlyActive,
    })

  const totalCount = data?.totalCount

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5">
      {savedNotice !== null && (
        <NoticeBar
          tone={savedNotice.tone}
          message={savedNotice.message}
          onDismiss={savedNotice.dismiss}
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          breadcrumb={BREADCRUMB}
          title={PAGE_TITLE}
          countLabel={formatCountLabel(totalCount)}
          description={DESCRIPTION}
        />
        <ProjectFirmUserFilterBar
          filters={{
            nameQuery: query.nameQuery,
            authorityType: query.authorityType,
            onlyActive: query.onlyActive,
          }}
          onApply={applyFilters}
        />
      </div>

      <FilterChips filters={buildProjectFirmUserFilterChips({ query, onRemove: applyPatch })} />

      {isPending && <QueryLoading message="Kullanıcılar yükleniyor…" />}

      {isError && (
        <QueryError
          message="Kullanıcı listesi yüklenemedi."
          onRetry={() => void refetch()}
        />
      )}

      {data !== undefined && !isError && (
        <>
          {/* KK-7: sonuç yoksa TABLO YERİNE açıklama görünür ve sayfalama gizlenir —
              boş bir tablo iskeleti kullanıcıya hiçbir şey söylemiyordu. */}
          {data.totalCount === 0 ? (
            <div className="rounded-xl border border-edge bg-surface">
              <EmptyState message={NO_RESULT_MESSAGE} />
            </div>
          ) : (
            <>
              <DataTable
                rows={data.items}
                columns={PROJECT_FIRM_USER_COLUMNS}
                rowKey={(row) => row.competencyId}
                caption={PROJECT_FIRM_USER_TABLE_CAPTION}
                minWidthClassName={PROJECT_FIRM_USER_TABLE_MIN_WIDTH}
                emptyMessage={NO_RESULT_MESSAGE}
              />
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                totalCount={data.totalCount}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
