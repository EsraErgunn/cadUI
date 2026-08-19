import { useCallback, useState } from 'react'

import type { NoticeTone } from './NoticeBar'

export interface RowDeleteNotice {
  tone: NoticeTone
  message: string
}

interface UseRowDeleteOptions {
  /** Asıl silme. `false` = ucun karşılığı yok, kayıt DÜŞMEDİ. */
  remove: (rowId: number) => Promise<boolean>
  messages: {
    success: string
    /** Ucun bulunmadığı hâl; "hata" değil, "burada yapılamaz". */
    unavailable: string
    error: string
  }
  /** Liste ve adet tazelensin diye; YALNIZ gerçekten silinince çağrılır. */
  onDeleted: () => void
}

export interface RowDeleteControls {
  /** Onay bekleyen hedef; `null` ise diyalog kapalı. */
  targetId: number | null
  /** İsteği süren satır; o satırın düğmesi kilitlenir. */
  pendingId: number | null
  notice: RowDeleteNotice | null
  request: (rowId: number) => void
  cancel: () => void
  confirm: () => Promise<void>
  dismissNotice: () => void
}

/**
 * Liste ekranlarındaki "Sil" akışı: onay iste → sil → sonucu bildir → listeyi
 * tazele. Evraklar ve Poliçeler ekranları paylaşıyor, o yüzden `admin/`
 * kökünde — iki kopya, silme onayının bir ekranda atlanmasıyla sonuçlanırdı.
 *
 * İstek ONAYDAN ÖNCE atılmaz: `request` yalnız diyaloğu açar.
 */
export function useRowDelete({
  remove,
  messages,
  onDeleted,
}: UseRowDeleteOptions): RowDeleteControls {
  const [targetId, setTargetId] = useState<number | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [notice, setNotice] = useState<RowDeleteNotice | null>(null)

  const request = useCallback((rowId: number) => {
    setNotice(null)
    setTargetId(rowId)
  }, [])

  const cancel = useCallback(() => setTargetId(null), [])

  const confirm = useCallback(async () => {
    if (targetId === null) return

    setPendingId(targetId)
    try {
      const isRemoved = await remove(targetId)

      if (!isRemoved) {
        setNotice({ tone: 'warning', message: messages.unavailable })
        return
      }

      setNotice({ tone: 'success', message: messages.success })
      onDeleted()
    } catch {
      setNotice({ tone: 'error', message: messages.error })
    } finally {
      setPendingId(null)
      setTargetId(null)
    }
  }, [targetId, remove, messages, onDeleted])

  const dismissNotice = useCallback(() => setNotice(null), [])

  return { targetId, pendingId, notice, request, cancel, confirm, dismissNotice }
}
