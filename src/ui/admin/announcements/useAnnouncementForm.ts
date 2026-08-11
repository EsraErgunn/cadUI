import { useCallback, useState } from 'react'

import {
  EMPTY_ANNOUNCEMENT,
  firstAnnouncementErrorField,
  toAnnouncementDraft,
  validateAnnouncement,
  type AnnouncementErrors,
  type AnnouncementField,
  type AnnouncementFormValues,
} from './announcementSchema'
import { publishAnnouncement, type Announcement } from '../../../api/adminDashboard'

const SUBMIT_ERROR_MESSAGE = 'Duyuru yayınlanamadı. Bağlantınızı kontrol edip tekrar deneyin.'

export interface AnnouncementForm {
  values: AnnouncementFormValues
  errors: AnnouncementErrors
  isSubmitting: boolean
  /** Sunucu hatası; form verisi korunur, yalnız bu mesaj gösterilir. */
  submitError: string | null
  /** Kullanıcı en az bir alana dokundu mu — kapatırken onay sorulmasını belirler. */
  isDirty: boolean
  setValue: (field: AnnouncementField, value: string) => void
  /** Onay kutusu ayrı: metin alanlarının aksine değeri boolean ve doğrulaması yok. */
  setIsSystem: (value: boolean) => void
  /** Yayınlanan duyuruyu döndürür; doğrulama veya istek başarısızsa `null`. */
  submit: () => Promise<Announcement | null>
  clearSubmitError: () => void
}

export interface UseAnnouncementFormOptions {
  /** Doğrulama hatasında odak taşınacak alanın kimliğini üretir. */
  fieldElementId: (field: AnnouncementField) => string
}

/**
 * Duyuru formunun durumu. Doğrulama `announcementSchema`'da, istek
 * `api/adminDashboard`'ta; burada yalnız durum yönetimi var — gaz dağıtım
 * formundaki (`useGasFirmForm`) ayrımın aynısı.
 */
export function useAnnouncementForm({
  fieldElementId,
}: UseAnnouncementFormOptions): AnnouncementForm {
  // Form "tüm bölgeler" ile açılır: üst bardaki kapsam seçicisi kaldırıldığı
  // için önceden doldurulacak bir bölge kalmadı (docs/kararlar.md K31).
  const [values, setValues] = useState<AnnouncementFormValues>(EMPTY_ANNOUNCEMENT)
  const [errors, setErrors] = useState<AnnouncementErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const setValue = useCallback<AnnouncementForm['setValue']>((field, value) => {
    setIsDirty(true)
    setValues((current) => ({ ...current, [field]: value }))
    // Alan düzeltilirken hata anında kalkar: kullanıcı yazarken kırmızı kenarlığın
    // durması, düzeltmenin işe yaramadığı izlenimi verir.
    setErrors((current) => {
      if (current[field] === undefined) return current
      const next = { ...current }
      next[field] = undefined
      return next
    })
  }, [])

  const setIsSystem = useCallback((value: boolean) => {
    setIsDirty(true)
    setValues((current) => ({ ...current, isSystem: value }))
  }, [])

  const submit = useCallback(async (): Promise<Announcement | null> => {
    const nextErrors = validateAnnouncement(values)
    setErrors(nextErrors)

    const invalidField = firstAnnouncementErrorField(nextErrors)
    if (invalidField !== null) {
      // Odak İLK hatalı alana taşınır (gaz dağıtım formundaki KK-8 deseni).
      document.getElementById(fieldElementId(invalidField))?.focus()
      return null
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      return await publishAnnouncement(toAnnouncementDraft(values))
    } catch (error) {
      // Sunucunun kendi mesajı varsa o gösterilir; yoksa genel metin.
      setSubmitError(error instanceof Error ? error.message : SUBMIT_ERROR_MESSAGE)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [fieldElementId, values])

  const clearSubmitError = useCallback(() => setSubmitError(null), [])

  return {
    values,
    errors,
    isSubmitting,
    submitError,
    isDirty,
    setValue,
    setIsSystem,
    submit,
    clearSubmitError,
  }
}
