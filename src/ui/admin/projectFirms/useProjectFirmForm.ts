import { useCallback, useState } from 'react'

import {
  removeAuthorization,
  toAuthorizationPayloads,
  type ProjectFirmAuthorization,
} from './authorizationDraft'
import {
  PROJECT_FIRM_ERRORS,
  buildEmptyProjectFirmValues,
  firstProjectFirmErrorField,
  normalizeProjectFirmValue,
  toProjectFirmPayload,
  validateProjectFirm,
  type ProjectFirmErrors,
  type ProjectFirmField,
  type ProjectFirmFormValues,
} from './projectFirmSchema'
import { findTakenProjectFirmErrors } from './projectFirmUniqueness'
import { ApiError } from '../../../api/http'
import type { ProjectFirm } from '../../../api/projectFirmDto'
import {
  createProjectFirm,
  saveProjectFirmAuthorizations,
  updateProjectFirm,
} from '../../../api/projectFirmForm'

const SUBMIT_ERROR_MESSAGE = 'Firma kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.'

const CONFLICT = 409

/**
 * Şahıs firmasında gelen 409, aynı T.C. kimlik numarasıyla kayıtlı bir firma
 * olduğu anlamına geliyor (§10). SİLİNMİŞ firma bile numarayı rezerve tuttuğu
 * için kayıt listede görünmeyebiliyor — mesaj bunu ayrıca söylüyor.
 *
 * Eşleşme DURUM KODU + form durumuyla yapılıyor, sunucunun mesaj METNİYLE
 * değil: metin değişirse eşleştirme sessizce kırılırdı — gaz dağıtım
 * formundaki 409 kararının aynı gerekçesi.
 */
function isNationalIdConflict(error: unknown, isSoleProprietorship: boolean): boolean {
  return isSoleProprietorship && error instanceof ApiError && error.status === CONFLICT
}

/** Metin alanları; boolean alan ayrı bir çağrıdan geçiyor. */
type ProjectFirmTextField = Exclude<ProjectFirmField, 'isSoleProprietorship'>

export interface ProjectFirmSaveResult {
  firmId: number
  /**
   * Firma kaydedildi ama yetkilendirmeler sunucuya yazılamadı (uç yok).
   * Liste ekranı bunu uyarı şeridine çeviriyor — kullanıcı "kaydedildi" deyip
   * yarısı kaybolmuş bir kayıtla baş başa kalmasın.
   */
  arePendingAuthorizations: boolean
}

export interface UseProjectFirmFormOptions {
  /**
   * Benzersizlik ön kontrolünün karşılaştırdığı kayıtlar (liste ucundan).
   * Boş gelirse kontrol sessizce atlanır: bu bir kolaylık, kritik yol DEĞİL —
   * liste çekilemediğinde kaydetmek engellenmemeli.
   */
  existingFirms: readonly ProjectFirm[]
  /**
   * GÜNCELLEME kipi: dolu ise `PUT /api/projectfirms/{id}`, boş ise `POST`.
   * Kimlik ayrıca benzersizlik ön kontrolünde kaydın kendisini eliyor.
   */
  firmId?: number | null
  /**
   * Formun açılış değerleri — güncellemede TEKİL uç yanıtından türetilir
   * (`toProjectFirmFormValues`). Mount anında verilir, sonradan gelen veriyi
   * state'e taşıyan bir efekt YOK: o efekt, kullanıcı yazmaya başladıysa
   * yazdığını silerdi (`ProjectFirmUserFormPage` ile aynı gerekçe).
   */
  initialValues?: ProjectFirmFormValues
}

export interface ProjectFirmForm {
  values: ProjectFirmFormValues
  errors: ProjectFirmErrors
  authorizations: ProjectFirmAuthorization[]
  /** Yetkilendirme listesi boşken kaydetmeye çalışılırsa dolar (belge madde 28). */
  authorizationError: string | null
  /** Kullanıcı en az bir alana dokundu mu — İptal'de onay sorulmasını belirler. */
  isDirty: boolean
  isSubmitting: boolean
  /** Sunucu hatası; form verisi korunur, yalnız bu mesaj gösterilir. */
  submitError: string | null
  /** Odak taşınacak alan; doğrulama başarısız olunca dolar, okununca temizlenir. */
  focusField: ProjectFirmField | null
  setValue: (field: ProjectFirmTextField, value: string) => void
  setSoleProprietorship: (isSoleProprietorship: boolean) => void
  addAuthorizations: (added: ProjectFirmAuthorization[]) => void
  removeAuthorizationGasFirm: (gasDistributionFirmId: number) => void
  /** Başarısızsa `null`; başarılıysa kimlik + yetkilendirmelerin durumu. */
  submit: () => Promise<ProjectFirmSaveResult | null>
  clearFocusRequest: () => void
  clearSubmitError: () => void
}

/**
 * Yeni proje firması formunun durumu. Doğrulama `projectFirmSchema`'da,
 * yetkilendirme listesinin kuralları `authorizationDraft`'ta; burada
 * yalnız durum yönetimi var.
 */
export function useProjectFirmForm({
  existingFirms,
  firmId = null,
  initialValues,
}: UseProjectFirmFormOptions): ProjectFirmForm {
  const [values, setValues] = useState<ProjectFirmFormValues>(
    () => initialValues ?? buildEmptyProjectFirmValues(),
  )
  const [errors, setErrors] = useState<ProjectFirmErrors>({})
  const [authorizations, setAuthorizations] = useState<ProjectFirmAuthorization[]>([])
  const [authorizationError, setAuthorizationError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [focusField, setFocusField] = useState<ProjectFirmField | null>(null)

  /** Kullanıcı alanı düzeltirken eski hata mesajı ANINDA kalkar. */
  const clearFieldError = useCallback((field: ProjectFirmField) => {
    setErrors((current) => {
      if (current[field] === undefined) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const setValue = useCallback(
    (field: ProjectFirmTextField, value: string) => {
      setIsDirty(true)
      setValues((current) => ({ ...current, [field]: normalizeProjectFirmValue(field, value) }))
      clearFieldError(field)
    },
    [clearFieldError],
  )

  /**
   * Seçim değişince KAPANAN alanın değeri ekrandan da silinir (§10). Temizlik
   * İKİ YÖNLÜ: şahısa geçince vergi no, tüzele dönünce T.C. kimlik. Gizli ama
   * dolu kalan bir alan gövdeye sızsa sunucu 400 dönerdi; ayrıca kullanıcı
   * görmediği bir değerin kaydedildiğini fark edemezdi.
   *
   * İki alanın zorunluluğu yer değiştirdiği için eski hatalar da düşüyor —
   * artık geçerli olmayan bir kuralın mesajı ekranda kalmamalı.
   */
  const setSoleProprietorship = useCallback(
    (isSoleProprietorship: boolean) => {
      setIsDirty(true)
      setValues((current) => ({
        ...current,
        isSoleProprietorship,
        taxNumber: isSoleProprietorship ? '' : current.taxNumber,
        nationalId: isSoleProprietorship ? current.nationalId : '',
      }))
      clearFieldError('taxNumber')
      clearFieldError('nationalId')
    },
    [clearFieldError],
  )

  const addAuthorizations = useCallback((added: ProjectFirmAuthorization[]) => {
    if (added.length === 0) return

    setIsDirty(true)
    setAuthorizations((current) => [...current, ...added])
    setAuthorizationError(null)
  }, [])

  const removeAuthorizationGasFirm = useCallback((gasDistributionFirmId: number) => {
    setIsDirty(true)
    setAuthorizations((current) => removeAuthorization(current, gasDistributionFirmId))
  }, [])

  const submit = useCallback(async (): Promise<ProjectFirmSaveResult | null> => {
    setSubmitError(null)

    const isUpdate = firmId !== null

    const { errors: fieldErrors, data } = validateProjectFirm(values)
    // Benzersizlik yalnız alan kuralları geçtiğinde bakılır: yarım girilmiş bir
    // numaranın "kullanımda" denmesi kullanıcıyı yanlış yere bakmaya iterdi.
    const takenErrors =
      data === null ? {} : findTakenProjectFirmErrors(existingFirms, data, firmId)
    const nextErrors = { ...fieldErrors, ...takenErrors }
    // Yetkilendirme zorunluluğu YALNIZ eklemede: `PUT /api/projectfirms/{id}`
    // yetki kayıtlarını taşımıyor ve tekil uç onları geri vermiyor, bu yüzden
    // güncelleme ekranı bölümü hiç göstermiyor. Kural orada da aransaydı hiçbir
    // güncelleme kaydedilemezdi.
    const nextAuthorizationError =
      !isUpdate && authorizations.length === 0 ? PROJECT_FIRM_ERRORS.noAuthorization : null

    setErrors(nextErrors)
    setAuthorizationError(nextAuthorizationError)

    const firstInvalid = firstProjectFirmErrorField(nextErrors)
    if (data === null || firstInvalid !== null || nextAuthorizationError !== null) {
      setFocusField(firstInvalid)
      return null
    }

    setIsSubmitting(true)
    try {
      const payload = toProjectFirmPayload(data)

      if (isUpdate) {
        await updateProjectFirm(firmId, payload)
        // Güncellemede yetkilendirme gönderilmiyor (uç taşımıyor); "bekleyen"
        // uyarısı da çıkmaz, yoksa her kaydetmede yanlış uyarı görünürdü.
        return { firmId, arePendingAuthorizations: false }
      }

      const createdId = await createProjectFirm(payload)
      // Firma kaydı BAŞARILI olduktan sonra çalışır; buradaki bir hata firmayı
      // geri almaz, bu yüzden kullanıcıyı listeye götürmeyi engellemiyor.
      const { arePersisted } = await saveProjectFirmAuthorizations(
        createdId,
        toAuthorizationPayloads(authorizations),
      )

      return { firmId: createdId, arePendingAuthorizations: !arePersisted }
    } catch (error) {
      // 409 ALAN hatasına çevriliyor, şerit mesajına değil: çakışan şey belli
      // bir alan ve kullanıcı düzeltmeyi orada yapacak.
      if (isNationalIdConflict(error, values.isSoleProprietorship)) {
        setErrors((current) => ({ ...current, nationalId: PROJECT_FIRM_ERRORS.nationalIdTaken }))
        setFocusField('nationalId')
        return null
      }

      // Sunucunun kendi Türkçe metni KORUNUYOR: genel bir cümleyle örtülseydi
      // kullanıcı neyi düzelteceğini bilemezdi.
      setSubmitError(error instanceof ApiError ? error.message : SUBMIT_ERROR_MESSAGE)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [authorizations, existingFirms, firmId, values])

  const clearFocusRequest = useCallback(() => setFocusField(null), [])
  const clearSubmitError = useCallback(() => setSubmitError(null), [])

  return {
    values,
    errors,
    authorizations,
    authorizationError,
    isDirty,
    isSubmitting,
    submitError,
    focusField,
    setValue,
    setSoleProprietorship,
    addAuthorizations,
    removeAuthorizationGasFirm,
    submit,
    clearFocusRequest,
    clearSubmitError,
  }
}
