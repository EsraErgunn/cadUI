import { CalendarDays } from 'lucide-react'

import type { DashboardSummary } from '../../../api/adminDashboard'
import { DashboardCard } from '../DashboardCard'
import { formatCount, formatLongDate } from '../adminFormat'

interface TodayCardProps {
  today: DashboardSummary['today']
  /** Sayaçların ait olduğu gün; başlıkta yazar, gün dönünce kendiliğinden değişir. */
  date: Date
}

/**
 * Sayaç renkleri: yeni proje düz yeşil, onaylanmış açık yeşil, reddedilen
 * kırmızı (belge). `success-soft` YALNIZ bu büyük kalın rakamda kullanılır —
 * küçük metinde kontrastı yetmiyor (bkz. index.css'teki kısıt notu), bu yüzden
 * etiketler `ink-muted` kalıyor.
 */
const COUNTER_TONES = {
  newProjects: 'text-success',
  approved: 'text-success-soft',
  rejected: 'text-danger-ink',
} as const

interface CounterModel {
  key: keyof typeof COUNTER_TONES
  label: string
  value: number
}

/**
 * Sayaçlar YALNIZ `date` gününe ait kayıtları sayar; veri o gün için isteniyor
 * (`?date=`), istemci hiçbir toplamı kendisi taşımıyor. Gün dönünce anahtar
 * değişip veri yeniden isteniyor, dolayısıyla sayaçlar sıfırdan başlıyor —
 * "gece yarısı sıfırlanır" davranışı bir kural değil, veri kapsamının sonucu.
 */
export function TodayCard({ today, date }: TodayCardProps) {
  const counters: CounterModel[] = [
    { key: 'newProjects', label: 'Yeni Proje', value: today.newProjects },
    { key: 'approved', label: 'Onaylanmış', value: today.approved },
    { key: 'rejected', label: 'Reddedilen', value: today.rejected },
  ]

  return (
    <DashboardCard
      title="Bugün"
      icon={CalendarDays}
      headerSlot={<span className="text-xs text-ink-muted">{formatLongDate(date)}</span>}
    >
      {/* Sayılar gün dönünce veya bölge değişince yenileniyor; ekran okuyucu
          kullanıcısı odağını kaybetmeden yeni değerleri duysun. */}
      <dl aria-live="polite" className="grid grid-cols-3 gap-3">
        {counters.map((counter) => (
          <div
            key={counter.key}
            className="flex flex-col items-center gap-1 rounded-lg border border-edge px-3 py-4"
          >
            {/* Değeri sıfır olan sayaç GİZLENMEZ, "0" gösterilir (KK-4). */}
            <dd className={`text-2xl font-semibold tabular-nums ${COUNTER_TONES[counter.key]}`}>
              {formatCount(counter.value)}
            </dd>
            <dt className="text-center text-xs text-ink-muted">{counter.label}</dt>
          </div>
        ))}
      </dl>
    </DashboardCard>
  )
}
