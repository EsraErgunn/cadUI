import { useCallback, useState } from 'react'

import { ApiError } from '../../../api/http'
import {
  PROJECT_FIRM_COMPANY_TYPES,
  type ProjectFirmFullDto,
} from '../../../api/projectFirmDto'
import { updateProjectFirmContact } from '../../../api/projectFirmForm'
import { toUserPayload, updateUser, type User } from '../../../api/users'
import {
  NATIONAL_ID_LENGTH,
  isValidNationalId,
  toNationalIdDigits,
} from '../../../core/nationalId'
import { toPhoneDigits } from '../../../core/phone'
import type { NoticeTone } from '../NoticeBar'

/**
 * Ekranın düzenlenebilir alanları ve SAHİPLERİ:
 *
 * - `email`, `userPhoneDigits` → KULLANICI kaydı (`PUT /api/users/{id}`)
 * - `nationalId` → FİRMA kaydı (`PUT /api/projectfirms/{id}`), yalnız şahısta
 *
 * `username` burada YOK: `PUT /api/users/{id}` gövdesinde kullanıcı adı
 * bulunmuyor, yani sunucu onu değiştirmiyor — salt okunur gösteriliyor.
 * Ünvan / Firma Yetkilisi / Adres / Telefon 2 de ekrandan KALKTI; gövdeye
 * okunan kayıttan gidiyorlar.
 */
export interface ProfileFormValues {
  email: string
  /**
   * ŞAHIS firmasında zorunlu, tüzelde hiç kullanılmaz (§10). Alan bu ekrana
   * SONRADAN eklendi: `PUT /api/projectfirms/{id}` numarayı gövdede istiyor ve
   * ekranda girdi olmadığı için şahıs firmasının her kaydı 400 alıyordu.
   *
   * Değer sunucudan YÜKLENMEZ — yanıt onu maskeli döndürüyor (K103).
   */
  nationalId: string
  /** Kullanıcının kendi telefonu; HAM rakam (maske yalnız görüntüde). */
  userPhoneDigits: string
}

export type ProfileField = keyof ProfileFormValues

export const PROFILE_ERRORS = {
  emailInvalid: 'Geçerli bir e-posta adresi giriniz.',
  nationalId: 'Tc kimlik no zorunludur.',
  nationalIdLength: `Tc kimlik numarası ${NATIONAL_ID_LENGTH} haneli olmalıdır.`,
  nationalIdInvalid: 'Geçerli bir T.C. kimlik numarası giriniz.',
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

/**
 * Doğrulama firmanın TÜRÜNÜ bilmek zorunda: T.C. kimlik alanı yalnız şahıs
 * firmasında zorunlu ve yalnız orada gövdeye giriyor (§10).
 */
export function validateProfile(
  values: ProfileFormValues,
  isSoleProprietorship = false,
): ProfileErrors {
  const errors: ProfileErrors = {}

  if (isSoleProprietorship) {
    const nationalId = values.nationalId.trim()
    if (nationalId === '') errors.nationalId = PROFILE_ERRORS.nationalId
    else if (nationalId.length !== NATIONAL_ID_LENGTH) {
      errors.nationalId = PROFILE_ERRORS.nationalIdLength
    } else if (!isValidNationalId(nationalId)) {
      errors.nationalId = PROFILE_ERRORS.nationalIdInvalid
    }
  }

  if (values.email.trim() !== '' && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = PROFILE_ERRORS.emailInvalid
  }

  if (values.userPhoneDigits !== '' && values.userPhoneDigits.length !== PHONE_DIGIT_COUNT) {
    errors.userPhoneDigits = PROFILE_ERRORS.phoneInvalid
  }

  return errors
}

/** Sunucudan okunan kullanıcı kaydını forma çevirir; boş alan boş dize olur. */
export function toProfileValues(user: User): ProfileFormValues {
  return {
    // Email KULLANICININ kendi e-postası; firmanınki bu ekranda kullanılmıyor.
    email: user.email ?? '',
    // Sunucudaki değer MASKELİ ("*******1234"): yüklenmiyor, yeniden isteniyor.
    nationalId: '',
    userPhoneDigits: toPhoneDigits(user.phone ?? ''),
  }
}

/** Alana yazılabilecekleri kısıtlar: harf ve işaret girdiye HİÇ girmez. */
function normalizeProfileValue(field: ProfileField, value: string): string {
  if (field === 'userPhoneDigits') return toPhoneDigits(value)
  if (field === 'nationalId') return toNationalIdDigits(value)
  return value
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
  /** Firma şahıs firması mı — T.C. kimlik alanı yalnız o zaman görünür. */
  isSoleProprietorship: boolean
  isSubmitting: boolean
  /** Hata ya da KISMİ başarı; ikisi de aynı şeritte, tonu ayırıyor. */
  submitNotice: ProfileNotice | null
  setValue: (field: ProfileField, value: string) => void
  submit: () => Promise<boolean>
  reset: () => void
  clearSubmitNotice: () => void
}

/**
 * Kişi Bilgileri formunun durumu.
 *
 * İKİ ayrı uca yazıyor ve bu bilinçli: Email ile Telefon 1 kullanıcının
 * kaydında (`PUT /api/users/{id}`), T.C. kimlik no firmanın kaydında
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
  // Firma türü OKUNAN kayıttan; ekranda değiştirilemiyor (§10 kuralı bu ekranda
  // bir seçim değil, verilen bir koşul).
  const isSoleProprietorship = firm?.companyType === PROJECT_FIRM_COMPANY_TYPES.individual

  const [values, setValues] = useState<ProfileFormValues>(() => initialValues)
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitNotice, setSubmitNotice] = useState<ProfileNotice | null>(null)

  const setValue = useCallback((field: ProfileField, value: string) => {
    setValues((current) => ({ ...current, [field]: normalizeProfileValue(field, value) }))

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

    const nextErrors = validateProfile(values, isSoleProprietorship)
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

      // 2) Firma kaydı YALNIZ şahıs firmasında: ekranda kalan tek firma alanı
      // T.C. kimlik no ve tüzel firmada o da gövdeye girmiyor — gövdenin geri
      // kalanı okunan kayıttan geldiği için istek hiçbir şeyi değiştirmezdi.
      if (firm !== undefined && isSoleProprietorship) {
        try {
          await updateProjectFirmContact(firm, {
            // Tüzel firmada `null`: alan gövdede dolu kalırsa sunucu 400 döner.
            nationalIdNumber: isSoleProprietorship ? optionalText(values.nationalId) : null,
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
  }, [values, user, firm, isSoleProprietorship, onRefresh])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setSubmitNotice(null)
  }, [initialValues])

  return {
    values,
    errors,
    isSoleProprietorship,
    isSubmitting,
    submitNotice,
    setValue,
    submit,
    reset,
    clearSubmitNotice: () => setSubmitNotice(null),
  }
}
