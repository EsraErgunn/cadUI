import { useCallback, useState } from 'react'

import {
  GAS_FIRM_ERRORS,
  buildSimilarNamesWarning,
  firstGasFirmErrorField,
  validateGasFirm,
  type GasFirmErrors,
  type GasFirmField,
  type GasFirmFormValues,
} from './gasFirmSchema'
import { normalizeGasFirmValue, toGasFirmPayload } from './gasFirmValues'
import {
  DfirmNoTakenError,
  createGasDistributionFirm,
  updateGasDistributionFirm,
} from '../../../api/adminFirmForm'
import { GAS_FIRM_PAGE_SIZE, getGasDistributionFirms } from '../../../api/adminFirms'

const SUBMIT_ERROR_MESSAGE = 'Firma kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.'

export interface UseGasFirmFormOptions {
  /** `null` → ekleme modu; dolu → güncelleme modu. */
  firmId: number | null
  /** Açılış değerleri; `useGasFirmInitialValues` hazırlar, bir KEZ okunur. */
  initialValues: GasFirmFormValues
}

export interface GasFirmForm {
  values: GasFirmFormValues
  errors: GasFirmErrors
  /**
   * Engellemeyen bilgi (belge madde 9). `errors`'tan TAMAMEN ayrı: Kaydet'i
   * durdurmaz, odak mantığına girmez, kenarlığı kırmızıya çevirmez.
   */
  nameWarning: string | null
  isUpdateMode: boolean
  /** Kullanıcı en az bir alana dokundu mu — İptal'de onay sorulmasını belirler. */
  isDirty: boolean
  isSubmitting: boolean
  /** Sunucu hatası; form verisi korunur, yalnız bu mesaj gösterilir. */
  submitError: string | null
  /** Odak taşınacak alan; doğrulama başarısız olunca dolar, okununca temizlenir. */
  focusField: GasFirmField | null
  setValue: (field: GasFirmField, value: string) => void
  /** Firma adı alanından ÇIKINCA çağrılır — her tuş vuruşunda değil. */
  checkSimilarNames: () => Promise<void>
  submit: () => Promise<number | null>
  clearFocusRequest: () => void
  clearSubmitError: () => void
}

/**
 * Firma ekle/güncelle formunun durumu. Doğrulama `gasFirmSchema`'da, burada
 * yalnız durum yönetimi var.
 *
 * Benzersizlik kontrolü BURADA YOK: numaranın kullanılıp kullanılmadığına sunucu
 * karar verir (409 → `DfirmNoTakenError`). İstemcide yapılacak bir ön kontrol
 * yarış durumunu zaten kapatamazdı.
 */
export function useGasFirmForm({ firmId, initialValues }: UseGasFirmFormOptions): GasFirmForm {
  // Tembel başlatıcı: açılış değerleri bir KEZ alınır, sonraki render'larda
  // kullanıcının yazdığının üstüne binmez.
  const [values, setValues] = useState<GasFirmFormValues>(() => initialValues)
  const [errors, setErrors] = useState<GasFirmErrors>({})
  const [nameWarning, setNameWarning] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [focusField, setFocusField] = useState<GasFirmField | null>(null)

  const setValue = useCallback((field: GasFirmField, value: string) => {
    setIsDirty(true)
    setValues((current) => ({ ...current, [field]: normalizeGasFirmValue(field, value) }))

    // Kullanıcı alanı düzeltirken eski hata mesajı ANINDA kalkar.
    setErrors((current) => {
      if (current[field] === undefined) return current
      const next = { ...current }
      delete next[field]
      return next
    })

    // Eldeki benzerlik listesi başka bir ada aitti; ad değişince düşer.
    if (field === 'name') setNameWarning(null)
  }, [])

  const checkSimilarNames = useCallback(async () => {
    const name = values.name.trim()
    if (name === '') {
      setNameWarning(null)
      return
    }

    try {
      const page = await getGasDistributionFirms({
        nameQuery: name,
        groupId: null,
        scopeFirmId: null,
        sortKey: 'name',
        sortDir: 'asc',
        page: 1,
        pageSize: GAS_FIRM_PAGE_SIZE,
      })

      // Güncelleme modunda kaydın KENDİSİ elenir; yoksa mevcut firmayı açan
      // herkes "aynı isimde kayıt var" uyarısını kendisi için görürdü.
      const others = page.items.filter((firm) => firm.id !== firmId)
      setNameWarning(buildSimilarNamesWarning(others.map((firm) => firm.name)))
    } catch {
      // Kolaylık, kritik yol DEĞİL: sessizce geçilir. Kaydetmeyi engellemez,
      // hata alanına düşmez, kullanıcıya hiçbir şey gösterilmez.
      setNameWarning(null)
    }
  }, [firmId, values.name])

  const submit = useCallback(async (): Promise<number | null> => {
    setSubmitError(null)
    const { errors: nextErrors, data } = validateGasFirm(values)

    if (data === null) {
      setErrors(nextErrors)
      setFocusField(firstGasFirmErrorField(nextErrors))
      return null
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      const payload = toGasFirmPayload(data)
      return firmId === null
        ? await createGasDistributionFirm(payload)
        : await updateGasDistributionFirm(firmId, payload)
    } catch (error) {
      // Hata mesaj METNİNE göre değil TİPİNE göre tanınır: sunucunun metni
      // değişince eşleştirme sessizce kırılmasın.
      if (error instanceof DfirmNoTakenError) {
        setErrors({ dfirmNo: GAS_FIRM_ERRORS.dfirmNoTaken })
        setFocusField('dfirmNo')
        return null
      }
      // Girilen veri korunur: kullanıcı formu baştan doldurmak zorunda kalmasın.
      setSubmitError(SUBMIT_ERROR_MESSAGE)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [firmId, values])

  const clearFocusRequest = useCallback(() => setFocusField(null), [])
  const clearSubmitError = useCallback(() => setSubmitError(null), [])

  return {
    values,
    errors,
    nameWarning,
    isUpdateMode: firmId !== null,
    isDirty,
    isSubmitting,
    submitError,
    focusField,
    setValue,
    checkSimilarNames,
    submit,
    clearFocusRequest,
    clearSubmitError,
  }
}
