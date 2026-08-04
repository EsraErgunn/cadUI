import { useCallback, useState } from 'react'

import { buildDefaultValues, deriveEndDate } from './newProjectDefaults'
import {
  firstErrorField,
  toCreateProjectPayload,
  validateNewProject,
  type NewProjectErrors,
  type NewProjectField,
  type NewProjectFormValues,
} from './newProjectSchema'
import { createProject, type CreatedProject } from '../../../api/projects'

const SUBMIT_ERROR_MESSAGE = 'Proje oluşturulamadı. Bağlantınızı kontrol edip tekrar deneyin.'

export interface UseNewProjectFormOptions {
  isAdmin: boolean
  /** Test ve tarih varsayılanları için enjekte edilebilir; üretimde verilmez. */
  today?: Date
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
  applyProjectTypeOptions: (codes: string[]) => void
  submit: () => Promise<CreatedProject | null>
  clearFocusRequest: () => void
  clearSubmitError: () => void
}

/**
 * Yeni proje formunun durumu. Doğrulama zod şemasında, bağımlı alan temizleme
 * burada: iki firma seçimi ve mühendis birbirine bağlı olduğu için "bir alan
 * değişince hangi alanlar geçersizleşir" kararı tek yerde durmalı.
 */
export function useNewProjectForm({ isAdmin, today }: UseNewProjectFormOptions): NewProjectForm {
  // Tembel başlatıcı: varsayılan tarihler bir KEZ hesaplanır. Her render'da
  // yeniden üretilseydi kullanıcının değiştirdiği tarih geri gelirdi.
  const [values, setValues] = useState<NewProjectFormValues>(() =>
    buildDefaultValues(today ?? new Date()),
  )
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
      if (field === 'projectType') setHasChosenProjectType(true)
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
    (codes: string[]) => {
      setValues((current) => {
        if (codes.length === 0) return current

        // Seçili tip Ayarlar'dan kaldırılmışsa seçim DÜŞER: yerine sessizce başka
        // bir tip konsaydı kullanıcı seçmediği bir tiple projeyi kaydederdi.
        if (current.projectType !== '' && !codes.includes(current.projectType)) {
          return { ...current, projectType: '' }
        }
        // Kullanıcı henüz seçmediyse belgedeki varsayılan: ilk seçenek.
        if (current.projectType === '' && !hasChosenProjectType) {
          return { ...current, projectType: codes[0] }
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
    } catch {
      // Girilen veri korunur: kullanıcı formu baştan doldurmak zorunda kalmasın.
      setSubmitError(SUBMIT_ERROR_MESSAGE)
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
 * Proje firması değişince mühendis ve GD firması ARTIK O FİRMAYA AİT DEĞİL:
 * seçili kalsalardı kullanıcı, listede görünmeyen bir mühendisle projeyi
 * kaydedebilirdi. Temizleme burada, `setValue` içinde dağıtılmadan yapılıyor.
 */
function applyDependencies<TField extends NewProjectField>(
  current: NewProjectFormValues,
  field: TField,
  value: NewProjectFormValues[TField],
): NewProjectFormValues {
  const next: NewProjectFormValues = { ...current, [field]: value }

  if (field === 'projectFirmId' && value !== current.projectFirmId) {
    next.engineerUserId = null
    next.gasDistributionFirmId = null
  }

  // Bitiş tarihi başlamadan TÜRER: başlama her değişince +2 ay yeniden
  // hesaplanır. Başlama varsayılan olarak dolu geldiği için bitiş alanını pasif
  // tutmak sırayı zorlamıyordu; kullanıcı bitişi önce girse de başlamayı
  // değiştirdiğinde seçim türetilmiş tarihe bırakır. Başlama silinirse bitiş de
  // boşalır — pasif alanda düzeltilemeyen bir tarih kalmasın.
  if (field === 'startDate' && typeof value === 'string' && value !== current.startDate) {
    next.endDate = deriveEndDate(value)
  }

  return next
}
