import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { FileClock, PencilRuler, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

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
import { FIRM_HOME_PATH, PROJECT_CREATE_PATH } from '../../ui/admin/adminNavItems'
import { adminButtonVariants } from '../../ui/admin/adminVariants'

const PAGE_TITLE = 'Anasayfa'

/** Kartta gösterilecek en fazla proje. Tabloyu değil, kısa bir özeti besliyor. */
const RECENT_PROJECT_COUNT = 5

const FIRST_PAGE = 1

/**
 * Proje firması kullanıcısının anasayfası.
 *
 * Yönetici anasayfasının (`AdminHomePage`) küçültülmüş kopyası DEĞİL ve onunla
 * hiçbir uç paylaşmıyor: `/api/admin/dashboard` yönetim kapsamı (`gdGroupId` /
 * `gdFirmId`) üzerine kurulu, firma yoğunluğu kartı da bu rolün işi değil.
 * Burada YALNIZ projeler var, çünkü bugün gerçek uçtan gelen veri o.
 *
 * **Kapsam sunucunun sorumluluğu.** Sorgulara `ProjectFirmId` KONULMUYOR:
 * istemcinin gönderdiği bir kimlik güvenlik sınırı değildir, kullanıcı onu
 * değiştirebilir. Uç, token'daki firmaya göre daraltmak zorunda
 * (bkz. knowledge/access-control.md).
 *
 * **Eksik olanlar bilerek yok:** eksik evrak sayısı, poliçe toplamı ve bekleyen
 * aksiyon adedi için sunucuda uç YOK (evrak ve poliçe ekranlarının tamamı hâlâ
 * mock). Uydurulmuş bir sayı, bir demoda gerçek sanılırdı.
 * TODO(esra): `GET /api/docs` ve poliçe uçları açılınca bu sayfaya evrak/poliçe
 * kartı eklenecek.
 */
export function FirmUserHomePage() {
  // Tarih aralığı liste ekranının VARSAYILANIYLA aynı: kart "12" derken tıklanan
  // listenin 3 satır göstermesi, sayının yanlış olduğu izlenimi verirdi.
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

  const drafts = useRecentProjects('taslak', countsQuery)
  const pending = useRecentProjects('onayBekleyen', countsQuery)

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          breadcrumb={[{ label: 'Anasayfa', to: FIRM_HOME_PATH }]}
          title={PAGE_TITLE}
        />

        <Link to={PROJECT_CREATE_PATH} className={adminButtonVariants({ tone: 'primary' })}>
          <Plus aria-hidden className="size-4" />
          Yeni Proje
        </Link>
      </div>

      <ProjectStatusCards counts={statusCounts} rangeLabel="Son bir ay" />

      {/* İki kart eşit sütun: soldaki kullanıcının DEVAM ETTİĞİ iş, sağdaki
          karşı taraftan cevap beklediği iş. Telefonda alt alta iner. */}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <RecentProjectsCard
          title="Devam Eden Taslaklar"
          icon={PencilRuler}
          status="taslak"
          projects={drafts.data?.items}
          isError={drafts.isError}
          emptyMessage="Taslak projeniz yok. Yeni bir proje oluşturabilirsiniz."
        />
        <RecentProjectsCard
          title="Onay Bekleyenler"
          icon={FileClock}
          status="onayBekleyen"
          projects={pending.data?.items}
          isError={pending.isError}
          emptyMessage="Onay bekleyen projeniz yok."
        />
      </div>
    </div>
  )
}

/**
 * Bir durumun en son güncellenen birkaç projesi.
 *
 * Sorgu, liste ekranının kullandığı `ProjectListQuery`'nin AYNISI — yalnız
 * `pageSize` küçük. Ayrı bir "anasayfa listesi" ucu ya da ayrı bir sorgu şekli
 * uydurmuyoruz; sayfa başına satır sayısı zaten sözleşmenin parçası.
 */
function useRecentProjects(status: ProjectStatus, filters: ProjectStatusCountsQuery) {
  const query = useMemo<ProjectListQuery>(
    () => ({
      ...filters,
      status,
      page: FIRST_PAGE,
      pageSize: RECENT_PROJECT_COUNT,
      sortBy: DEFAULT_PROJECT_SORT_KEY,
      sortDir: DEFAULT_PROJECT_SORT_DIR,
    }),
    [filters, status],
  )

  return useQuery({
    queryKey: ['projects', query],
    queryFn: ({ signal }) => listProjects(query, signal),
    placeholderData: keepPreviousData,
  })
}
