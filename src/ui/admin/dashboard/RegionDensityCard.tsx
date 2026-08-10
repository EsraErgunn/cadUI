import { Clock } from 'lucide-react'

import { DashboardCard } from './DashboardCard'
import type { RegionDensityRow } from '../../../api/adminDashboard'
import { formatCount } from '../adminFormat'

interface RegionDensityCardProps {
  rows: RegionDensityRow[]
}

/** Tüm değerler sıfırken bölen sıfır olmasın; `<progress max>` 0 kabul etmiyor. */
const MIN_BAR_MAX = 1

/**
 * Yatay çubuk grafik — grafik kütüphanesi YOK. İhtiyaç tek eksenli, beş satırlık
 * bir oran gösterimi; bunun için bağımlılık eklemek paket boyutunu ve tema uyumu
 * yükünü boşuna artırırdı.
 *
 * Oran native `<progress value max>` ile veriliyor: CLAUDE.md inline `style={{}}`
 * yasağı yüzünden genişlik JS'ten yazılamıyor, `max` en yüksek değere kurulunca
 * tarayıcı oranı kendisi çiziyor (belge: "çubuk uzunlukları en yüksek değere
 * oranlanır"). Görünüm `styles/dashboardBar.css`'te.
 *
 * Erişilebilirlik: çubuk salt görsel (`aria-hidden`); bölge adı ve değer zaten
 * metin olarak okunuyor, ekran okuyucu satırı "Marmara 28" diye duyar.
 */
export function RegionDensityCard({ rows }: RegionDensityCardProps) {
  const largest = rows.reduce((max, row) => Math.max(max, row.count), 0)

  return (
    <DashboardCard
      title="Bölge Bazlı Yoğunluk"
      icon={Clock}
      headerSlot={<span className="text-xs text-ink-muted">Bugün gelen projeler</span>}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">Bugün için bölge verisi yok.</p>
      ) : (
        <dl className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.region} className="flex items-center gap-3">
              <dt className="w-28 shrink-0 text-xs text-ink-muted">{row.region}</dt>
              <progress
                aria-hidden
                className="dashboard-bar flex-1"
                value={row.count}
                max={Math.max(largest, MIN_BAR_MAX)}
              />
              <dd className="w-8 shrink-0 text-right text-sm tabular-nums text-ink">
                {formatCount(row.count)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </DashboardCard>
  )
}
