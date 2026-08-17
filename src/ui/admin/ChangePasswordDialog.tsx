import { CircleCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { AdminDialog } from './AdminDialog'
import { NoticeBar } from './NoticeBar'
import { adminButtonVariants } from './adminVariants'
import {
  EMPTY_CHANGE_PASSWORD_VALUES,
  validateChangePassword,
  type ChangePasswordErrors,
  type ChangePasswordValues,
} from './changePasswordSchema'
import { PasswordField } from './form/PasswordField'
import { PASSWORD_RULE_MESSAGE } from './form/passwordPolicy'
import { changePassword } from '../../api/auth'
import { ApiError } from '../../api/http'

const DIALOG_TITLE = 'Şifrenizi Değiştirin'

const DESCRIPTION =
  'Mevcut şifrenizi ve yeni şifrenizi girerek hesabınızın şifresini güncelleyebilirsiniz.'

const SUCCESS_MESSAGE = 'Şifreniz güncellendi. Oturumunuz açık kalmaya devam ediyor.'

/** Ağ/5xx yolu. Sunucunun kendi metni varsa (400) o gösterilir; bu yedek. */
const GENERIC_ERROR_MESSAGE = 'Şifre değiştirilemedi. Bağlantınızı kontrol edip tekrar deneyin.'

const BAD_REQUEST = 400

/**
 * Sunucu hatasını kullanıcıya gösterilecek metne çevirir.
 *
 * **400'de sunucunun KENDİ mesajı gösterilir** (yanlış mevcut şifre, politikaya
 * uymayan yeni şifre gibi sebebi yalnız sunucu biliyor) — `http.ts` bunu zaten
 * gövdeden çıkarıyor, yani ekrana ham JSON düşmüyor. Gerisi tek genel cümleye
 * iner; 401 buraya hiç gelmez, orada oturum düşer ve `RequireAuth` yönlendirir.
 */
function describeError(error: unknown): string {
  if (error instanceof ApiError && error.status === BAD_REQUEST && error.message !== '') {
    return error.message
  }

  return GENERIC_ERROR_MESSAGE
}

interface ChangePasswordDialogProps {
  onClose: () => void
}

export function ChangePasswordDialog({ onClose }: ChangePasswordDialogProps) {
  const [values, setValues] = useState<ChangePasswordValues>(EMPTY_CHANGE_PASSWORD_VALUES)
  const [errors, setErrors] = useState<ChangePasswordErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)

  const setValue = (field: keyof ChangePasswordValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    // Kullanıcı alanı düzeltirken eski hata ANINDA kalkar.
    setErrors((current) => {
      if (current[field] === undefined) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    const nextErrors = validateChangePassword(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      // Yanıttaki YENİ token oturuma yazılıyor (api/auth.ts): şifre değişince
      // sunucu eski token'ları geçersiz kılıyor.
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      setIsDone(true)
    } catch (error) {
      // Girilen veri KORUNUR: kullanıcı formu baştan doldurmasın.
      setSubmitError(describeError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isDone) {
    return (
      <AdminDialog title={DIALOG_TITLE} onClose={onClose}>
        <div role="status" className="mt-4 flex items-start gap-3 text-sm text-ink">
          <CircleCheck aria-hidden className="size-5 shrink-0 text-success" />
          <p>{SUCCESS_MESSAGE}</p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={adminButtonVariants({ tone: 'primary' })}
          >
            Kapat
          </button>
        </div>
      </AdminDialog>
    )
  }

  return (
    <AdminDialog title={DIALOG_TITLE} onClose={onClose}>
      <p className="mt-1 text-sm text-ink-muted">{DESCRIPTION}</p>

      {submitError !== null && (
        <div className="mt-4">
          <NoticeBar tone="error" message={submitError} onDismiss={() => setSubmitError(null)} />
        </div>
      )}

      <form noValidate aria-label={DIALOG_TITLE} onSubmit={(event) => void handleSubmit(event)}>
        {/* `fieldset` gönderim sürerken tüm alanları tek hamlede kilitler. */}
        <fieldset disabled={isSubmitting} className="mt-4 flex min-w-0 flex-col gap-4">
          <PasswordField
            id="change-password-current"
            label="Mevcut Şifre"
            labelNote="*"
            autoComplete="current-password"
            value={values.currentPassword}
            error={errors.currentPassword}
            onChange={(value) => setValue('currentPassword', value)}
          />

          <PasswordField
            id="change-password-new"
            label="Yeni Şifre"
            labelNote="*"
            autoComplete="new-password"
            hint={PASSWORD_RULE_MESSAGE}
            value={values.newPassword}
            error={errors.newPassword}
            onChange={(value) => setValue('newPassword', value)}
          />

          <PasswordField
            id="change-password-repeat"
            label="Yeni Şifre Tekrar"
            labelNote="*"
            autoComplete="new-password"
            value={values.repeatPassword}
            error={errors.repeatPassword}
            onChange={(value) => setValue('repeatPassword', value)}
          />

          <div className="mt-1 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={adminButtonVariants({ tone: 'secondary' })}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              aria-busy={isSubmitting}
              className={adminButtonVariants({ tone: 'primary' })}
            >
              {isSubmitting ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
            </button>
          </div>
        </fieldset>
      </form>
    </AdminDialog>
  )
}
