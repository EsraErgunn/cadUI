import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import {
  getEffectiveAuthorizations,
  type ProjectFirmAuthorizationRef,
} from '../api/projectFirmAuthorizations'
import { buildProjectFirmRows, queryProjectFirmList } from '../api/projectFirmListQuery'
import { getProjectFirmList, type ProjectFirm } from '../api/projectFirms'
import { ConfirmDialog } from '../ui/admin/ConfirmDialog'
import { DataTable } from '../ui/admin/DataTable'
import { FilterChips } from '../ui/admin/FilterChips'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { ProjectFirmFilterPanel } from '../ui/admin/projectFirms/ProjectFirmFilterPanel'
import { ProjectFirmTableToolbar } from '../ui/admin/projectFirms/ProjectFirmTableToolbar'
import {
  PROJECT_FIRM_TABLE_CAPTION,
  PROJECT_FIRM_TABLE_MIN_WIDTH,
  buildProjectFirmColumns,
} from '../ui/admin/projectFirms/projectFirmColumns'
import { buildProjectFirmFilterChips } from '../ui/admin/projectFirms/projectFirmFilterChips'
import { useProjectFirmActions } from '../ui/admin/projectFirms/useProjectFirmActions'
import { useProjectFirmListParams } from '../ui/admin/projectFirms/useProjectFirmListParams'
import { useIsAdmin } from '../ui/admin/useIsAdmin'
import { useSavedFirmNotice } from '../ui/admin/useSavedFirmNotice'

/** Liste sorgusunun anahtarı; silmeden sonra bu anahtar geçersizleşir. */
const PROJECT_FIRM_LIST_QUERY_KEY = 'projectFirmList'

/** G.D. firması bağı AYRI uçtan geliyor; kendi anahtarı var (bkz. aşağıdaki not). */
const PROJECT_FIRM_AUTHORIZATION_QUERY_KEY = 'projectFirmAuthorizations'

/**
 * Bağ çekilemediğinde sütun boş kalır ve "hiç yetkisi yok" gibi okunur; şerit
 * farkı söyler. Kapatılabilir çünkü liste bu bilgi olmadan da kullanılabilir.
 */
const AUTHORIZATION_ERROR_MESSAGE =
  'Gaz dağıtım firması bağı yüklenemedi; “G.D. Firması” sütunu boş görünüyor. ' +
  'Sayfayı yenileyip tekrar deneyin.'

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
const EMPTY_AUTHORIZATIONS: ProjectFirmAuthorizationRef[] = []

export function ProjectFirmsPage() {
  const { query, setNameQuery, toggleSort, setPage } = useProjectFirmListParams()
  const savedNotice = useSavedFirmNotice()
  const queryClient = useQueryClient()
  const canManage = useIsAdmin()
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [isAuthorizationNoticeDismissed, setIsAuthorizationNoticeDismissed] = useState(false)

  // Sorgu `queryKey`'in parçası DEĞİL: uç filtre/sayfalama parametresi almıyor,
  // sorgu anahtara girseydi her tuş vuruşu listeyi baştan indirirdi.
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [PROJECT_FIRM_LIST_QUERY_KEY],
    queryFn: ({ signal }) => getProjectFirmList(signal),
    staleTime: PROJECT_FIRM_LIST_STALE_MS,
  })

  /**
   * G.D. firması bağı `GET /api/project-firm-authorizations`'tan; firma
   * listesiyle birleştiren uç YOK. Ayrı sorgu olması bilinçli: firma listesi
   * altı ekranda ortak anahtarla paylaşılıyor (K75) ve yetki isteği o anahtara
   * eklenseydi bağa ihtiyacı olmayan beş ekran da ikinci isteği çekerdi.
   * Sütun boşken tablo çizilebildiği için de bu sorgu listeyi BEKLETMİYOR.
   */
  const authorizationsQuery = useQuery({
    queryKey: [PROJECT_FIRM_AUTHORIZATION_QUERY_KEY],
    queryFn: ({ signal }) => getEffectiveAuthorizations({}, signal),
    staleTime: PROJECT_FIRM_LIST_STALE_MS,
  })

  const refreshList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [PROJECT_FIRM_LIST_QUERY_KEY] })
    void queryClient.invalidateQueries({ queryKey: [PROJECT_FIRM_AUTHORIZATION_QUERY_KEY] })
  }, [queryClient])

  const actions = useProjectFirmActions({ onChanged: refreshList })
  const { pendingFirmId, requestDelete } = actions

  const rows = useMemo(
    () =>
      buildProjectFirmRows(data ?? EMPTY_LIST, authorizationsQuery.data ?? EMPTY_AUTHORIZATIONS),
    [data, authorizationsQuery.data],
  )

  // Süzme/sıralama/dilimleme burada: liste yeniden ÇEKİLMEZ, yeniden hesaplanır.
  const { items, totalCount } = useMemo(
    () => queryProjectFirmList(rows, query),
    [rows, query],
  )

  const columns = useMemo(
    () => buildProjectFirmColumns({ pendingFirmId, canManage, onDelete: requestDelete }),
    [pendingFirmId, canManage, requestDelete],
  )

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5">
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

      {authorizationsQuery.isError && !isAuthorizationNoticeDismissed && (
        <NoticeBar
          tone="warning"
          message={AUTHORIZATION_ERROR_MESSAGE}
          onDismiss={() => setIsAuthorizationNoticeDismissed(true)}
        />
      )}

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
            columns={columns}
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

      {actions.deleteTarget !== null && (
        <ConfirmDialog
          title="Firmayı Sil"
          description={
            <>
              <strong>{actions.deleteTarget.name}</strong> firmasını silmek istediğinizden emin
              misiniz? Firma listelerden kaldırılacak.
            </>
          }
          confirmLabel="Sil"
          confirmTone="danger"
          isPending={pendingFirmId !== null}
          onConfirm={() => void actions.confirmDelete()}
          onCancel={actions.cancelDelete}
        />
      )}
    </div>
  )
}
