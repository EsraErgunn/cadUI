import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { useState } from 'react'

import { getDashboardSummary, type Announcement } from '../api/adminDashboard'
import { fetchAllFirms, getFirmGroups } from '../api/adminFirms'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { findScopeName } from '../ui/admin/adminScopeOptions'
import { adminButtonVariants } from '../ui/admin/adminVariants'
import { AnnouncementDialog } from '../ui/admin/announcements/AnnouncementDialog'
import { AnnouncementsCard } from '../ui/admin/dashboard/AnnouncementsCard'
import { DensityCard } from '../ui/admin/dashboard/DensityCard'
import { QuickActionsCard } from '../ui/admin/dashboard/QuickActionsCard'
import { SummaryCards } from '../ui/admin/dashboard/SummaryCards'
import { TodayCard } from '../ui/admin/dashboard/TodayCard'
import { useCurrentDay } from '../ui/admin/dashboard/useCurrentDay'
import { useAdminScopeParam } from '../ui/admin/useAdminScopeParam'

const PAGE_TITLE = 'Genel Bakış'

const PAGE_DESCRIPTION = 'Sistem geneli durum'

const BREADCRUMB = [{ label: 'Anasayfa', to: ADMIN_HOME_PATH }, { label: 'Dashboard' }]

const DASHBOARD_QUERY_KEY = 'dashboardSummary'

/**
 * Yönetici anasayfası. Tüm sayılar TEK uçtan geliyor (`getDashboardSummary`);
 * kapsam üst bardaki seçiciden ve KAPSAMIN TAMAMI sorgu anahtarının parçası —
 * grup ile firma kapsamı ayrı önbellek girdisi olur, kapsam değişince kartların
 * hepsi birlikte yenilenir ve yanlış kapsamın verisi ekranda kalmaz.
 *
 * Gün anahtarı da sorgunun parçası: gece yarısı `useCurrentDay` yeni günü
 * verince anahtar değişiyor, veri o gün için yeniden isteniyor ve "Bugün"
 * sayaçları sıfırdan başlıyor. Ekran açık kalsa bile dünde takılmıyor.
 */
export function AdminHomePage() {
  const { date, dayKey } = useCurrentDay()
  const queryClient = useQueryClient()
  const { scope } = useAdminScopeParam()

  // Kapsam URL'de KİMLİK; başlık ve kart altı ADI yazıyor. Her iki liste de üst
  // barla AYNI önbellekten geliyor, ikinci istek doğurmuyor.
  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
  })
  const { data: firms } = useQuery({
    queryKey: ['gasDistributionFirms', 'all'],
    queryFn: ({ signal }) => fetchAllFirms(signal),
  })
  const scopeName = findScopeName(scope, groups ?? [], firms ?? [])

  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false)
  const [publishedTitle, setPublishedTitle] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, dayKey, scope],
    queryFn: ({ signal }) => getDashboardSummary(dayKey, scope, signal),
  })

  const handlePublished = (announcement: Announcement) => {
    setIsAnnouncementDialogOpen(false)
    setPublishedTitle(announcement.title)
    // Duyurular kartı yayınlanan duyuruyu HEMEN göstermeli; gün ne olursa olsun
    // tüm gösterge panosu anahtarları tazeleniyor.
    void queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY] })
  }

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          breadcrumb={BREADCRUMB}
          title={PAGE_TITLE}
          description={PAGE_DESCRIPTION}
        />

        <button
          type="button"
          onClick={() => setIsAnnouncementDialogOpen(true)}
          className={adminButtonVariants({ tone: 'primary' })}
        >
          <Megaphone aria-hidden className="size-4" />
          Duyuru Yayınla
        </button>
      </div>

      {publishedTitle !== null && (
        <NoticeBar
          tone="success"
          message={`“${publishedTitle}” duyurusu yayınlandı.`}
          onDismiss={() => setPublishedTitle(null)}
        />
      )}

      {isPending && <QueryLoading message="Genel bakış yükleniyor…" />}

      {isError && (
        <QueryError message="Genel bakış verileri yüklenemedi." onRetry={() => void refetch()} />
      )}

      {data !== undefined && !isError && (
        <>
          <SummaryCards counts={data.counts} scopeName={scopeName} />

          {/* Dar ekranda tek sütun: Bugün → Yoğunluk → Duyurular → Hızlı
              İşlemler. Geniş ekranda sol sütun ilk ikisi, sağ sütun son ikisi. */}
          <div className="grid items-start gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              <TodayCard today={data.today} date={date} />
              <DensityCard densityBy={data.densityBy} rows={data.density} />
            </div>
            <div className="flex flex-col gap-5">
              <AnnouncementsCard announcements={data.announcements} />
              <QuickActionsCard />
            </div>
          </div>
        </>
      )}

      {isAnnouncementDialogOpen && (
        <AnnouncementDialog
          onClose={() => setIsAnnouncementDialogOpen(false)}
          onPublished={handlePublished}
        />
      )}
    </div>
  )
}
