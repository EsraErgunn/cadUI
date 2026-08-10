import { SYSTEM_ANNOUNCEMENT_SOURCE, type Announcement } from '../../../api/adminDashboard'
import { formatShortDate } from '../adminFormat'

/** Sistem kaynaklı bakım/kesinti duyurusu amber sol kenarlıkla ayrışır (belge). */
function isSystemAnnouncement(announcement: Announcement): boolean {
  return announcement.source === SYSTEM_ANNOUNCEMENT_SOURCE
}

const ITEM_BASE = 'rounded-lg border-l-4 bg-surface-sunken px-3 py-2'

interface AnnouncementItemProps {
  announcement: Announcement
}

/**
 * Duyuru satırının TEK biçimi. Kart ve form önizlemesi aynı bileşeni kullanır:
 * ikinci bir kopya olsaydı önizleme, yayınlandıktan sonra görünen hâlden sessizce
 * ayrışırdı — önizlemenin tüm değeri bu ikisinin aynı kalmasında.
 */
export function AnnouncementItem({ announcement }: AnnouncementItemProps) {
  const borderTone = isSystemAnnouncement(announcement) ? 'border-warning' : 'border-edge'

  return (
    <li className={`${ITEM_BASE} ${borderTone}`}>
      <h3 className="text-sm font-semibold text-ink">{announcement.title}</h3>
      {/* Özet VERİ katmanında kısaltıldı; burada ek kırpma yok. */}
      <p className="mt-1 text-xs text-ink-muted">{announcement.summary}</p>
      <p className="mt-2 text-xs text-ink-disabled">
        {formatShortDate(announcement.publishedAt)} • {announcement.source}
      </p>
    </li>
  )
}
