import { useCallback, useState } from 'react'

import { ApiError } from '../../../api/http'
import type { ProjectFirmFullDto } from '../../../api/projectFirmDto'
import { updateProjectFirmContact } from '../../../api/projectFirmForm'
import { toUserPayload, updateUser, type User } from '../../../api/users'
import { toPhoneDigits } from '../../../core/phone'
import type { NoticeTone } from '../NoticeBar'

/**
 * Ekranın düzenlenebilir alanları ve SAHİPLERİ:
 *
 * - `email`, `userPhoneDigits` → KULLANICI kaydı (`PUT /api/users/{id}`)
 * - gerisi → FİRMA kaydı (`PUT /api/projectfirms/{id}`)
 *
 * `username` burada YOK: `PUT /api/users/{id}` gövdesinde kullanıcı adı
 * bulunmuyor, yani sunucu onu değiştirmiyor — salt okunur gösteriliyor.
 */
export interface ProfileFormValues {
  serialNumber: string
  title: string
  contactPerson: string
  email: string
  address: string
  /** Kullanıcının kendi telefonu; HAM rakam (maske yalnız görüntüde). */
  userPhoneDigits: string
  /** Firmanın ikinci telefonu; HAM rakam. */
  firmPhone2Digits: string
}

export type ProfileField = keyof ProfileFormValues

export const PROFILE_ERRORS = {
  title: 'Ünvan zorunludur.',
  emailInvalid: 'Geçerli bir e-posta adresi giriniz.',
  phoneInvalid: 'Geçerli bir telefon numarası giriniz.',
  userSaveFailed: 'Kişi bilgileri kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.',
  firmSaveFailed: 'Firma bilgileri kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.',
} as const

/**
 * KISMİ başarı: kullanıcı kaydı yazıldı ama firma kaydı yazılamadı. İki ayrı
 * uç ve ortak transaction YOK, bu yüzden bu hâl gerçekten oluşabiliyor ve
 * kullanıcıya "hepsi kaydedildi" DEMEK yanlış olurdu — hangi yarının gittiğini
 * söylüyoruz ki tekrar denerken ne beklemesi gerektiğini bilsin.
 */
const PARTIAL_SUCCESS_PREFIX = 'Kişi bilgileriniz kaydedildi, ancak firma bilgileri kaydedilemedi'

/** Sunucunun kendi mesajı varsa o gösterilir; `http.ts` gövdeden çıkarıyor,
    yani ekrana ham JSON düşmüyor. Yoksa işlem bazlı genel cümleye inilir. */
function describeSaveError(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message !== '' ? error.message : fallback
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Telefon zorunlu DEĞİL (kayıt boş olabiliyor); dolu ise biçim aranır. */
const PHONE_DIGIT_COUNT = 11

export type ProfileErrors = Partial<Record<ProfileField, string>>

export function validateProfile(values: ProfileFormValues): ProfileErrors {
  const errors: ProfileErrors = {}

  if (values.title.trim() === '') errors.title = PROFILE_ERRORS.title

  if (values.email.trim() !== '' && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = PROFILE_ERRORS.emailInvalid
  }

  if (values.userPhoneDigits !== '' && values.userPhoneDigits.length !== PHONE_DIGIT_COUNT) {
    errors.userPhoneDigits = PROFILE_ERRORS.phoneInvalid
  }

  if (values.firmPhone2Digits !== '' && values.firmPhone2Digits.length !== PHONE_DIGIT_COUNT) {
    errors.firmPhone2Digits = PROFILE_ERRORS.phoneInvalid
  }

  return errors
}

/** Sunucudan okunan iki kaydı forma çevirir; boş alan boş dize olur. */
export function toProfileValues(
  user: User,
  firm: ProjectFirmFullDto | undefined,
): ProfileFormValues {
  return {
    serialNumber: firm?.serialNumber ?? '',
    title: firm?.title ?? '',
    contactPerson: firm?.contactPerson ?? '',
    // Email KULLANICININ kendi e-postası; firmanınki bu ekranda kullanılmıyor.
    email: user.email ?? '',
    address: firm?.address ?? '',
    userPhoneDigits: toPhoneDigits(user.phone ?? ''),
    firmPhone2Digits: toPhoneDigits(firm?.phone2 ?? ''),
  }
}

/** Boş metin sunucuya boş dize değil `null` gider ("girilmedi" tek biçimde). */
function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

interface UseProfileFormOptions {
  user: User
  firm: ProjectFirmFullDto | undefined
  initialValues: ProfileFormValues
  /**
   * YALNIZ önbellek tazeleme. Başarı mesajını tetiklemez: kısmi başarıda da
   * çağrılıyor (kullanıcı tarafı yazılmış oluyor) ve o hâlde ekran "tamam"
   * dememeli. Mesajı `submit()`in dönüş değeri belirliyor.
   */
  onRefresh: () => void
}

export interface ProfileNotice {
  tone: NoticeTone
  message: string
}

export interface ProfileForm {
  values: ProfileFormValues
  errors: ProfileErrors
  isSubmitting: boolean
  /** Hata ya da KISMİ başarı; ikisi de aynı şeritte, tonu ayırıyor. */
  submitNotice: ProfileNotice | null
  /** Firma alanları yalnız firma kaydı VARSA düzenlenebilir. */
  canEditFirmFields: boolean
  setValue: (field: ProfileField, value: string) => void
  submit: () => Promise<boolean>
  reset: () => void
  clearSubmitNotice: () => void
}

/**
 * Kişi Bilgileri formunun durumu.
 *
 * İKİ ayrı uca yazıyor ve bu bilinçli: Email ile Telefon 1 kullanıcının
 * kaydında (`PUT /api/users/{id}`), firma alanları firmanın kaydında
 * (`PUT /api/projectfirms/{id}`). Tek isteğe indirmek, sunucuda olmayan bir
 * birleşik uç uydurmak olurdu.
 *
 * SIRA önemli: önce kullanıcı, sonra firma. Kullanıcı isteği düşerse firma
 * isteği HİÇ gönderilmiyor — yarım kalan yazma sayısı en azda tutuluyor.
 * Firma isteği düşerse kullanıcı tarafı zaten yazılmış oluyor ve ekran bunu
 * "tamamen başarılı" göstermiyor (kısmi başarı şeridi).
 */
export function useProfileForm({
  user,
  firm,
  initialValues,
  onRefresh,
}: UseProfileFormOptions): ProfileForm {
  // Tembel başlatıcı: açılış değerleri bir KEZ alınır, sonraki render'larda
  // kullanıcının yazdığının üstüne binmez.
  const [values, setValues] = useState<ProfileFormValues>(() => initialValues)
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitNotice, setSubmitNotice] = useState<ProfileNotice | null>(null)

  const setValue = useCallback((field: ProfileField, value: string) => {
    const isPhone = field === 'userPhoneDigits' || field === 'firmPhone2Digits'
    setValues((current) => ({ ...current, [field]: isPhone ? toPhoneDigits(value) : value }))

    // Kullanıcı alanı düzeltirken eski hata ANINDA kalkar.
    setErrors((current) => {
      if (current[field] === undefined) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const submit = useCallback(async (): Promise<boolean> => {
    setSubmitNotice(null)

    const nextErrors = validateProfile(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return false

    setIsSubmitting(true)
    try {
      // 1) Kullanıcı kaydı. Düşerse firma isteği GÖNDERİLMEZ.
      try {
        await updateUser(
          user.id,
          toUserPayload(user, {
            email: optionalText(values.email),
            phone: optionalText(values.userPhoneDigits),
          }),
        )
      } catch (error) {
        // Girilen veri KORUNUR: kullanıcı formu baştan doldurmasın.
        setSubmitNotice({
          tone: 'error',
          message: describeSaveError(error, PROFILE_ERRORS.userSaveFailed),
        })
        return false
      }

      // 2) Firma kaydı; firma bağı yoksa bu adım hiç yok.
      if (firm !== undefined) {
        try {
          await updateProjectFirmContact(firm, {
            title: values.title.trim(),
            serialNumber: optionalText(values.serialNumber),
            contactPerson: optionalText(values.contactPerson),
            phone2: optionalText(values.firmPhone2Digits),
            address: optionalText(values.address),
          })
        } catch (error) {
          // Kullanıcı tarafı YAZILDI: önbellek tazelenmeli, ama ekran "tamam"
          // dememeli.
          onRefresh()
          setSubmitNotice({
            tone: 'warning',
            message: `${PARTIAL_SUCCESS_PREFIX}: ${describeSaveError(error, PROFILE_ERRORS.firmSaveFailed)}`,
          })
          return false
        }
      }

      onRefresh()
      return true
    } finally {
      setIsSubmitting(false)
    }
  }, [values, user, firm, onRefresh])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setSubmitNotice(null)
  }, [initialValues])

  return {
    values,
    errors,
    isSubmitting,
    submitNotice,
    canEditFirmFields: firm !== undefined,
    setValue,
    submit,
    reset,
    clearSubmitNotice: () => setSubmitNotice(null),
  }
}
