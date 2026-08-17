import { useCallback, useState } from 'react'

import { deactivateGasDistributionFirm } from '../../../api/adminFirmForm'
import type { GasDistributionFirm } from '../../../api/adminFirms'
import { ApiError } from '../../../api/http'
import type { NoticeTone } from '../NoticeBar'

const NOT_FOUND = 404

/**
 * Mesajlar "ne oldu + ne yapmalı" biçiminde; özür dileyen dil kullanılmaz.
 *
 * Kullanıcıya gösterilen dil "sil": sunucudaki işlem soft-delete ama arayüz
 * terminolojisi bu ekranda "Sil" olarak seçildi. Kaydın gerçekte korunduğu
 * bilgisi onay diyaloğunun açıklamasında duruyor.
 */
const DELETE_ERROR_MESSAGE = 'Firma silinemedi. Bağlantınızı kontrol edip tekrar deneyin.'
const NOT_FOUND_MESSAGE = 'Firma bulunamadı. Başka biri silmiş olabilir; listeyi yenileyin.'

export interface GasFirmActionNotice {
  tone: NoticeTone
  message: string
}

interface UseGasFirmActionsOptions {
  /** Liste tazelensin diye çağrılır (sorgu geçersizleştirme). */
  onChanged: () => void
}

export interface GasFirmActions {
  /** İsteği süren satır; o satırın düğmesi kilitlenir. */
  pendingFirmId: number | null
  /** Onay bekleyen silme hedefi; null ise diyalog kapalıdır. */
  deactivateTarget: GasDistributionFirm | null
  notice: GasFirmActionNotice | null
  requestDeactivate: (firm: GasDistributionFirm) => void
  cancelDeactivate: () => void
  confirmDeactivate: () => Promise<void>
  dismissNotice: () => void
}

/**
 * Gaz dağıtım firması satır eylemleri. İstek `useMutation` ile değil düz `async`
 * çağrıyla atılıyor ve başarıda `onChanged` tetikleniyor — projedeki her yazma
 * işlemi bu deseni izliyor (`useProjectActions`).
 *
 * Sunucunun DELETE'i pasifleştirme olduğu için hata eşlemesi de kısa: sözleşmede
 * 404 dışında bir iş kuralı durumu yok, gerisi tek bir genel metne düşüyor.
 */
export function useGasFirmActions({ onChanged }: UseGasFirmActionsOptions): GasFirmActions {
  const [pendingFirmId, setPendingFirmId] = useState<number | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<GasDistributionFirm | null>(null)
  const [notice, setNotice] = useState<GasFirmActionNotice | null>(null)

  // Silme isteği ONAYDAN ÖNCE atılmaz: bu çağrı yalnız diyaloğu açar.
  const requestDeactivate = useCallback((firm: GasDistributionFirm) => {
    setNotice(null)
    setDeactivateTarget(firm)
  }, [])

  const cancelDeactivate = useCallback(() => setDeactivateTarget(null), [])

  const confirmDeactivate = useCallback(async () => {
    if (deactivateTarget === null) return

    setPendingFirmId(deactivateTarget.id)
    try {
      await deactivateGasDistributionFirm(deactivateTarget.id)
      setNotice({
        tone: 'success',
        message: `“${deactivateTarget.name}” firması silindi.`,
      })
      onChanged()
    } catch (error) {
      const isMissing = error instanceof ApiError && error.status === NOT_FOUND
      setNotice({
        tone: 'error',
        message: isMissing ? NOT_FOUND_MESSAGE : DELETE_ERROR_MESSAGE,
      })
    } finally {
      setPendingFirmId(null)
      setDeactivateTarget(null)
    }
  }, [deactivateTarget, onChanged])

  const dismissNotice = useCallback(() => setNotice(null), [])

  return {
    pendingFirmId,
    deactivateTarget,
    notice,
    requestDeactivate,
    cancelDeactivate,
    confirmDeactivate,
    dismissNotice,
  }
}
