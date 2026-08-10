import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { useState } from 'react'

import { getDashboardSummary, type Announcement } from '../api/adminDashboard'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { useRegionParam } from '../ui/admin/adminUrlParams'
import { adminButtonVariants } from '../ui/admin/adminVariants'
import { AnnouncementDialog } from '../ui/admin/announcements/AnnouncementDialog'
import { AnnouncementsCard } from '../ui/admin/dashboard/AnnouncementsCard'
import { QuickActionsCard } from '../ui/admin/dashboard/QuickActionsCard'
import { RegionDensityCard } from '../ui/admin/dashboard/RegionDensityCard'
import { SummaryCards } from '../ui/admin/dashboard/SummaryCards'
import { TodayCard } from '../ui/admin/dashboard/TodayCard'
import { buildScopeDescription } from '../ui/admin/dashboard/dashboardFormat'
import { useCurrentDay } from '../ui/admin/dashboard/useCurrentDay'

const PAGE_TITLE = 'Genel Bakış'

const BREADCRUMB = [{ label: 'Anasayfa', to: ADMIN_HOME_PATH }, { label: 'Dashboard' }]

const DASHBOARD_QUERY_KEY = 'dashboardSummary'

/**
 * Yönetici anasayfası. Tüm sayılar TEK uçtan geliyor (`getDashboardSummary`),
 * bu yüzden üst bardaki bölge değişince açıklama ve her kart aynı anda yeniden
 * hesaplanıyor (KK-2) — ekranda ikinci bir veri kaynağı yok.
 *
 * Gün anahtarı sorgunun parçası: gece yarısı `useCurrentDay` yeni günü
 * verince anahtar değişiyor, veri o gün için yeniden isteniyor ve "Bugün"
 * sayaçları sıfırdan başlıyor. Ekran açık kalsa bile dünde takılmıyor.
 */
export function AdminHomePage() {
  const { region } = useRegionParam()
  const { date, dayKey } = useCurrentDay()
  const queryClient = useQueryClient()

  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false)
  const [publishedTitle, setPublishedTitle] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, region, dayKey],
    queryFn: ({ signal }) => getDashboardSummary(region, dayKey, signal),
  })

  const handlePublished = (announcement: Announcement) => {
    setIsAnnouncementDialogOpen(false)
    setPublishedTitle(announcement.title)
    // Duyurular kartı yayınlanan duyuruyu HEMEN göstermeli; bölge/gün ne olursa
    // olsun tüm gösterge panosu anahtarları tazeleniyor.
    void queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY] })
  }

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          breadcrumb={BREADCRUMB}
          title={PAGE_TITLE}
          // Tarih gün anahtarından geliyor: gün değişince açıklama da döner.
          description={buildScopeDescription(date, region)}
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
          <SummaryCards counts={data.counts} region={region} />

          {/* Dar ekranda tek sütun: Bugün → Bölge Yoğunluk → Duyurular → Hızlı
              İşlemler. Geniş ekranda sol sütun ilk ikisi, sağ sütun son ikisi. */}
          <div className="grid items-start gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              <TodayCard today={data.today} date={date} />
              <RegionDensityCard rows={data.regionDensity} />
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
          defaultRegion={region}
          onClose={() => setIsAnnouncementDialogOpen(false)}
          onPublished={handlePublished}
        />
      )}
    </div>
  )
}
