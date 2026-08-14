import { useCallback, useState } from 'react'

import {
  POLICY_STEPS,
  buildPolicyDefaults,
  buildPolicyPayload,
  firstPolicyErrorField,
  formatPolicyAmount,
  sanitizePolicyAmount,
  validatePolicyForm,
  validatePolicyStep,
  type PolicyErrors,
  type PolicyField,
  type PolicyFormValues,
  type PolicyStep,
} from './policySchema'
import { createProjectPolicy } from '../../../api/policies'
import type { ProjectSummary } from '../../../api/projectDetail'

const SUBMIT_ERROR_MESSAGES = {
  unavailable:
    'Poliçe kaydı ucu sunucuda henüz yok; kayıt yapılamadı (POST /api/projects/{id}/policies).',
  unexpected: 'Poliçe kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.',
} as const

/** Hatalı alanın hangi adımda düzeltileceği: özetten "Bitir"e basılıp hata
    çıkarsa kullanıcı o alanın GÖRÜNDÜĞÜ adıma geri götürülür. */
const FIELD_STEPS: Record<PolicyField, PolicyStep> = {
  method: 'method',
  insuranceCompanyId: 'firm',
  agencyId: 'firm',
  policyNumber: 'info',
  amountText: 'info',
  startDate: 'info',
  endDate: 'info',
}

export interface UsePolicyWizardOptions {
  /**
   * Poliçenin bağlanacağı proje. Kimlik değil KÜNYE alıyor: kaydedilen poliçe
   * poliçe listesinde proje adıyla görünüyor ve o ad kimlikten çözülemiyordu —
   * mock tohumundan çözmek başka bir projenin adını yazdırırdı (K63).
   * Künye gelmeden (`undefined`) sihirbaz çizilmiyor, kayıt da yapılamıyor.
   */
  project: ProjectSummary | undefined
  /** Test ve tarih varsayılanı için enjekte edilebilir; üretimde verilmez. */
  today?: Date
}

export interface PolicyWizard {
  step: PolicyStep
  values: PolicyFormValues
  errors: PolicyErrors
  /** Kullanıcı en az bir alana dokundu mu — "Vazgeç"te onay sorulup sorulmayacağı. */
  isDirty: boolean
  isSubmitting: boolean
  submitError: string | null
  focusField: PolicyField | null
  setValue: <TField extends PolicyField>(field: TField, value: PolicyFormValues[TField]) => void
  /** Teminat girdisi: geçersiz tuş vuruşu değeri DEĞİŞTİRMEZ. */
  setAmountText: (raw: string) => void
  /** Odaktan çıkışta binlik ayraç uygulanır. */
  formatAmount: () => void
  goBack: () => void
  /** Son veri adımında kaydeder; başarılıysa sonuç adımına geçer. */
  goNext: () => Promise<void>
  clearFocusRequest: () => void
  clearSubmitError: () => void
}

function stepIndex(step: PolicyStep): number {
  return POLICY_STEPS.indexOf(step)
}

/**
 * Sihirbazın durumu. Adım URL'de TUTULMUYOR (K65): form verisi adresle
 * taşınamadığı için yenilemede adım korunup veri gitseydi kullanıcı boş bir
 * "Poliçe Bilgileri" adımına düşerdi.
 */
export function usePolicyWizard({ project, today }: UsePolicyWizardOptions): PolicyWizard {
  // Tembel başlatıcı: başlangıç tarihi bir KEZ hesaplanır, her render'da
  // yeniden üretilseydi kullanıcının değiştirdiği tarih geri gelirdi.
  const [values, setValues] = useState<PolicyFormValues>(() => buildPolicyDefaults(today ?? new Date()))
  const [step, setStep] = useState<PolicyStep>('method')
  const [errors, setErrors] = useState<PolicyErrors>({})
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [focusField, setFocusField] = useState<PolicyField | null>(null)

  const clearFieldError = useCallback((field: PolicyField) => {
    setErrors((current) => {
      if (current[field] === undefined) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const setValue = useCallback(
    <TField extends PolicyField>(field: TField, value: PolicyFormValues[TField]) => {
      setIsDirty(true)
      setValues((current) => {
        const next = { ...current, [field]: value }
        // Sigorta şirketi değişince acente ARTIK O ŞİRKETE AİT DEĞİL; seçili
        // kalsaydı kullanıcı listede görünmeyen bir acenteyle poliçe açardı.
        if (field === 'insuranceCompanyId' && value !== current.insuranceCompanyId) {
          next.agencyId = null
        }
        return next
      })
      clearFieldError(field)
    },
    [clearFieldError],
  )

  const setAmountText = useCallback(
    (raw: string) => {
      const sanitized = sanitizePolicyAmount(raw)
      if (sanitized === null) return

      setIsDirty(true)
      setValues((current) => ({ ...current, amountText: sanitized }))
      clearFieldError('amountText')
    },
    [clearFieldError],
  )

  const formatAmount = useCallback(() => {
    setValues((current) => ({ ...current, amountText: formatPolicyAmount(current.amountText) }))
  }, [])

  const goBack = useCallback(() => {
    setSubmitError(null)
    setErrors({})
    setStep((current) => POLICY_STEPS[Math.max(stepIndex(current) - 1, 0)])
  }, [])

  const failWith = useCallback((nextErrors: PolicyErrors) => {
    setErrors(nextErrors)
    const field = firstPolicyErrorField(nextErrors)
    if (field === null) return

    setFocusField(field)
    setStep(FIELD_STEPS[field])
  }, [])

  const submit = useCallback(async () => {
    setSubmitError(null)

    const formErrors = validatePolicyForm(values)
    if (Object.keys(formErrors).length > 0) {
      failWith(formErrors)
      return
    }

    const payload = project === undefined ? null : buildPolicyPayload(values, project.id)
    if (payload === null || project === undefined) {
      setSubmitError(SUBMIT_ERROR_MESSAGES.unexpected)
      return
    }

    setIsSubmitting(true)
    const result = await createProjectPolicy(payload, project)
    setIsSubmitting(false)

    if (result.ok) {
      setStep('done')
      return
    }

    // Numara aradaki sürede kapılmış olabilir; hatası kendi adımında görünür.
    if (result.reason === 'duplicateNumber') {
      failWith(validatePolicyForm(values))
      return
    }

    setSubmitError(SUBMIT_ERROR_MESSAGES.unavailable)
  }, [failWith, project, values])

  const goNext = useCallback(async () => {
    // Kayıt ÖZET adımında yapılır, sonuç adımı kayıttan SONRA gösterilir (K64).
    if (step === 'summary') {
      await submit()
      return
    }

    const stepErrors = validatePolicyStep(step, values)
    if (Object.keys(stepErrors).length > 0) {
      failWith(stepErrors)
      return
    }

    setErrors({})
    setStep((current) => POLICY_STEPS[Math.min(stepIndex(current) + 1, POLICY_STEPS.length - 1)])
  }, [failWith, step, submit, values])

  return {
    step,
    values,
    errors,
    isDirty,
    isSubmitting,
    submitError,
    focusField,
    setValue,
    setAmountText,
    formatAmount,
    goBack,
    goNext,
    clearFocusRequest: useCallback(() => setFocusField(null), []),
    clearSubmitError: useCallback(() => setSubmitError(null), []),
  }
}
