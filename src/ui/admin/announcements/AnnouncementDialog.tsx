import { Megaphone } from 'lucide-react'
import { useId, type FormEvent } from 'react'

import { AnnouncementPreview } from './AnnouncementPreview'
import type { AnnouncementField } from './announcementSchema'
import { useAnnouncementForm } from './useAnnouncementForm'
import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
  type Announcement,
} from '../../../api/adminDashboard'
import { MOCK_REGIONS } from '../../../api/adminDashboardMock'
import { AdminDialog } from '../AdminDialog'
import { NoticeBar } from '../NoticeBar'
import { adminButtonVariants } from '../adminVariants'
import { CheckboxField } from '../form/CheckboxField'
import { SelectField } from '../form/SelectField'
import { TextAreaField } from '../form/TextAreaField'
import { TextField } from '../form/TextField'

const DIALOG_TITLE = 'Duyuru Yayınla'

const ALL_REGIONS_OPTION_LABEL = 'Tüm bölgeler'

/** TODO(esra): duyurunun bölge listesi gerçek uçtan gelecek; bugün mock. */
const REGION_OPTIONS = MOCK_REGIONS.map((region) => ({ value: region, label: region }))

interface AnnouncementDialogProps {
  onClose: () => void
  onPublished: (announcement: Announcement) => void
}

/**
 * Duyuru yayınlama formu. Ekranın kendisi değil DİYALOG: kullanıcı anasayfadan
 * ayrılmadan yazıp yayınlıyor ve sonucu arkadaki Duyurular kartında hemen
 * görüyor; ayrı bir sayfa, tek alanlık bir iş için bağlamı koparırdı.
 *
 * Alanların yanında canlı önizleme var — duyurunun kullanıcı ekranında nasıl
 * görüneceği (kısaltma dahil) yayınlamadan önce görülüyor.
 */
export function AnnouncementDialog({ onClose, onPublished }: AnnouncementDialogProps) {
  const fieldPrefix = useId()
  const fieldElementId = (field: AnnouncementField) => `${fieldPrefix}-${field}`

  const form = useAnnouncementForm({ fieldElementId })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const published = await form.submit()
    if (published !== null) onPublished(published)
  }

  return (
    <AdminDialog title={DIALOG_TITLE} size="lg" onClose={onClose}>
      <p className="mt-1 text-sm text-ink-muted">
        Yayınlanan duyuru, kullanıcıların anasayfasındaki Duyurular kartında görünür.
      </p>

      {form.submitError !== null && (
        <div className="mt-4">
          <NoticeBar tone="error" message={form.submitError} onDismiss={form.clearSubmitError} />
        </div>
      )}

      <form noValidate aria-label={DIALOG_TITLE} onSubmit={(event) => void handleSubmit(event)}>
        {/* `fieldset` gönderim sürerken tüm alanları tek hamlede kilitler: istek
            uçarken yapılan değişiklik kaydedilmeden diyalog kapanırdı. */}
        <fieldset disabled={form.isSubmitting} className="mt-4 flex min-w-0 flex-col gap-4">
          <TextField
            id={fieldElementId('title')}
            label="Başlık"
            value={form.values.title}
            placeholder="Örn. Planlı Bakım Bildirimi"
            maxLength={ANNOUNCEMENT_TITLE_MAX_LENGTH}
            error={form.errors.title}
            onChange={(value) => form.setValue('title', value)}
          />

          <SelectField
            id={fieldElementId('region')}
            label="Kapsam"
            value={form.values.region}
            options={REGION_OPTIONS}
            placeholder={ALL_REGIONS_OPTION_LABEL}
            hint="Bölge seçilmezse duyuru tüm bölgelerdeki kullanıcılara gösterilir."
            error={form.errors.region}
            onChange={(value) => form.setValue('region', value)}
          />

          <TextAreaField
            id={fieldElementId('body')}
            label="Duyuru Metni"
            value={form.values.body}
            placeholder="Duyurunun içeriğini yazın."
            hint={`${form.values.body.length} / ${ANNOUNCEMENT_BODY_MAX_LENGTH} karakter — kartta ilk satırları görünür.`}
            error={form.errors.body}
            onChange={(value) => form.setValue('body', value)}
          />

          <CheckboxField
            id={`${fieldPrefix}-isSystem`}
            label="Sistem duyurusu"
            labelNote="(bakım / kesinti)"
            value={form.values.isSystem}
            hint="Kartta amber kenarlıkla, diğer duyurulardan ayrışarak gösterilir."
            onChange={form.setIsSystem}
          />

          <AnnouncementPreview values={form.values} />

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={adminButtonVariants({ tone: 'secondary' })}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              aria-busy={form.isSubmitting}
              className={adminButtonVariants({ tone: 'primary' })}
            >
              <Megaphone aria-hidden className="size-4" />
              {form.isSubmitting ? 'Yayınlanıyor…' : 'Yayınla'}
            </button>
          </div>
        </fieldset>
      </form>
    </AdminDialog>
  )
}
