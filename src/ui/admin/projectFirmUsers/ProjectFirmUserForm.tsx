import { useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { ProjectFirmUserInfoCard } from './ProjectFirmUserInfoCard'
import { projectFirmUserFieldId } from './projectFirmUserSchema'
import { useProjectFirmUserForm } from './useProjectFirmUserForm'
import type { ProjectFirmUserDetail } from '../../../api/projectFirmUserDto'
import { ConfirmDialog } from '../ConfirmDialog'
import { NoticeBar } from '../NoticeBar'
import { PROJECT_FIRM_USERS_PATH } from '../adminNavItems'
import { ADMIN_FORM_ACTION_WIDTH, adminButtonVariants } from '../adminVariants'

const CANCEL_TITLE = 'Kaydedilmemiş değişiklikler var'
const CANCEL_DESCRIPTION = 'Yapılan değişiklikler kaydedilmeden çıkılacaktır.'

interface ProjectFirmUserFormProps {
  /** `null` → oluşturma; dolu → güncelleme (aynı ekran, KK-25). */
  user: ProjectFirmUserDetail | null
}

export function ProjectFirmUserForm({ user }: ProjectFirmUserFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)

  const form = useProjectFirmUserForm({ user })
  const { focusField, clearFocusRequest } = form

  // Doğrulama başarısızsa odak İLK hatalı alana taşınır. İstek tek seferlik
  // olduğu için okunduktan hemen sonra temizlenir.
  useEffect(() => {
    if (focusField === null) return

    document.getElementById(projectFirmUserFieldId(focusField))?.focus()
    clearFocusRequest()
  }, [focusField, clearFocusRequest])

  const goToList = (saved?: { userId: number; isPersisted: boolean }) => {
    void navigate(PROJECT_FIRM_USERS_PATH, {
      state:
        saved === undefined
          ? undefined
          : { savedUserId: saved.userId, isPersisted: saved.isPersisted },
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const saved = await form.submit()
    if (saved === null) return

    // Liste taze veriyle açılmalı: yeni kayıt toplam adede ve listeye yansısın.
    void queryClient.invalidateQueries({ queryKey: ['projectFirmUserList'] })
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

      <form
        noValidate
        aria-label={user === null ? 'Yeni proje firma kullanıcısı' : 'Proje firma kullanıcısı'}
        onSubmit={(event) => void handleSubmit(event)}
      >
        {/* `fieldset` gönderim sürerken TÜM alanları tek hamlede kilitler.
            `min-w-0` şart — tarayıcı varsayılanı `min-content`. */}
        <fieldset disabled={form.isSubmitting} className="flex min-w-0 flex-col gap-5">
          <ProjectFirmUserInfoCard form={form} />

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
