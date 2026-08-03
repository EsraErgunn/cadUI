import { useCallback, useState } from 'react'

import { deleteProject, submitProject } from '../../../api/projects'
import type { NoticeTone } from '../NoticeBar'

/** Mesajlar "ne oldu + ne yapmalı" biçiminde; özür dileyen dil kullanılmaz. */
const DELETE_SUCCESS_MESSAGE = 'Proje silindi.'
const DELETE_ERROR_MESSAGE = 'Proje silinemedi. Bağlantınızı kontrol edip tekrar deneyin.'
const SUBMIT_SUCCESS_MESSAGE = 'Proje onaya gönderildi. Artık "Onay Bekleyen" sekmesinde.'
const SUBMIT_ERROR_MESSAGE = 'Proje gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.'
const MISSING_DOCUMENTS_MESSAGE =
  'Proje onaya gönderilemedi: aşağıdaki evraklar eksik. Evrakları yükleyip tekrar gönderin.'

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
  dismissNotice: () => void
}

export function useProjectActions({ onChanged }: UseProjectActionsOptions): ProjectActions {
  const [pendingProjectId, setPendingProjectId] = useState<number | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
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
      } catch {
        setNotice({ tone: 'error', message: SUBMIT_ERROR_MESSAGE })
      } finally {
        setPendingProjectId(null)
      }
    },
    [onChanged],
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
    dismissNotice,
  }
}
