import { useCallback, useState } from 'react'

import { ApiError } from '../../../api/http'
import { deleteProjectFirm } from '../../../api/projectFirmForm'
import type { ProjectFirm } from '../../../api/projectFirms'
import type { NoticeTone } from '../NoticeBar'

const NOT_FOUND = 404

/** Mesajlar "ne oldu + ne yapmalı" biçiminde; özür dileyen dil kullanılmaz. */
const DELETE_ERROR_MESSAGE = 'Firma silinemedi. Bağlantınızı kontrol edip tekrar deneyin.'
const NOT_FOUND_MESSAGE = 'Firma bulunamadı. Başka biri silmiş olabilir; listeyi yenileyin.'

export interface ProjectFirmActionNotice {
  tone: NoticeTone
  message: string
}

interface UseProjectFirmActionsOptions {
  /** Liste tazelensin diye çağrılır (sorgu geçersizleştirme). */
  onChanged: () => void
}

export interface ProjectFirmActions {
  /** İsteği süren satır; o satırın düğmesi kilitlenir. */
  pendingFirmId: number | null
  /** Onay bekleyen silme hedefi; null ise diyalog kapalıdır. */
  deleteTarget: ProjectFirm | null
  notice: ProjectFirmActionNotice | null
  requestDelete: (firm: ProjectFirm) => void
  cancelDelete: () => void
  confirmDelete: () => Promise<void>
  dismissNotice: () => void
}

/**
 * Proje firması satır eylemleri — `useGasFirmActions` deseninin birebir eşi.
 * İstek `useMutation` ile değil düz `async` çağrıyla atılıyor ve başarıda
 * `onChanged` tetikleniyor; projedeki her yazma işlemi böyle.
 */
export function useProjectFirmActions({
  onChanged,
}: UseProjectFirmActionsOptions): ProjectFirmActions {
  const [pendingFirmId, setPendingFirmId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectFirm | null>(null)
  const [notice, setNotice] = useState<ProjectFirmActionNotice | null>(null)

  // Silme isteği ONAYDAN ÖNCE atılmaz: bu çağrı yalnız diyaloğu açar.
  const requestDelete = useCallback((firm: ProjectFirm) => {
    setNotice(null)
    setDeleteTarget(firm)
  }, [])

  const cancelDelete = useCallback(() => setDeleteTarget(null), [])

  const confirmDelete = useCallback(async () => {
    if (deleteTarget === null) return

    setPendingFirmId(deleteTarget.id)
    try {
      await deleteProjectFirm(deleteTarget.id)
      setNotice({ tone: 'success', message: `“${deleteTarget.name}” firması silindi.` })
      onChanged()
    } catch (error) {
      const isMissing = error instanceof ApiError && error.status === NOT_FOUND
      setNotice({
        tone: 'error',
        message: isMissing ? NOT_FOUND_MESSAGE : DELETE_ERROR_MESSAGE,
      })
    } finally {
      setPendingFirmId(null)
      setDeleteTarget(null)
    }
  }, [deleteTarget, onChanged])

  const dismissNotice = useCallback(() => setNotice(null), [])

  return {
    pendingFirmId,
    deleteTarget,
    notice,
    requestDelete,
    cancelDelete,
    confirmDelete,
    dismissNotice,
  }
}
