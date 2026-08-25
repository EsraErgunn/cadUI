import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  GAS_DISTRIBUTION_USER_PAGE_SIZE,
  listGasDistributionUsers,
  type GasDistributionUserQuery,
} from '../api/gasDistributionUsers'
import { deleteUser } from '../api/users'
import { ConfirmDialog } from '../ui/admin/ConfirmDialog'
import { DataTable } from '../ui/admin/DataTable'
import { MissingSourceNotice } from '../ui/admin/MissingSourceNotice'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading, StaleContent } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { ADMIN_HOME_PATH, GAS_DISTRIBUTION_USER_CREATE_PATH } from '../ui/admin/adminNavItems'
import { ADMIN_PARAM_KEYS, FIRST_PAGE, parsePage, useAdminParamWriter } from '../ui/admin/adminUrlParams'
import { adminButtonVariants } from '../ui/admin/adminVariants'
import {
  buildGasDistributionUserColumns,
  GAS_DISTRIBUTION_USER_TABLE_CAPTION,
  GAS_DISTRIBUTION_USER_TABLE_MIN_WIDTH,
} from '../ui/admin/gasDistributionUsers/gasDistributionUserColumns'
import { useIsAdmin } from '../ui/admin/useIsAdmin'
import { useRowDelete } from '../ui/admin/useRowDelete'

const PAGE_TITLE = 'Gaz Dağıtım Kullanıcıları'

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Kullanıcılar' },
  { label: PAGE_TITLE },
]

const EMPTY_MESSAGE = 'Kayıtlı gaz dağıtım kullanıcısı yok.'

/** Kutuda yazan uç adı; ekibin hangi ucu açacağını ekrandan okuyabilmesi için. */
const MISSING_ENDPOINT_HINT = 'GET /api/users?roleCode=GasDistributionUser'

/**
 * Liste ekranı durumunun tek sahibi URL (`admin-list-state`). Bugün yalnız
 * sayfa numarası var: süzgeç sözleşmesi ucu olmadan yazılamaz, olmayan bir
 * parametreyi adrese koymak ileride yanlış anahtarla uyumluluk borcu doğururdu.
 */
function useGasDistributionUserListParams() {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const query = useMemo<GasDistributionUserQuery>(
    () => ({
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: GAS_DISTRIBUTION_USER_PAGE_SIZE,
    }),
    [searchParams],
  )

  const setPage = (page: number) =>
    updateParams({ page: page === FIRST_PAGE ? null : String(page) }, false)

  return { query, setPage }
}

const DELETE_MESSAGES = {
  success: 'Kullanıcı silindi.',
  // Uç YOK: "hata" değil, "burada yapılamaz".
  unavailable: 'Kullanıcı silme ucu sunucuda henüz yok; kayıt silinmedi.',
  error: 'Kullanıcı silinemedi. Bağlantınızı kontrol edip tekrar deneyin.',
} as const

const DELETE_DIALOG = {
  title: 'Kullanıcı silinsin mi?',
  description: 'Kullanıcı listeden kaldırılacak ve erişimi sonlanacak.',
  confirmLabel: 'Sil',
} as const

export function GasDistributionUsersPage() {
  const { query, setPage } = useGasDistributionUserListParams()
  // Yalnız GÖRÜNÜRLÜK kararı: `POST /api/auth/register` zaten Admin rolüne açık
  // ve denetim sunucuda (useIsAdmin).
  const isAdmin = useIsAdmin()
  const queryClient = useQueryClient()

  const { data: sourced, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['gasDistributionUsers', query],
    queryFn: ({ signal }) => listGasDistributionUsers(query, signal),
    // Sayfa değişince tablo boşalıp zıplamasın; yeni sayfa gelene kadar eskisi durur.
    placeholderData: keepPreviousData,
  })

  // Uç açılana kadar tablo YERİNE bölümün kaynağı olmadığını söyleyen kutu
  // çıkar (K51): sahte satır üretmek, bir demoda gerçek sanılırdı.
  const isSourceMissing = sourced?.source === 'unavailable'
  const data = isSourceMissing ? undefined : sourced?.data

  const deletion = useRowDelete({
    remove: (userId) => deleteUser(userId),
    messages: DELETE_MESSAGES,
    onDeleted: () => {
      void queryClient.invalidateQueries({ queryKey: ['gasDistributionUsers'] })
    },
  })

  const columns = useMemo(
    () =>
      buildGasDistributionUserColumns({
        canDelete: isAdmin,
        pendingUserId: deletion.pendingId,
        onDelete: deletion.request,
      }),
    [isAdmin, deletion.pendingId, deletion.request],
  )

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          breadcrumb={BREADCRUMB}
          title={PAGE_TITLE}
          countLabel={formatCountLabel(data?.totalCount)}
        />

        {isAdmin && (
          <Link
            to={GAS_DISTRIBUTION_USER_CREATE_PATH}
            className={adminButtonVariants({ tone: 'primary' })}
          >
            <UserPlus aria-hidden className="size-4" />
            Yeni Kullanıcı
          </Link>
        )}
      </div>

      {deletion.notice !== null && (
        <NoticeBar
          tone={deletion.notice.tone}
          message={deletion.notice.message}
          onDismiss={deletion.dismissNotice}
        />
      )}

      {isPending && <QueryLoading message="Kullanıcılar yükleniyor…" />}

      {isError && (
        <QueryError message="Kullanıcı listesi yüklenemedi." onRetry={() => void refetch()} />
      )}

      {isSourceMissing && <MissingSourceNotice endpointHint={MISSING_ENDPOINT_HINT} />}

      {data !== undefined && !isError && (
        <StaleContent isStale={isPlaceholderData}>
          <DataTable
            rows={data.items}
            columns={columns}
            rowKey={(row) => row.id}
            caption={GAS_DISTRIBUTION_USER_TABLE_CAPTION}
            minWidthClassName={GAS_DISTRIBUTION_USER_TABLE_MIN_WIDTH}
            emptyMessage={EMPTY_MESSAGE}
          />
          {data.totalCount > 0 && (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              totalCount={data.totalCount}
              onPageChange={setPage}
              itemLabelAblative="kullanıcıdan"
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
