import { useCallback, useState } from 'react'

import { buildDefaultValues } from './newProjectDefaults'
import {
  firstErrorField,
  toCreateProjectPayload,
  validateNewProject,
  type NewProjectErrors,
  type NewProjectField,
  type NewProjectFormValues,
} from './newProjectSchema'
import { ApiError } from '../../../api/http'
import { ProjectFirmAuthorizationError } from '../../../api/projectFirmAuthorizations'
import { createProject, type CreatedProject } from '../../../api/projects'

/** Ağa HİÇ çıkılamadığında (API kapalı, CORS, DNS) gösterilen mesaj. */
const SUBMIT_ERROR_MESSAGE = 'Proje oluşturulamadı. Bağlantınızı kontrol edip tekrar deneyin.'

/**
 * Sunucunun kendi mesajı KORUNUR (`http.ts` onu `message`/`detail`/doğrulama
 * sözlüğünden okuyup `ApiError`e koyuyor). Eskiden `catch` her hatayı yutup
 * yerine "Bağlantınızı kontrol edin" yazıyordu: 400 "Proje firması yetkisi
 * zorunludur" gibi bir doğrulama hatası ağ hatası gibi görünüyor ve kullanıcı
 * neyi düzelteceğini öğrenemiyordu. Proje firması formundaki `buildSubmitError`
 * ile aynı desen.
 *
 * `ProjectFirmAuthorizationError` de aynı sebeple geçiyor: yetki kaydı
 * bulunamaması ağ hatası değil, kullanıcının firma seçimiyle ilgili bir durum
 * ve düzeltmesi ona bağlı.
 */
function buildSubmitError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof ProjectFirmAuthorizationError) return error.message

  return SUBMIT_ERROR_MESSAGE
}

export interface UseNewProjectFormOptions {
  isAdmin: boolean
}

export interface NewProjectForm {
  values: NewProjectFormValues
  errors: NewProjectErrors
  /** Kullanıcı en az bir alana dokundu mu — İptal'de onay sorulup sorulmayacağını belirler. */
  isDirty: boolean
  isSubmitting: boolean
  /** Sunucu hatası; form verisi korunur, yalnız bu mesaj gösterilir. */
  submitError: string | null
  /** Odak taşınacak alan; doğrulama başarısız olunca dolar, okununca temizlenir. */
  focusField: NewProjectField | null
  setValue: <TField extends NewProjectField>(
    field: TField,
    value: NewProjectFormValues[TField],
  ) => void
  /** Sunucudan gelen proje tipi listesi hazır olunca ilk seçeneği varsayılan yapar. */
  applyProjectTypeOptions: (codeIds: number[]) => void
  submit: () => Promise<CreatedProject | null>
  clearFocusRequest: () => void
  clearSubmitError: () => void
}

/**
 * Yeni proje formunun durumu. Doğrulama zod şemasında, bağımlı alan temizleme
 * burada: iki firma seçimi birbirine bağlı olduğu için "bir alan değişince
 * hangi alanlar geçersizleşir" kararı tek yerde durmalı.
 */
export function useNewProjectForm({ isAdmin }: UseNewProjectFormOptions): NewProjectForm {
  // Tembel başlatıcı: varsayılanlar bir KEZ kurulur.
  const [values, setValues] = useState<NewProjectFormValues>(() => buildDefaultValues())
  const [errors, setErrors] = useState<NewProjectErrors>({})
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [focusField, setFocusField] = useState<NewProjectField | null>(null)
  const [hasChosenProjectType, setHasChosenProjectType] = useState(false)

  const setValue = useCallback(
    <TField extends NewProjectField>(field: TField, value: NewProjectFormValues[TField]) => {
      setIsDirty(true)
      // Kullanıcı proje tipini bir kez seçtiyse liste tazelense de yerine
      // varsayılan konmaz; bayrak kalıcı, seçim temizlense bile geri gelmez.
      if (field === 'projectTypeCodeId') setHasChosenProjectType(true)
      setValues((current) => applyDependencies(current, field, value))
      // Kullanıcı alanı düzeltirken eski hata mesajı ekranda kalmaz.
      setErrors((current) => {
        if (current[field] === undefined) return current
        const next = { ...current }
        delete next[field]
        return next
      })
    },
    [],
  )

  const applyProjectTypeOptions = useCallback(
    (codeIds: number[]) => {
      setValues((current) => {
        if (codeIds.length === 0) return current

        // Seçili tip Ayarlar'dan kaldırılmışsa seçim DÜŞER: yerine sessizce başka
        // bir tip konsaydı kullanıcı seçmediği bir tiple projeyi kaydederdi.
        const selected = current.projectTypeCodeId
        if (selected !== null && !codeIds.includes(selected)) {
          return { ...current, projectTypeCodeId: null }
        }
        // Kullanıcı henüz seçmediyse belgedeki varsayılan: ilk seçenek.
        if (selected === null && !hasChosenProjectType) {
          return { ...current, projectTypeCodeId: codeIds[0] }
        }
        return current
      })
    },
    [hasChosenProjectType],
  )

  const submit = useCallback(async (): Promise<CreatedProject | null> => {
    setSubmitError(null)
    const { errors: nextErrors, data } = validateNewProject(values, { isAdmin })

    if (data === null) {
      setErrors(nextErrors)
      setFocusField(firstErrorField(nextErrors))
      return null
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      return await createProject(toCreateProjectPayload(data, { isAdmin }))
    } catch (error) {
      // Girilen veri korunur: kullanıcı formu baştan doldurmak zorunda kalmasın.
      setSubmitError(buildSubmitError(error))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [isAdmin, values])

  const clearFocusRequest = useCallback(() => setFocusField(null), [])
  const clearSubmitError = useCallback(() => setSubmitError(null), [])

  return {
    values,
    errors,
    isDirty,
    isSubmitting,
    submitError,
    focusField,
    setValue,
    applyProjectTypeOptions,
    submit,
    clearFocusRequest,
    clearSubmitError,
  }
}

/**
 * Bir alan değişince geçersizleşen alanları temizler.
 *
 * Proje firması değişince GD firması ARTIK O FİRMAYA AİT DEĞİL: seçili
 * kalsaydı kullanıcı, listede görünmeyen bir firmayla projeyi kaydedebilirdi.
 * Temizleme burada, `setValue` içinde dağıtılmadan yapılıyor.
 */
function applyDependencies<TField extends NewProjectField>(
  current: NewProjectFormValues,
  field: TField,
  value: NewProjectFormValues[TField],
): NewProjectFormValues {
  const next: NewProjectFormValues = { ...current, [field]: value }

  if (field === 'projectFirmId' && value !== current.projectFirmId) {
    next.gasDistributionFirmId = null
  }

  return next
}
