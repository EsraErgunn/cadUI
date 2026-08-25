import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { GasDistributionUserFields } from './GasDistributionUserFields'
import {
  buildEmptyGasDistributionUserValues,
  firstGasDistributionUserErrorField,
  gasDistributionUserFieldId,
  validateGasDistributionUser,
  type GasDistributionUserErrors,
  type GasDistributionUserField,
  type GasDistributionUserFormValues,
} from './gasDistributionUserSchema'
import { fetchAllFirms } from '../../../api/adminFirms'
import { registerUser } from '../../../api/auth'
import { ApiError } from '../../../api/http'
import { ROLE_CODES } from '../../../api/roles'
import { buildUsernameFromFullName } from '../../../api/turkishText'
import { toUserPayload, updateUser, type User } from '../../../api/users'
import { toPhoneDigits } from '../../../core/phone'
import { ConfirmDialog } from '../ConfirmDialog'
import { NoticeBar } from '../NoticeBar'
import { GAS_DISTRIBUTION_USERS_PATH } from '../adminNavItems'
import { ADMIN_FORM_ACTION_WIDTH, adminButtonVariants } from '../adminVariants'

const CREATE_FORM_LABEL = 'Yeni Gaz Dağıtım Kullanıcısı'
const UPDATE_FORM_LABEL = 'Gaz Dağıtım Kullanıcısı Güncelleme'

const CANCEL_TITLE = 'Kaydedilmemiş değişiklikler var'
const CANCEL_DESCRIPTION = 'Yapılan değişiklikler kaydedilmeden çıkılacaktır.'

const SUBMIT_ERROR_MESSAGE =
  'Kullanıcı kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.'

export interface GasDistributionUserFormProps {
  /** `null` → oluşturma; dolu → güncelleme (aynı ekran, proje firması deseni). */
  user?: User | null
}

/**
 * Gaz dağıtım kullanıcısı — oluşturma ve GÜNCELLEME aynı ekran.
 *
 * Oluşturma `POST /api/auth/register`, güncelleme `PUT /api/users/{id}`. Rol
 * sabit: ekran yalnız gaz dağıtım kullanıcısı üretiyor, seçtirilecek bir şey yok.
 *
 * `projectFirmId` gövdeye `null` gidiyor: gövde iki firma bağını da taşıyor ama
 * bu roldeki kullanıcı proje firmasına bağlanmıyor.
 *
 * GÜNCELLEMEDE kullanıcı adı ve şifre alanları ÇİZİLMEZ — `UserUpdateDto`
 * ikisini de almıyor. Düzenlenebilir alanlar sunucunun gerçekten kabul
 * ettikleri: ad soyad, e-posta, telefon ve gaz dağıtım firması. Gövde okunan
 * kayıttan türetiliyor (`toUserPayload`), böylece ekranda olmayan alanlar
 * (rol, proje firması bağı) silinmiyor.
 */
export function GasDistributionUserForm({ user = null }: GasDistributionUserFormProps = {}) {
  const isUpdate = user !== null
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [values, setValues] = useState<GasDistributionUserFormValues>(() =>
    user === null
      ? buildEmptyGasDistributionUserValues()
      : {
          ...buildEmptyGasDistributionUserValues(),
          email: user.email ?? '',
          phoneDigits: user.phone === null || user.phone === undefined ? '' : toPhoneDigits(user.phone),
          fullName: user.fullName,
          username: user.username,
          gasFirmId: user.gasDistributionFirmId === null || user.gasDistributionFirmId === undefined
            ? ''
            : String(user.gasDistributionFirmId),
        },
  )
  const [errors, setErrors] = useState<GasDistributionUserErrors>({})
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  /** Kullanıcı adına elle dokunulduysa otomatik üretim durur (proje firması formundaki kural). */
  const isUsernameEditedRef = useRef(false)

  const { data: firms } = useQuery({
    queryKey: ['gasDistributionFirmOptions'],
    queryFn: ({ signal }) => fetchAllFirms(signal),
  })

  // Sıralama İSTEMCİDE ve Türkçe: sunucu 'Ç'yi 'D'den sonra veriyor.
  const firmOptions = useMemo(
    () =>
      (firms ?? [])
        .map((firm) => ({ value: String(firm.id), label: firm.name }))
        .sort((left, right) => left.label.localeCompare(right.label, 'tr')),
    [firms],
  )

  const setValue = (field: GasDistributionUserField, value: string) => {
    setIsDirty(true)
    setValues((current) => {
      const next = { ...current, [field]: field === 'phoneDigits' ? toPhoneDigits(value) : value }
      if (field === 'username') isUsernameEditedRef.current = true
      // Kullanıcı adı ad soyaddan türer; kullanıcı ona dokunduğu anda üretim
      // durur, yoksa kişinin yazdığı ad her tuşta silinirdi.
      if (field === 'fullName' && !isUsernameEditedRef.current) {
        next.username = buildUsernameFromFullName(value)
      }
      return next
    })
    setErrors((current) => {
      if (current[field] === undefined) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const goToList = (savedUserId?: number) => {
    void navigate(GAS_DISTRIBUTION_USERS_PATH, {
      state: savedUserId === undefined ? undefined : { savedUserId },
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    const { errors: fieldErrors, data } = validateGasDistributionUser(values, { isUpdate })
    setErrors(fieldErrors)

    const firstInvalid = firstGasDistributionUserErrorField(fieldErrors)
    if (data === null || firstInvalid !== null) {
      // Odak doğrudan taşınıyor: durum üzerinden gidilseydi etkinin içinde
      // setState çağrısı gerekirdi (react-hooks/set-state-in-effect).
      if (firstInvalid !== null) {
        document.getElementById(gasDistributionUserFieldId(firstInvalid))?.focus()
      }
      return
    }

    setIsSubmitting(true)
    try {
      // Gövde OKUNAN kayıttan türetiliyor: `UserUpdateDto` tüm alanları bekliyor
      // ve ekranda olmayanlar (rol, proje firması bağı) geri gönderilmezse
      // sunucuda silinirdi.
      const savedUserId = isUpdate
        ? await (async () => {
            await updateUser(
              user.id,
              toUserPayload(user, {
                fullName: data.fullName.trim(),
                email: data.email.trim(),
                phone: data.phoneDigits === '' ? null : data.phoneDigits,
                gasDistributionFirmId: Number(data.gasFirmId),
              }),
            )
            return user.id
          })()
        : (
            await registerUser({
              fullName: data.fullName.trim(),
              email: data.email.trim(),
              username: data.username.trim(),
              password: data.password,
              phone: data.phoneDigits === '' ? null : data.phoneDigits,
              roleCode: ROLE_CODES.gasDistributionUser,
              projectFirmId: null,
              gasDistributionFirmId: Number(data.gasFirmId),
            })
          ).id

      // Liste taze veriyle açılmalı: kayıt toplam adede ve listeye yansısın.
      void queryClient.invalidateQueries({ queryKey: ['gasDistributionUsers'] })
      goToList(savedUserId)
    } catch (error) {
      // Sunucunun kendi Türkçe metni KORUNUYOR: çakışan e-posta / kullanıcı adı
      // kendi mesajıyla geliyor, genel bir cümle neyi düzelteceğini söylemezdi.
      setSubmitError(error instanceof ApiError ? error.message : SUBMIT_ERROR_MESSAGE)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Hiçbir alana dokunulmadıysa onay sormak gereksiz sürtünme.
    if (!isDirty) {
      goToList()
      return
    }
    setIsCancelConfirmOpen(true)
  }

  return (
    <>
      {submitError !== null && (
        <NoticeBar tone="error" message={submitError} onDismiss={() => setSubmitError(null)} />
      )}

      <form noValidate aria-label={isUpdate ? UPDATE_FORM_LABEL : CREATE_FORM_LABEL} onSubmit={(event) => void handleSubmit(event)}>
        {/* `fieldset` gönderim sürerken TÜM alanları kilitler; `min-w-0` şart —
            tarayıcı varsayılanı `min-content`. */}
        <fieldset disabled={isSubmitting} className="flex min-w-0 flex-col gap-5">
          <GasDistributionUserFields
            values={values}
            errors={errors}
            firmOptions={firmOptions}
            isUpdate={isUpdate}
            onChange={setValue}
          />

          {/* Mockup: sağ altta solda İptal, sağda Kaydet. */}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className={adminButtonVariants({
                tone: 'secondary',
                className: ADMIN_FORM_ACTION_WIDTH,
              })}
            >
              İptal
            </button>
            <button
              type="submit"
              aria-busy={isSubmitting}
              className={adminButtonVariants({
                tone: 'primary',
                className: ADMIN_FORM_ACTION_WIDTH,
              })}
            >
              <Save aria-hidden className="size-4" />
              {isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
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
