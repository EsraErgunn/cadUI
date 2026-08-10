import { Globe, MapPin, Megaphone, TriangleAlert } from 'lucide-react'

import {
  SYSTEM_ANNOUNCEMENT_SOURCE,
  type AnnouncementDetail,
} from '../../../api/adminDashboard'
import { formatDateTime } from '../adminFormat'

/** Genel duyurunun kapsam etiketi; bölgeli olanda bölge adı yazar. */
const ALL_REGIONS_LABEL = 'Tüm bölgeler'

interface AnnouncementCardProps {
  announcement: AnnouncementDetail
}

/**
 * Liste satırı. Anasayfadaki `AnnouncementItem` ile aynı işi YAPMIYOR: o dar
 * kartta kısaltılmış özeti gösteriyor, bu ekranın işi duyuruyu TAM göstermek.
 * Ortaklaştırılsalardı biri diğerinin kısıtını taşımak zorunda kalırdı.
 *
 * Sistem duyurusu iki kanaldan ayrışıyor: amber sol kenarlık VE "Sistem" rozeti.
 * Yalnız renk kullanılsaydı ayrımı göremeyen kullanıcıya hiçbir şey söylemezdi.
 */
export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const isSystem = announcement.source === SYSTEM_ANNOUNCEMENT_SOURCE
  const RegionIcon = announcement.region === null ? Globe : MapPin

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border border-edge border-l-4 bg-surface p-5 ${
        isSystem ? 'border-l-warning' : 'border-l-edge'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{announcement.title}</h2>
        <span className="shrink-0 text-xs tabular-nums text-ink-disabled">
          {formatDateTime(announcement.publishedAt)}
        </span>
      </div>

      {/* `whitespace-pre-line`: yazarın bıraktığı satır sonları korunsun —
          duyuru metni çoğu zaman madde madde yazılıyor. */}
      <p className="whitespace-pre-line text-sm text-ink-muted">{announcement.body}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2 py-1">
          {isSystem ? (
            <TriangleAlert aria-hidden className="size-3.5 text-warning" />
          ) : (
            <Megaphone aria-hidden className="size-3.5" />
          )}
          {announcement.source}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2 py-1">
          <RegionIcon aria-hidden className="size-3.5" />
          {announcement.region ?? ALL_REGIONS_LABEL}
        </span>
      </div>
    </li>
  )
}
