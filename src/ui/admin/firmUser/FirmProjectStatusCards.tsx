import { CircleCheck, CircleX, FileClock, PencilRuler } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from '../../../api/projects'
import { formatCount } from '../adminFormat'
import { projectListPathForStatus } from '../adminNavItems'
import { ADMIN_FOCUS_RING, formCardVariants } from '../adminVariants'

const STATUS_ICONS: Record<ProjectStatus, LucideIcon> = {
  taslak: PencilRuler,
  onayBekleyen: FileClock,
  onaylanan: CircleCheck,
  reddedilen: CircleX,
}

/** Adet henüz gelmediyse rakam yerine bu; kart yerinde durur, sayfa zıplamaz. */
const PENDING_VALUE = '…'

interface FirmProjectStatusCardsProps {
  /** `undefined` = adetler yolda. Sıfırla KARIŞTIRILMAZ: sıfır gerçek bir cevap. */
  counts: Record<ProjectStatus, number> | undefined
  /** Kartların altında yazan kapsam cümlesi (tarih aralığı). */
  rangeLabel: string
}

/**
 * Firmanın projelerinin durum dağılımı — proje firması anasayfasının ilk satırı.
 *
 * Yönetici anasayfasındaki `SummaryCards`'ın kopyası DEĞİL: o firma/kullanıcı
 * sayılarını gösteriyor ve kapsam seçicisine bağlı, buradaki dört kart tek bir
 * uçtan (`GET /api/projects/status-counts`) gelen durum adetleri. Ortak olan
 * yalnız kart kabuğu (`formCardVariants`) ve sayı biçimlendirmesi.
 *
 * Her kart listedeki KENDİ sekmesine gidiyor; adetle listenin aynı süzgeci
 * paylaşması için tarih aralığı da listenin varsayılanıyla aynı (çağıran
 * hesaplıyor), yoksa kart "12" derken liste 3 satır gösterirdi.
 */
export function FirmProjectStatusCards({ counts, rangeLabel }: FirmProjectStatusCardsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {PROJECT_STATUSES.map((status) => {
        const Icon = STATUS_ICONS[status]

        return (
          <Link
            key={status}
            to={projectListPathForStatus(status)}
            className={formCardVariants({
              className: `flex-row gap-4 transition-colors hover:bg-surface-sunken ${ADMIN_FOCUS_RING}`,
            })}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken">
              <Icon aria-hidden className="size-5 text-accent-ink" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-2xl font-semibold tabular-nums text-ink">
                {counts === undefined ? PENDING_VALUE : formatCount(counts[status])}
              </span>
              <span className="text-sm text-ink-muted">{PROJECT_STATUS_LABELS[status]}</span>
              <span className="mt-1 text-xs text-ink-muted">{rangeLabel}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
