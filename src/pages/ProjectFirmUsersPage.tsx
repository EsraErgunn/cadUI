import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { getProjectFirmUserList } from '../api/projectFirmUsers'
import { deleteUser } from '../api/users'
import { ConfirmDialog } from '../ui/admin/ConfirmDialog'
import { DataTable } from '../ui/admin/DataTable'
import { EmptyState } from '../ui/admin/EmptyState'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { ADMIN_HOME_PATH, PROJECT_FIRM_USER_CREATE_PATH } from '../ui/admin/adminNavItems'
import { adminPageWidthVariants } from '../ui/admin/adminPageWidth'
import { adminButtonVariants } from '../ui/admin/adminVariants'
import {
  PROJECT_FIRM_USER_TABLE_CAPTION,
  PROJECT_FIRM_USER_TABLE_MIN_WIDTH,
  buildProjectFirmUserColumns,
} from '../ui/admin/projectFirmUsers/projectFirmUserColumns'
import { useProjectFirmUserListParams } from '../ui/admin/projectFirmUsers/useProjectFirmUserListParams'
import { useSavedProjectFirmUserNotice } from '../ui/admin/projectFirmUsers/useSavedProjectFirmUserNotice'
import { useIsAdmin } from '../ui/admin/useIsAdmin'
import { useRowDelete } from '../ui/admin/useRowDelete'

const PAGE_TITLE = 'Proje Firması Kullanıcıları'

/** Belge madde 1 / KK-1, birebir. */

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Firmalar' },
  { label: PAGE_TITLE },
]

/** Belge KK-7, birebir. */
const NO_RESULT_MESSAGE = 'Arama kriterlerine uygun kayıt bulunamadı.'

const DELETE_MESSAGES = {
  success: 'Kullanıcı silindi.',
  // Uç YOK: "hata" değil, "burada yapılamaz". Sunucu tarafı açılınca bu kol
  // hiç çalışmayacak.
  unavailable: 'Kullanıcı silme ucu sunucuda henüz yok; kayıt silinmedi.',
  error: 'Kullanıcı silinemedi. Bağlantınızı kontrol edip tekrar deneyin.',
} as const

const DELETE_DIALOG = {
  title: 'Kullanıcı silinsin mi?',
  description: 'Kullanıcı listeden kaldırılacak ve erişimi sonlanacak.',
  confirmLabel: 'Sil',
} as const

export function ProjectFirmUsersPage() {
  const { query, setPage } = useProjectFirmUserListParams()
  const savedNotice = useSavedProjectFirmUserNotice()
  // Yalnız GÖRÜNÜRLÜK: kullanıcı oluşturma `POST /api/auth/register` ile
  // yapılıyor ve o uç sunucuda `[Authorize(Roles = Admin)]`.
  const isAdmin = useIsAdmin()
  const queryClient = useQueryClient()

  // Sorgu `queryKey`'in PARÇASI: sayfalama ve süzme sunucuda, her kriter
  // değişimi yeni bir sayfa isteği demek (KK-12). Kriterler "Filtrele" ile
  // uygulandığı için bu, tuş başına değil uygulama başına bir istektir.
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['projectFirmUserList', query],
    queryFn: ({ signal }) => getProjectFirmUserList(query, signal),
  })

  const deletion = useRowDelete({
    remove: (userId) => deleteUser(userId),
    messages: DELETE_MESSAGES,
    onDeleted: () => {
      void queryClient.invalidateQueries({ queryKey: ['projectFirmUserList'] })
    },
  })

  const columns = useMemo(
    () =>
      buildProjectFirmUserColumns({
        canDelete: isAdmin,
        pendingUserId: deletion.pendingId,
        onDelete: deletion.request,
      }),
    [isAdmin, deletion.pendingId, deletion.request],
  )

  const totalCount = data?.totalCount

  return (
    <div className={adminPageWidthVariants({ content: 'list', className: 'flex flex-col gap-5' })}>
      {deletion.notice !== null && (
        <NoticeBar
          tone={deletion.notice.tone}
          message={deletion.notice.message}
          onDismiss={deletion.dismissNotice}
        />
      )}

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
        />

        {/* Ekranın kendi ekleme girişi. Bir süre YOKTU: kullanıcı yalnız
            gösterge panelindeki kısayoldan gelebiliyordu ve o kısayol da
            üretimde çizilmiyordu (63d2b68). Gaz Dağıtım Kullanıcıları
            ekranındaki desenin aynısı. */}
        {isAdmin && (
          <Link
            to={PROJECT_FIRM_USER_CREATE_PATH}
            className={adminButtonVariants({ tone: 'primary' })}
          >
            <UserPlus aria-hidden className="size-4" />
            Yeni Kullanıcı
          </Link>
        )}
      </div>

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
                columns={columns}
                rowKey={(row) => row.id}
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
