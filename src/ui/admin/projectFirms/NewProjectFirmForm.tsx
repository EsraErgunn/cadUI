import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { ProjectFirmAuthorizationCard } from './ProjectFirmAuthorizationCard'
import { ProjectFirmInfoCard } from './ProjectFirmInfoCard'
import { projectFirmFieldId } from './projectFirmSchema'
import { useProjectFirmForm, type ProjectFirmSaveResult } from './useProjectFirmForm'
import { getProjectFirmList, type ProjectFirm } from '../../../api/projectFirms'
import { ConfirmDialog } from '../ConfirmDialog'
import { NoticeBar } from '../NoticeBar'
import { PROJECT_FIRMS_PATH } from '../adminNavItems'
import { ADMIN_FORM_ACTION_WIDTH, adminButtonVariants } from '../adminVariants'

const FORM_LABEL = 'Yeni Proje Firması Ekle'

const CANCEL_TITLE = 'Kaydedilmemiş değişiklikler var'
const CANCEL_DESCRIPTION = 'Yapılan değişiklikler kaydedilmeden çıkılacaktır.'

/** Veri gelmeden TEK bir boş dizi: her render'da yeni `[]` gönderilseydi
    `submit`'in bağımlılığı boşuna değişirdi. */
const EMPTY_FIRMS: ProjectFirm[] = []

/** Liste tek seferde çekiliyor; benzersizlik kontrolü için tazeliği bu kadarı yeter. */
const PROJECT_FIRM_LIST_STALE_MS = 5 * 60 * 1000

/**
 * Formun kabuğu: iki bölüm + Kaydet/İptal.
 *
 * Benzersizlik ön kontrolünün beslendiği liste, liste ekranıyla AYNI önbellek
 * anahtarından okunuyor (`projectFirmList`): "Yeni Proje Firması" düğmesine
 * listeden gelen kullanıcı için ek istek çıkmaz. Liste yüklenemezse kontrol
 * sessizce atlanır — kolaylık, kritik yol değil.
 */
export function NewProjectFirmForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)

  const { data: existingFirms } = useQuery({
    queryKey: ['projectFirmList'],
    queryFn: ({ signal }) => getProjectFirmList(signal),
    staleTime: PROJECT_FIRM_LIST_STALE_MS,
  })

  const form = useProjectFirmForm({ existingFirms: existingFirms ?? EMPTY_FIRMS })
  const { focusField, clearFocusRequest } = form

  // Doğrulama başarısızsa odak İLK hatalı alana taşınır. İstek tek seferlik
  // olduğu için okunduktan hemen sonra temizlenir.
  useEffect(() => {
    if (focusField === null) return

    document.getElementById(projectFirmFieldId(focusField))?.focus()
    clearFocusRequest()
  }, [focusField, clearFocusRequest])

  const goToList = (saved?: ProjectFirmSaveResult) => {
    void navigate(PROJECT_FIRMS_PATH, {
      state:
        saved === undefined
          ? undefined
          : {
              savedFirmId: saved.firmId,
              // Yazılamayan bağlar liste ekranında ADLARIYLA uyarı şeridine
              // dönüyor — sessiz yarım kayıt olmasın.
              failedAuthorizationFirms: saved.failedAuthorizationFirms,
            },
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const saved = await form.submit()
    if (saved === null) return

    // Liste taze veriyle açılmalı: yeni kayıt toplam adede ve listeye yansısın (KK-8).
    void queryClient.invalidateQueries({ queryKey: ['projectFirmList'] })
    goToList(saved)
  }

  const handleCancel = () => {
    // Hiçbir alana dokunulmadıysa onay sormak gereksiz sürtünme.
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
        {/* `fieldset` gönderim sürerken TÜM alanları tek hamlede kilitler.
            `min-w-0` şart — tarayıcı varsayılanı `min-content`. */}
        <fieldset disabled={form.isSubmitting} className="flex min-w-0 flex-col gap-5">
          <ProjectFirmAuthorizationCard
            authorizations={form.authorizations}
            authorizationError={form.authorizationError}
            onAdd={form.addAuthorizations}
            onRemove={form.removeAuthorizationGasFirm}
          />

          <ProjectFirmInfoCard form={form} />

          {/* Mockup: sağ altta solda İptal, sağda Kaydet. */}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className={adminButtonVariants({ tone: 'secondary', className: ADMIN_FORM_ACTION_WIDTH })}
            >
              İptal
            </button>
            <button
              type="submit"
              aria-busy={form.isSubmitting}
              className={adminButtonVariants({ tone: 'primary', className: ADMIN_FORM_ACTION_WIDTH })}
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
