import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CircleCheck, FileClock } from 'lucide-react'
import { useMemo } from 'react'

import { GLOBAL_SCOPE } from '../../api/adminDashboard'
import {
  DEFAULT_PROJECT_SORT_DIR,
  DEFAULT_PROJECT_SORT_KEY,
  getProjectStatusCounts,
  listProjects,
  type ProjectListQuery,
  type ProjectStatus,
  type ProjectStatusCountsQuery,
} from '../../api/projects'
import { PageHeader } from '../../ui/admin/PageHeader'
import { ProjectStatusCards } from '../../ui/admin/ProjectStatusCards'
import { RecentProjectsCard } from '../../ui/admin/RecentProjectsCard'
import { lastMonthRange } from '../../ui/admin/adminDateRange'
import { GAS_DISTRIBUTION_HOME_PATH } from '../../ui/admin/adminNavItems'

const PAGE_TITLE = 'Anasayfa'

/** Onay kuyruğu ASIL iş; ikinci kart yalnız "az önce ne onayladım" içindir. */
const PENDING_PROJECT_COUNT = 8
const APPROVED_PROJECT_COUNT = 5

const FIRST_PAGE = 1

/**
 * Gaz dağıtım firması kullanıcısının anasayfası.
 *
 * Yönetici panosunun (`/api/admin/dashboard`) kopyası DEĞİL ve o ucu HİÇ
 * çağırmıyor. Sebebi tek tek: ucun döndürdüğü `counts` firma/kullanıcı YÖNETİM
 * sayıları ve kartları bu role kapalı ekranlara bağlanıyor; `density` firma
 * kapsamında tek satıra düşüp anlamsızlaşıyor. Üstelik yol `/api/admin/...` ve
 * rolün oraya erişip erişemediği doğrulanmış değil.
 *
 * Bunun yerine iki KESİN gerçek uç: `GET /api/projects/status-counts` ve
 * `GET /api/projects`. Proje firması panosuyla aynı desen ve aynı iki bileşen
 * (`ProjectStatusCards`, `RecentProjectsCard`) — vurgu farklı: orada kullanıcının
 * YAZDIĞI iş (taslaklar), burada kullanıcının KARAR VERECEĞİ iş (onay kuyruğu).
 *
 * **Kapsam sunucunun sorumluluğu.** Sorgulara `GasDistributionFirmId` ya da
 * `gdFirmId` KONULMUYOR: istemcinin gönderdiği kimlik güvenlik sınırı değildir.
 * Uç, token'daki firmaya göre daraltmak zorunda (knowledge/access-control.md).
 *
 * **Uydurulmuş sayı YOK:** bekleyen evrak, poliçe toplamı ve aksiyon adedi için
 * sunucuda uç yok (evrak ve poliçe ekranlarının tamamı hâlâ mock), o yüzden
 * kartları da yok.
 */
export function GasDistributionHomePage() {
  // Tarih aralığı liste ekranının VARSAYILANIYLA aynı: kart "12" derken
  // tıklanan listenin 3 satır göstermesi sayıyı yanlış gösterirdi.
  const range = useMemo(() => lastMonthRange(new Date()), [])

  const countsQuery = useMemo<ProjectStatusCountsQuery>(
    () => ({
      dateFrom: range.from,
      dateTo: range.to,
      cityId: null,
      districtId: null,
      projectFirmId: null,
      scope: GLOBAL_SCOPE,
      search: '',
    }),
    [range],
  )

  const { data: statusCounts } = useQuery({
    // Anahtar proje listesiyle ORTAK: kullanıcı listeye geçince aynı süzgeçle
    // hesaplanan adetler önbellekten gelir, ikinci istek atılmaz.
    queryKey: ['projectStatusCounts', countsQuery],
    queryFn: ({ signal }) => getProjectStatusCounts(countsQuery, signal),
    placeholderData: keepPreviousData,
  })

  const pending = useRecentProjects('onayBekleyen', PENDING_PROJECT_COUNT, countsQuery)
  const approved = useRecentProjects('onaylanan', APPROVED_PROJECT_COUNT, countsQuery)

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: 'Anasayfa', to: GAS_DISTRIBUTION_HOME_PATH }]}
        title={PAGE_TITLE}
      />

      <ProjectStatusCards counts={statusCounts} rangeLabel="Son bir ay" />

      {/* Onay kuyruğu iki sütun genişliğinde: bu rolün asıl işi o liste, yanındaki
          kart yalnız son kararların teyidi. Telefonda alt alta iner. */}
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentProjectsCard
            title="Onay Bekleyenler"
            icon={FileClock}
            status="onayBekleyen"
            projects={pending.data?.items}
            isError={pending.isError}
            emptyMessage="Onay bekleyen proje yok. Kuyruk temiz."
          />
        </div>
        <RecentProjectsCard
          title="Son Onaylananlar"
          icon={CircleCheck}
          status="onaylanan"
          projects={approved.data?.items}
          isError={approved.isError}
          emptyMessage="Bu aralıkta onaylanmış proje yok."
        />
      </div>
    </div>
  )
}

/**
 * Bir durumun en son güncellenen birkaç projesi. Sorgu, liste ekranının
 * kullandığı `ProjectListQuery`'nin AYNISI — yalnız `pageSize` küçük; ayrı bir
 * "anasayfa listesi" ucu ya da ikinci bir sorgu şekli uydurulmuyor.
 */
function useRecentProjects(
  status: ProjectStatus,
  pageSize: number,
  filters: ProjectStatusCountsQuery,
) {
  const query = useMemo<ProjectListQuery>(
    () => ({
      ...filters,
      status,
      page: FIRST_PAGE,
      pageSize,
      sortBy: DEFAULT_PROJECT_SORT_KEY,
      sortDir: DEFAULT_PROJECT_SORT_DIR,
    }),
    [filters, status, pageSize],
  )

  return useQuery({
    queryKey: ['projects', query],
    queryFn: ({ signal }) => listProjects(query, signal),
    placeholderData: keepPreviousData,
  })
}
