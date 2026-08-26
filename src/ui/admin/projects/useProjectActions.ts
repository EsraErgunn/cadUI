import { useCallback, useState } from 'react'

import { ApiError } from '../../../api/http'
import {
  requiresReason,
  submitProjectDecision,
  type ProjectDecision,
} from '../../../api/projectDetail'
import { deleteProject, submitProject } from '../../../api/projects'
import type { NoticeTone } from '../NoticeBar'

/** Mesajlar "ne oldu + ne yapmalı" biçiminde; özür dileyen dil kullanılmaz. */
const DELETE_SUCCESS_MESSAGE = 'Proje silindi.'
const DELETE_ERROR_MESSAGE = 'Proje silinemedi. Bağlantınızı kontrol edip tekrar deneyin.'
const SUBMIT_SUCCESS_MESSAGE = 'Proje onaya gönderildi. Artık "Onay Bekleyen" sekmesinde.'
const SUBMIT_ERROR_MESSAGE = 'Proje gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.'
const MISSING_DOCUMENTS_MESSAGE =
  'Proje onaya gönderilemedi: aşağıdaki evraklar eksik. Evrakları yükleyip tekrar gönderin.'

const DECISION_SUCCESS_MESSAGES: Record<ProjectDecision, string> = {
  approve: 'Proje onaylandı.',
  reject: 'Proje reddedildi.',
}

const DECISION_ERROR_MESSAGE = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'

export interface ProjectActionNotice {
  tone: NoticeTone
  message: string
  details?: string[]
}

interface UseProjectActionsOptions {
  /** Liste ve sekme rozetleri tazelensin diye çağrılır. */
  onChanged: () => void
}

export interface ProjectActions {
  /** İsteği süren satır; o satırın düğmeleri kilitlenir. */
  pendingProjectId: number | null
  /** Onay bekleyen silme hedefi; null ise diyalog kapalıdır. */
  deleteTargetId: number | null
  notice: ProjectActionNotice | null
  requestDelete: (projectId: number) => void
  cancelDelete: () => void
  confirmDelete: () => Promise<void>
  submit: (projectId: number) => Promise<void>
  /**
   * Onay / ret. Gerekçe gerektiren karar diyaloğu AÇAR, gerektirmeyen doğrudan
   * gider — kural `requiresReason`'da, proje detayıyla ORTAK.
   */
  decide: (decision: ProjectDecision, projectId: number) => void
  /** Gerekçe diyaloğunun hedefi; `null` ise diyalog kapalı. */
  rejectTargetId: number | null
  cancelReject: () => void
  confirmReject: (reason: string) => Promise<void>
  dismissNotice: () => void
}

export function useProjectActions({ onChanged }: UseProjectActionsOptions): ProjectActions {
  const [pendingProjectId, setPendingProjectId] = useState<number | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null)
  const [notice, setNotice] = useState<ProjectActionNotice | null>(null)

  // Silme isteği ONAYDAN ÖNCE atılmaz: bu çağrı yalnız diyaloğu açar.
  const requestDelete = useCallback((projectId: number) => {
    setNotice(null)
    setDeleteTargetId(projectId)
  }, [])

  const cancelDelete = useCallback(() => setDeleteTargetId(null), [])

  const confirmDelete = useCallback(async () => {
    if (deleteTargetId === null) return

    setPendingProjectId(deleteTargetId)
    try {
      await deleteProject(deleteTargetId)
      setNotice({ tone: 'success', message: DELETE_SUCCESS_MESSAGE })
      onChanged()
    } catch {
      setNotice({ tone: 'error', message: DELETE_ERROR_MESSAGE })
    } finally {
      setPendingProjectId(null)
      setDeleteTargetId(null)
    }
  }, [deleteTargetId, onChanged])

  const submit = useCallback(
    async (projectId: number) => {
      setNotice(null)
      setPendingProjectId(projectId)
      try {
        const result = await submitProject(projectId)

        if (!result.ok) {
          // Eksik evrak bir HATA değil, tamamlanmamış iş: proje taslak listesinde
          // kalır, kullanıcı evrakları yükleyip aynı satırdan tekrar dener.
          setNotice({
            tone: 'error',
            message: MISSING_DOCUMENTS_MESSAGE,
            details: result.missingDocuments,
          })
          return
        }

        setNotice({ tone: 'success', message: SUBMIT_SUCCESS_MESSAGE })
        onChanged()
      } catch (cause: unknown) {
        // Sunucunun KENDİ Türkçe gerekçesi korunuyor. "Onaya gönder" durum
        // geçişinden ÖNCE iş kurallarını denetliyor ("… birimde müşteri
        // sözleşmesi eksik", "Projenin en az bir biriminde poliçe olmalı",
        // "Bu işlem '…' durumundaki bir projede yapılamaz") ve hepsi genel bir
        // cümleye indirgeniyordu — kullanıcı düğmenin neden işe yaramadığını
        // göremiyordu. Genel metin yalnız AĞ hatasında.
        setNotice({
          tone: 'error',
          message: cause instanceof ApiError ? cause.message : SUBMIT_ERROR_MESSAGE,
        })
      } finally {
        setPendingProjectId(null)
      }
    },
    [onChanged],
  )

  /**
   * Onay/ret isteği. Uç `POST /api/projects/{id}/approve|reject` ve çağrı
   * proje detayıyla AYNI fonksiyondan geçiyor (`submitProjectDecision`) — ikinci
   * bir karar mekanizması yazılmadı.
   *
   * Detaydaki `useProjectDecisions`'tan farkı, sonucu yerel durumla EZMEMESİ:
   * liste ucu satırın gerçek durumunu döndürüyor, tazelemek yeterli. O hook tek
   * bir projeye bağlı (`useProjectDecisions(projectId)`) ve satır satır
   * kullanılamaz.
   */
  const runDecision = useCallback(
    async (decision: ProjectDecision, projectId: number, reason: string | null) => {
      setPendingProjectId(projectId)
      try {
        const result = await submitProjectDecision(projectId, decision, reason)
        const approvalNote =
          result.approvalCode === null ? '' : ` Onay kodu: ${result.approvalCode}.`

        setNotice({ tone: 'success', message: `${DECISION_SUCCESS_MESSAGES[decision]}${approvalNote}` })
        onChanged()
      } catch (cause: unknown) {
        // Karar ucu da gerekçeli reddediyor (ör. "Bu işlem 'Taslak' durumundaki
        // bir projede yapılamaz"); sebep gönderimdeki gibi korunuyor.
        setNotice({
          tone: 'error',
          message: cause instanceof ApiError ? cause.message : DECISION_ERROR_MESSAGE,
        })
      } finally {
        setPendingProjectId(null)
        setRejectTargetId(null)
      }
    },
    [onChanged],
  )

  const decide = useCallback(
    (decision: ProjectDecision, projectId: number) => {
      setNotice(null)

      // Gerekçe kuralının TEK kaynağı `requiresReason`; detay ekranı da aynı
      // kapıdan geçiyor, iki ekran ayrışmasın.
      if (requiresReason(decision)) {
        setRejectTargetId(projectId)
        return
      }

      void runDecision(decision, projectId, null)
    },
    [runDecision],
  )

  const dismissNotice = useCallback(() => setNotice(null), [])

  return {
    pendingProjectId,
    deleteTargetId,
    notice,
    requestDelete,
    cancelDelete,
    confirmDelete,
    submit,
    decide,
    rejectTargetId,
    cancelReject: () => setRejectTargetId(null),
    confirmReject: async (reason: string) => {
      if (rejectTargetId === null) return
      await runDecision('reject', rejectTargetId, reason)
    },
    dismissNotice,
  }
}
