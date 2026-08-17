import { Clock } from 'lucide-react'

import { DashboardCard } from './DashboardCard'
import type { DensityBy, DensityRow } from '../../../api/adminDashboard'
import { formatCount } from '../adminFormat'

interface DensityCardProps {
  /** Kırılımın boyutu; başlık bunu söyler. Sunucu kapsamdan türetiyor. */
  densityBy: DensityBy
  rows: DensityRow[]
}

/** Tüm değerler sıfırken bölen sıfır olmasın; `<progress max>` 0 kabul etmiyor. */
const MIN_BAR_MAX = 1

const CARD_TITLES: Record<DensityBy, string> = {
  group: 'Grup Bazlı Yoğunluk',
  firm: 'Firma Bazlı Yoğunluk',
}

const EMPTY_MESSAGES: Record<DensityBy, string> = {
  group: 'Bugün için grup verisi yok.',
  firm: 'Bugün için firma verisi yok.',
}

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
 * Erişilebilirlik: çubuk salt görsel (`aria-hidden`); ad ve değer zaten metin
 * olarak okunuyor, ekran okuyucu satırı "AKSA 28" diye duyar.
 */
export function DensityCard({ densityBy, rows }: DensityCardProps) {
  const largest = rows.reduce((max, row) => Math.max(max, row.projectCount), 0)

  return (
    <DashboardCard
      title={CARD_TITLES[densityBy]}
      icon={Clock}
      headerSlot={<span className="text-xs text-ink-muted">Bugün gelen projeler</span>}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">{EMPTY_MESSAGES[densityBy]}</p>
      ) : (
        <dl className="flex flex-col gap-3">
          {rows.map((row) => (
            // Anahtar KİMLİK: iki farklı kaydın adı aynı olabilir, sunucu
            // kırılım başına kimlik veriyor.
            <div key={row.id} className="flex items-center gap-3">
              <dt className="w-28 shrink-0 text-xs text-ink-muted">{row.name}</dt>
              <progress
                aria-hidden
                className="dashboard-bar flex-1"
                value={row.projectCount}
                max={Math.max(largest, MIN_BAR_MAX)}
              />
              <dd className="w-8 shrink-0 text-right text-sm tabular-nums text-ink">
                {formatCount(row.projectCount)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </DashboardCard>
  )
}
