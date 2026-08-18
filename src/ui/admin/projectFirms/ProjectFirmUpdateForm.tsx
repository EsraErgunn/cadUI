import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { ProjectFirmInfoCard } from './ProjectFirmInfoCard'
import { projectFirmFieldId, toProjectFirmFormValues } from './projectFirmSchema'
import { useProjectFirmForm } from './useProjectFirmForm'
import type { ProjectFirmFullDto } from '../../../api/projectFirmDto'
import { getProjectFirmList, type ProjectFirm } from '../../../api/projectFirms'
import { ConfirmDialog } from '../ConfirmDialog'
import { NoticeBar } from '../NoticeBar'
import { PROJECT_FIRMS_PATH } from '../adminNavItems'
import { adminButtonVariants } from '../adminVariants'

const FORM_LABEL = 'Proje Firması Güncelle'

const CANCEL_TITLE = 'Kaydedilmemiş değişiklikler var'
const CANCEL_DESCRIPTION = 'Yapılan değişiklikler kaydedilmeden çıkılacaktır.'

/** Veri gelmeden TEK bir boş dizi: her render'da yeni `[]` gönderilseydi
    `submit`'in bağımlılığı boşuna değişirdi. */
const EMPTY_FIRMS: ProjectFirm[] = []

/** Benzersizlik ön kontrolü için bu kadar tazelik yeter. */
const PROJECT_FIRM_LIST_STALE_MS = 5 * 60 * 1000

interface ProjectFirmUpdateFormProps {
  /** TEKİL uçtan (`GET /api/projectfirms/{id}`) okunan kayıt. */
  firm: ProjectFirmFullDto
}

/**
 * Güncelleme formu. `NewProjectFirmForm`'dan AYRI bir kabuk çünkü iki akış
 * gerçekten farklı: eklemede yetkilendirme bölümü zorunlu, güncellemede o bölüm
 * HİÇ YOK — `PUT /api/projectfirms/{id}` yetki kayıtlarını taşımıyor ve tekil uç
 * onları geri vermiyor, gösterilseydi liste boş açılır ve zorunluluk kuralı
 * kaydetmeyi tümden engellerdi. Alan bileşeni (`ProjectFirmInfoCard`) ve form
 * durumu (`useProjectFirmForm`) ikisinde de ORTAK; tasarım değişmiyor.
 */
export function ProjectFirmUpdateForm({ firm }: ProjectFirmUpdateFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)

  // Liste ekranıyla AYNI önbellek anahtarı: listeden gelen kullanıcı için ek
  // istek çıkmaz. Yalnız benzersizlik ön kontrolünü besliyor.
  const { data: existingFirms } = useQuery({
    queryKey: ['projectFirmList'],
    queryFn: ({ signal }) => getProjectFirmList(signal),
    staleTime: PROJECT_FIRM_LIST_STALE_MS,
  })

  const form = useProjectFirmForm({
    existingFirms: existingFirms ?? EMPTY_FIRMS,
    firmId: firm.id,
    // Açılış değerleri DETAY yanıtından; liste satırı seri no/adres/telefon 2
    // taşımadığı için oradan doldurulsaydı kaydetmek o alanları silerdi.
    initialValues: toProjectFirmFormValues(firm),
  })
  const { focusField, clearFocusRequest } = form

  useEffect(() => {
    if (focusField === null) return

    document.getElementById(projectFirmFieldId(focusField))?.focus()
    clearFocusRequest()
  }, [focusField, clearFocusRequest])

  const goToList = (savedFirmId?: number) => {
    void navigate(PROJECT_FIRMS_PATH, {
      state: savedFirmId === undefined ? undefined : { savedFirmId },
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const saved = await form.submit()
    if (saved === null) return

    // Liste ve BU kaydın detayı birlikte tazelenir: kullanıcı geri dönüp aynı
    // kaydı yeniden açtığında eski değerleri görmemeli.
    void queryClient.invalidateQueries({ queryKey: ['projectFirmList'] })
    void queryClient.invalidateQueries({ queryKey: ['projectFirm', firm.id] })
    goToList(saved.firmId)
  }

  const handleCancel = () => {
    if (!form.isDirty) {
      goToList()
      return
    }
    setIsCancelConfirmOpen(true)
  }

  return (
    <>
      {form.submitError !== null && (
        <NoticeBar tone="error" message={form.submitError} onDismiss={form.clearSubmitError} />
      )}

      <form noValidate aria-label={FORM_LABEL} onSubmit={(event) => void handleSubmit(event)}>
        <fieldset disabled={form.isSubmitting} className="flex min-w-0 flex-col gap-5">
          <ProjectFirmInfoCard form={form} isUpdate />

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className={adminButtonVariants({ tone: 'secondary' })}
            >
              İptal
            </button>
            <button
              type="submit"
              aria-busy={form.isSubmitting}
              className={adminButtonVariants({ tone: 'primary' })}
            >
              <Save aria-hidden className="size-4" />
              {form.isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </fieldset>
      </form>

      {isCancelConfirmOpen && (
        <ConfirmDialog
          title={CANCEL_TITLE}
          description={CANCEL_DESCRIPTION}
          confirmLabel="Listeye dön"
          cancelLabel="Formda kal"
          onConfirm={() => goToList()}
          onCancel={() => setIsCancelConfirmOpen(false)}
        />
      )}
    </>
  )
}
