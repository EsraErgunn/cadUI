import { AnnouncementItem } from './AnnouncementItem'
import type { AnnouncementFormValues } from './announcementSchema'
import {
  MANAGEMENT_ANNOUNCEMENT_SOURCE,
  SYSTEM_ANNOUNCEMENT_SOURCE,
  truncateAnnouncementSummary,
  type Announcement,
} from '../../../api/adminDashboard'

/** Önizleme gerçek bir kayıt değil; kimlik yalnız React anahtarı için gerekli. */
const PREVIEW_ID = 0

const EMPTY_TITLE = 'Duyuru başlığı'
const EMPTY_BODY = 'Duyuru metni burada görünecek.'

interface AnnouncementPreviewProps {
  values: AnnouncementFormValues
}

/**
 * Formun kullanıcı ekranındaki karşılığı. Kısaltmayı veri katmanının kendi
 * fonksiyonu yapıyor: kullanıcı metnin nerede kesileceğini yayınlamadan ÖNCE
 * görür, "kartta yarısı görünmüş" sürprizi olmaz.
 *
 * Tarih ve kaynak da gerçek değerlerle üretiliyor; kaynağı sunucu belirleyecek
 * ama ayrım (sistem / yönetim) istemcideki kutucuktan geldiği için önizleme
 * amber kenarlığı doğru gösterebiliyor.
 */
export function AnnouncementPreview({ values }: AnnouncementPreviewProps) {
  const body = values.body.trim()

  const preview: Announcement = {
    id: PREVIEW_ID,
    title: values.title.trim() === '' ? EMPTY_TITLE : values.title.trim(),
    summary: body === '' ? EMPTY_BODY : truncateAnnouncementSummary(body),
    publishedAt: new Date().toISOString(),
    source: values.isSystem ? SYSTEM_ANNOUNCEMENT_SOURCE : MANAGEMENT_ANNOUNCEMENT_SOURCE,
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Önizleme</p>
      {/* Önizleme salt görsel: ekran okuyucu kullanıcısı zaten alanlara yazdığı
          metni biliyor, aynı metni ikinci kez duymak gezinmeyi uzatır. */}
      <ul aria-hidden className="flex flex-col gap-3">
        <AnnouncementItem announcement={preview} />
      </ul>
      <p className="text-xs text-ink-disabled">
        Duyuru, kullanıcıların anasayfasındaki Duyurular kartında bu şekilde görünür.
      </p>
    </div>
  )
}
