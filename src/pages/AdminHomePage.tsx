import { useQuery } from '@tanstack/react-query'

import { getDashboardSummary } from '../api/adminDashboard'
import { fetchAllFirms, getFirmGroups } from '../api/adminFirms'
import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { findScopeName } from '../ui/admin/adminScopeOptions'
import { DensityCard } from '../ui/admin/dashboard/DensityCard'
import { QuickActionsCard } from '../ui/admin/dashboard/QuickActionsCard'
import { SummaryCards } from '../ui/admin/dashboard/SummaryCards'
import { TodayCard } from '../ui/admin/dashboard/TodayCard'
import { useCurrentDay } from '../ui/admin/dashboard/useCurrentDay'
import { useAdminScopeParam } from '../ui/admin/useAdminScopeParam'

const PAGE_TITLE = 'Genel Bakış'


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

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, dayKey, scope],
    queryFn: ({ signal }) => getDashboardSummary(dayKey, scope, signal),
  })

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <PageHeader breadcrumb={BREADCRUMB} title={PAGE_TITLE} />

      {isPending && <QueryLoading message="Genel bakış yükleniyor…" />}

      {isError && (
        <QueryError message="Genel bakış verileri yüklenemedi." onRetry={() => void refetch()} />
      )}

      {data !== undefined && !isError && (
        <>
          <SummaryCards counts={data.counts} scopeName={scopeName} />

          {/* Dar ekranda tek sütun: Bugün → Yoğunluk → Hızlı İşlemler. Geniş
              ekranda sol sütun ilk ikisi, sağ sütun sonuncusu. */}
          <div className="grid items-start gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              <TodayCard today={data.today} date={date} />
              <DensityCard densityBy={data.densityBy} rows={data.density} />
            </div>
            <QuickActionsCard />
          </div>
        </>
      )}
    </div>
  )
}
