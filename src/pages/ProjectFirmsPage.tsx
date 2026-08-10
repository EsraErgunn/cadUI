import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { queryProjectFirmList } from '../api/projectFirmListQuery'
import { getProjectFirmList, type ProjectFirm } from '../api/projectFirms'
import { DataTable } from '../ui/admin/DataTable'
import { FilterChips } from '../ui/admin/FilterChips'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { ProjectFirmFilterPanel } from '../ui/admin/projectFirms/ProjectFirmFilterPanel'
import { ProjectFirmTableToolbar } from '../ui/admin/projectFirms/ProjectFirmTableToolbar'
import {
  PROJECT_FIRM_COLUMNS,
  PROJECT_FIRM_TABLE_CAPTION,
  PROJECT_FIRM_TABLE_MIN_WIDTH,
} from '../ui/admin/projectFirms/projectFirmColumns'
import { buildProjectFirmFilterChips } from '../ui/admin/projectFirms/projectFirmFilterChips'
import { useProjectFirmListParams } from '../ui/admin/projectFirms/useProjectFirmListParams'

const PAGE_TITLE = 'Proje Firmaları'

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Firmalar' },
  { label: PAGE_TITLE },
]

/** Liste tek seferde çekiliyor; arama her tuşta yeni istek doğurmasın. */
const PROJECT_FIRM_LIST_STALE_MS = 5 * 60 * 1000

/** Veri gelmeden TEK bir boş dizi: her render'da yeni `[]` üretilseydi
    süzme `useMemo`'su boşuna yeniden çalışırdı. */
const EMPTY_LIST: ProjectFirm[] = []

export function ProjectFirmsPage() {
  const { query, setNameQuery, toggleSort, setPage } = useProjectFirmListParams()
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)

  // Sorgu `queryKey`'in parçası DEĞİL: uç filtre/sayfalama parametresi almıyor,
  // sorgu anahtara girseydi her tuş vuruşu listeyi baştan indirirdi.
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['projectFirmList'],
    queryFn: ({ signal }) => getProjectFirmList(signal),
    staleTime: PROJECT_FIRM_LIST_STALE_MS,
  })

  // Süzme/sıralama/dilimleme burada: liste yeniden ÇEKİLMEZ, yeniden hesaplanır.
  const { items, totalCount } = useMemo(
    () => queryProjectFirmList(data ?? EMPTY_LIST, query),
    [data, query],
  )

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          breadcrumb={BREADCRUMB}
          title={PAGE_TITLE}
          countLabel={formatCountLabel(data === undefined ? undefined : totalCount)}
          description="Sisteme kayıtlı proje (mühendislik) firmaları"
        />
        <ProjectFirmTableToolbar
          nameQuery={query.nameQuery}
          onApplyNameQuery={setNameQuery}
          onOpenFilterPanel={() => setIsFilterPanelOpen(true)}
        />
      </div>

      {isFilterPanelOpen && (
        <ProjectFirmFilterPanel onClose={() => setIsFilterPanelOpen(false)} />
      )}

      <FilterChips
        filters={buildProjectFirmFilterChips({
          nameQuery: query.nameQuery,
          onRemoveNameQuery: () => setNameQuery(''),
        })}
      />

      {isPending && <QueryLoading message="Proje firmaları yükleniyor…" />}

      {isError && (
        <QueryError
          message="Proje firması listesi yüklenemedi."
          onRetry={() => void refetch()}
        />
      )}

      {data !== undefined && !isError && (
        <>
          <DataTable
            rows={items}
            columns={PROJECT_FIRM_COLUMNS}
            rowKey={(firm) => firm.id}
            caption={PROJECT_FIRM_TABLE_CAPTION}
            minWidthClassName={PROJECT_FIRM_TABLE_MIN_WIDTH}
            sortKey={query.sortKey}
            sortDir={query.sortDir}
            onToggleSort={toggleSort}
            emptyMessage={
              query.nameQuery === ''
                ? 'Sisteme kayıtlı proje firması yok.'
                : 'Arama kriterine uyan proje firması bulunamadı. Kriteri değiştirip tekrar deneyin.'
            }
          />
          {totalCount > 0 && (
            <Pagination
              page={query.page}
              pageSize={query.pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
