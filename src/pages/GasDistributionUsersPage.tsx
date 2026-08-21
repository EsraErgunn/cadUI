import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  GAS_DISTRIBUTION_USER_PAGE_SIZE,
  listGasDistributionUsers,
  type GasDistributionUserQuery,
} from '../api/gasDistributionUsers'
import { DataTable } from '../ui/admin/DataTable'
import { MissingSourceNotice } from '../ui/admin/MissingSourceNotice'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading, StaleContent } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { ADMIN_HOME_PATH, GAS_DISTRIBUTION_USER_CREATE_PATH } from '../ui/admin/adminNavItems'
import { ADMIN_PARAM_KEYS, FIRST_PAGE, parsePage, useAdminParamWriter } from '../ui/admin/adminUrlParams'
import { adminButtonVariants } from '../ui/admin/adminVariants'
import {
  GAS_DISTRIBUTION_USER_COLUMNS,
  GAS_DISTRIBUTION_USER_TABLE_CAPTION,
  GAS_DISTRIBUTION_USER_TABLE_MIN_WIDTH,
} from '../ui/admin/gasDistributionUsers/gasDistributionUserColumns'
import { useIsAdmin } from '../ui/admin/useIsAdmin'

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

export function GasDistributionUsersPage() {
  const { query, setPage } = useGasDistributionUserListParams()
  // Yalnız GÖRÜNÜRLÜK kararı: `POST /api/auth/register` zaten Admin rolüne açık
  // ve denetim sunucuda (useIsAdmin).
  const isAdmin = useIsAdmin()

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

      {isPending && <QueryLoading message="Kullanıcılar yükleniyor…" />}

      {isError && (
        <QueryError message="Kullanıcı listesi yüklenemedi." onRetry={() => void refetch()} />
      )}

      {isSourceMissing && <MissingSourceNotice endpointHint={MISSING_ENDPOINT_HINT} />}

      {data !== undefined && !isError && (
        <StaleContent isStale={isPlaceholderData}>
          <DataTable
            rows={data.items}
            columns={GAS_DISTRIBUTION_USER_COLUMNS}
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
    </div>
  )
}
