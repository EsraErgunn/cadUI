import { useCallback, useState } from 'react'

import { submitProjectDecision } from '../api/projectDetail'
import { submitProject } from '../api/projects'
import type { Id } from '../core/model'
import { useIsGasDistributionUser } from '../ui/admin/useRole'
import { runProjectValidation } from '../ui/validation/useProjectValidation'

/**
 * Üst bardaki tek düğmenin iki yüzü. Rol seçiyor: gaz dağıtım kullanıcısı
 * projeyi ONAYLAR, proje firması kullanıcısı ve yönetici onaya GÖNDERİR —
 * sunucu da aynı sınırı çiziyor (`submit` → Admin/ProjectFirmUser,
 * `approve` → Admin/GasDistributionUser).
 */
export type EditorSubmitKind = 'submit' | 'approve'

export type EditorSubmitNotice = {
  tone: 'success' | 'error'
  message: string
  /** Eksik evrak listesi gibi satır satır okunan ayrıntı. */
  details?: string[]
}

export type EditorSubmit = {
  kind: EditorSubmitKind
  isPending: boolean
  notice: EditorSubmitNotice | null
  /** Denetim temizse isteği ATAR, hata varsa onay penceresini açar. */
  request: () => void
  /** Onay penceresindeki hata sayısı; `null` ise pencere kapalı. */
  confirmIssueCount: number | null
  confirm: () => void
  cancel: () => void
  dismissNotice: () => void
}

const SUCCESS_MESSAGES: Record<EditorSubmitKind, string> = {
  submit: 'Proje onaya gönderildi.',
  approve: 'Proje onaylandı.',
}

const ERROR_MESSAGES: Record<EditorSubmitKind, string> = {
  submit: 'Proje gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.',
  approve: 'Proje onaylanamadı. Bağlantınızı kontrol edip tekrar deneyin.',
}

const MISSING_DOCUMENTS_MESSAGE =
  'Proje onaya gönderilemedi: aşağıdaki evraklar eksik. Evrakları yükleyip tekrar gönderin.'

const MISSING_PROJECT_MESSAGE = 'Proje kimliği okunamadı; editörü kapatıp yeniden açın.'

/**
 * Üst bardaki "Gönder" / "Onayla" düğmesinin arkası (K175).
 *
 * Düğme DURUMA bakmıyor (kullanıcı kararı): taslak değilse ya da zaten
 * onaylanmışsa son sözü sunucu söyler ve reddi şerit olarak görünür. Pasif bir
 * düğme, kullanıcının neden basamadığını anlatmak için editörün bilmediği bir
 * veriyi (proje durumu) ayrıca çekmeyi gerektirirdi.
 *
 * Hata kontrolü ENGEL DEĞİL, UYARI: denetim hata bulursa istek atılmaz, onay
 * penceresi açılır ve kullanıcı yine de gönderebilir. Ürün kuralı da bu yönde
 * ("bağlanmamış boru ucu uyarıyla gösterilir ama çalışmayı ENGELLEMEZ").
 *
 * `pages/` içinde: rolü (`ui/admin/useRole`) ve denetimi (`ui/validation`)
 * birleştiriyor, öteki editör hook'ları da burada.
 */
export function useEditorSubmit(projectId: Id | undefined): EditorSubmit {
  const kind: EditorSubmitKind = useIsGasDistributionUser() ? 'approve' : 'submit'
  const [isPending, setIsPending] = useState(false)
  const [notice, setNotice] = useState<EditorSubmitNotice | null>(null)
  const [confirmIssueCount, setConfirmIssueCount] = useState<number | null>(null)

  const send = useCallback(async () => {
    if (projectId === undefined) {
      setNotice({ tone: 'error', message: MISSING_PROJECT_MESSAGE })
      return
    }

    setIsPending(true)
    try {
      if (kind === 'approve') {
        // Gerekçe YOK: ret editörde teklif edilmiyor, karar penceresi ve
        // gerekçe alanı proje listesinde/detayında yaşıyor.
        const result = await submitProjectDecision(projectId, 'approve', null)
        const approvalNote =
          result.approvalCode === null ? '' : ` Onay kodu: ${result.approvalCode}.`
        setNotice({ tone: 'success', message: `${SUCCESS_MESSAGES.approve}${approvalNote}` })
        return
      }

      const result = await submitProject(projectId)
      if (!result.ok) {
        // Eksik evrak bir HATA değil, tamamlanmamış iş: proje taslakta kalır,
        // kullanıcı evrakları yükleyip aynı düğmeden tekrar dener.
        setNotice({
          tone: 'error',
          message: MISSING_DOCUMENTS_MESSAGE,
          details: result.missingDocuments,
        })
        return
      }

      setNotice({ tone: 'success', message: SUCCESS_MESSAGES.submit })
    } catch {
      setNotice({ tone: 'error', message: ERROR_MESSAGES[kind] })
    } finally {
      setIsPending(false)
      setConfirmIssueCount(null)
    }
  }, [kind, projectId])

  const request = useCallback(() => {
    setNotice(null)

    const issueCount = runProjectValidation().length
    if (issueCount > 0) {
      setConfirmIssueCount(issueCount)
      return
    }

    void send()
  }, [send])

  return {
    kind,
    isPending,
    notice,
    request,
    confirmIssueCount,
    confirm: () => void send(),
    cancel: () => setConfirmIssueCount(null),
    dismissNotice: () => setNotice(null),
  }
}
