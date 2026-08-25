import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import type { PolicyEditValues } from './PolicyEditDialog'
import { ApiError } from '../../../api/http'
import { updatePolicy, type PolicyRow } from '../../../api/policies'

const MESSAGES = {
  updated: 'Poliçe güncellendi.',
  updateFailed: 'Poliçe güncellenemedi. Bağlantınızı kontrol edip tekrar deneyin.',
} as const

function describeError(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message !== '' ? error.message : fallback
}

export interface PolicyActions {
  editTarget: PolicyRow | null
  isSaving: boolean
  editError: string | null
  notice: { tone: 'success' | 'error'; message: string } | null
  dismissNotice: () => void
  dismissEditError: () => void
  requestEdit: (policy: PolicyRow) => void
  cancelEdit: () => void
  confirmEdit: (values: PolicyEditValues) => void
}

/**
 * Poliçe güncelleme. Kapsam TUTAR ve TARİHLER — birim değiştirme sunucuda
 * desteklenmiyor, poliçe numarası ve şirket bu ekranın işi değil.
 *
 * **Gövde okunan kayıttan tamamlanıyor.** `PolicyManager.UpdateAsync` beş
 * alanın HEPSİNİ koşulsuz yazıyor:
 *
 * ```csharp
 * policy.InsuranceCompanyId = dto.InsuranceCompanyId;
 * policy.PolicyNumber = ...;
 * ```
 *
 * Yani yalnız tutar ve tarih gönderilseydi poliçe numarası ile sigorta şirketi
 * sunucuda `null`'a düşerdi. Değişmeyen iki alan bu yüzden satırdan okunup geri
 * gönderiliyor (`toUserPayload` deseni).
 */
export function usePolicyActions(projectId: number | null): PolicyActions {
  const queryClient = useQueryClient()

  const [editTarget, setEditTarget] = useState<PolicyRow | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [notice, setNotice] = useState<PolicyActions['notice']>(null)

  const refresh = useCallback(() => {
    // Poliçeyi listeleyen iki yüzey: bütün projelerin listesi ve proje
    // detayının sekmesi.
    void queryClient.invalidateQueries({ queryKey: ['policies'] })
    void queryClient.invalidateQueries({
      queryKey: projectId === null ? ['projectPolicies'] : ['projectPolicies', projectId],
    })
  }, [projectId, queryClient])

  const confirmEdit = useCallback(
    (values: PolicyEditValues) => {
      if (editTarget === null) return
      const policy = editTarget

      setIsSaving(true)
      setEditError(null)

      void (async () => {
        try {
          await updatePolicy(policy.id, {
            // DEĞİŞMEYEN iki alan geri gönderiliyor; gönderilmezse silinirler.
            insuranceCompanyId: policy.insuranceCompanyId,
            policyNumber: policy.policyNumber,
            amount: values.amount,
            startDate: values.startDate,
            endDate: values.endDate,
          })

          setEditTarget(null)
          setNotice({ tone: 'success', message: MESSAGES.updated })
          refresh()
        } catch (error) {
          // Diyalog AÇIK kalıyor: kullanıcı girdiğini kaybetmeden düzeltsin.
          setEditError(describeError(error, MESSAGES.updateFailed))
        } finally {
          setIsSaving(false)
        }
      })()
    },
    [editTarget, refresh],
  )

  return {
    editTarget,
    isSaving,
    editError,
    notice,
    dismissNotice: useCallback(() => setNotice(null), []),
    dismissEditError: useCallback(() => setEditError(null), []),
    requestEdit: useCallback((policy: PolicyRow) => {
      setEditError(null)
      setEditTarget(policy)
    }, []),
    cancelEdit: useCallback(() => setEditTarget(null), []),
    confirmEdit,
  }
}
