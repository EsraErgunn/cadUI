import { useQuery } from '@tanstack/react-query'

import { getProjectFirmUserList } from '../api/projectFirmUsers'
import { DataTable } from '../ui/admin/DataTable'
import { EmptyState } from '../ui/admin/EmptyState'
import { MissingSourceNotice } from '../ui/admin/MissingSourceNotice'
import { MockDataNotice } from '../ui/admin/MockDataNotice'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { Pagination } from '../ui/admin/Pagination'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { formatCountLabel } from '../ui/admin/adminFormat'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import {
  PROJECT_FIRM_USER_COLUMNS,
  PROJECT_FIRM_USER_TABLE_CAPTION,
  PROJECT_FIRM_USER_TABLE_MIN_WIDTH,
} from '../ui/admin/projectFirmUsers/projectFirmUserColumns'
import { useProjectFirmUserListParams } from '../ui/admin/projectFirmUsers/useProjectFirmUserListParams'
import { useSavedProjectFirmUserNotice } from '../ui/admin/projectFirmUsers/useSavedProjectFirmUserNotice'

const PAGE_TITLE = 'Proje Firması Kullanıcıları'

/** Belge madde 1 / KK-1, birebir. */

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Firmalar' },
  { label: PAGE_TITLE },
]

/** Belge KK-7, birebir. */
const NO_RESULT_MESSAGE = 'Arama kriterlerine uygun kayıt bulunamadı.'

/**
 * Şeritte sayılan bölüm. Satırların FİRMA sütunları gerçek uçlardan geliyor,
 * uydurma olan kullanıcının kendisi — şerit bu ayrımı söylüyor ki kullanıcı
 * neyin sahte olduğunu bilsin.
 */
const MOCK_SECTIONS = [
  'Kullanıcı satırları (ad, kullanıcı adı, e-posta, telefon, yetki ve adet) — firma sütunları gerçek uçtan geliyor',
]

const MISSING_ENDPOINT_HINT = 'GET /api/projectfirmusers'

export function ProjectFirmUsersPage() {
  const { query, setPage } = useProjectFirmUserListParams()
  const savedNotice = useSavedProjectFirmUserNotice()

  // Sorgu `queryKey`'in PARÇASI: sayfalama ve süzme sunucuda, her kriter
  // değişimi yeni bir sayfa isteği demek (KK-12). Kriterler "Filtrele" ile
  // uygulandığı için bu, tuş başına değil uygulama başına bir istektir.
  const { data: sourced, isPending, isError, refetch } = useQuery({
    queryKey: ['projectFirmUserList', query],
    queryFn: ({ signal }) => getProjectFirmUserList(query, signal),
  })

  // Üretim derlemesinde sahte kullanıcı HİÇ üretilmiyor (K51): tablo yerine
  // bölümün sunucuya bağlı olmadığını söyleyen kutu çıkar.
  const data = sourced?.source === 'unavailable' ? undefined : sourced?.data
  const isSourceMissing = sourced?.source === 'unavailable'

  const totalCount = data?.totalCount

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      {savedNotice !== null && (
        <NoticeBar
          tone={savedNotice.tone}
          message={savedNotice.message}
          onDismiss={savedNotice.dismiss}
        />
      )}

      <MockDataNotice sections={sourced?.source === 'mock' ? MOCK_SECTIONS : []} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          breadcrumb={BREADCRUMB}
          title={PAGE_TITLE}
          countLabel={formatCountLabel(totalCount)}
        />
      </div>

      {isPending && <QueryLoading message="Kullanıcılar yükleniyor…" />}

      {isError && (
        <QueryError
          message="Kullanıcı listesi yüklenemedi."
          onRetry={() => void refetch()}
        />
      )}

      {isSourceMissing && <MissingSourceNotice endpointHint={MISSING_ENDPOINT_HINT} />}

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
    </div>
  )
}
