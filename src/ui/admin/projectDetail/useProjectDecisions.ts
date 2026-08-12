import { useCallback, useState } from 'react'

import {
  requiresReason,
  submitProjectDecision,
  type ProjectDecision,
  type ProjectDetailStatus,
  type ReasonRequiredDecision,
} from '../../../api/projectDetail'
import type { NoticeTone } from '../NoticeBar'

export interface DecisionOutcome {
  decision: ProjectDecision
  status: ProjectDetailStatus
  approvalCode: string | null
  reason: string | null
  /** ISO damgası; işlem geçmişine eklenen satırın tarihi. */
  at: string
}

interface DecisionNotice {
  tone: NoticeTone
  message: string
  details?: string[]
}

const DECISION_SUCCESS_MESSAGES: Record<ProjectDecision, string> = {
  approve: 'Proje onaylandı.',
  reject: 'Proje reddedildi.',
  requestRevision: 'Revizyon talebi oluşturuldu.',
}

const UNIMPLEMENTED_MESSAGE =
  'İşlem yapılamadı: onay/ret/revizyon ucu sunucuda henüz yok.'

/**
 * Kayıt sunucuya yazılmadığı için her başarılı işlemin yanında duran uyarı.
 * Proje firması yetkilendirmelerindeki `arePersisted` deseninin aynısı: işlem
 * "başarılı" ama YARIM, o yüzden `warning` tonu ve `danger` değil.
 */
const NOT_PERSISTED_DETAILS = [
  'Sonuç yalnız bu ekranda görünür; sunucuya kaydedilmedi.',
  'Gerekçenin firma kullanıcısına bildirim olarak iletilmesi de sunucu tarafında yazılmadı.',
]

export interface ProjectDecisionsState {
  /** Gerekçe diyaloğu açık olan işlem; `null` ise diyalog kapalı. */
  reasonPrompt: ReasonRequiredDecision | null
  isSubmitting: boolean
  outcome: DecisionOutcome | null
  notice: DecisionNotice | null
  start: (decision: ProjectDecision) => void
  confirmReason: (reason: string) => void
  cancelReason: () => void
  dismissNotice: () => void
}

/**
 * Onay / ret / revizyon akışı (KK-10, KK-11).
 *
 * Sonuç `outcome` olarak BURADA tutuluyor ve sayfa durumu bununla eziyor:
 * uç olmadığı için sorguyu tazelemenin anlamı yok, tazeleme mock'un ilk hâlini
 * geri getirir ve kullanıcı işleminin geri alındığını sanırdı.
 */
export function useProjectDecisions(projectId: number): ProjectDecisionsState {
  const [reasonPrompt, setReasonPrompt] = useState<ReasonRequiredDecision | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null)
  const [notice, setNotice] = useState<DecisionNotice | null>(null)

  const run = useCallback(
    async (decision: ProjectDecision, reason: string | null) => {
      setIsSubmitting(true)
      try {
        const result = await submitProjectDecision(projectId, decision)

        if (!result.ok) {
          setNotice({ tone: 'error', message: UNIMPLEMENTED_MESSAGE })
          return
        }

        setOutcome({
          decision,
          status: result.status,
          approvalCode: result.approvalCode,
          reason,
          at: new Date().toISOString(),
        })

        const approvalNote =
          result.approvalCode === null ? '' : ` Onay kodu: ${result.approvalCode}.`

        setNotice({
          tone: result.isPersisted ? 'success' : 'warning',
          message: `${DECISION_SUCCESS_MESSAGES[decision]}${approvalNote}`,
          details: result.isPersisted ? undefined : NOT_PERSISTED_DETAILS,
        })
      } finally {
        setIsSubmitting(false)
        setReasonPrompt(null)
      }
    },
    [projectId],
  )

  const start = useCallback(
    (decision: ProjectDecision) => {
      setNotice(null)

      if (requiresReason(decision)) {
        setReasonPrompt(decision)
        return
      }

      void run(decision, null)
    },
    [run],
  )

  const confirmReason = useCallback(
    (reason: string) => {
      if (reasonPrompt === null) return
      void run(reasonPrompt, reason)
    },
    [reasonPrompt, run],
  )

  return {
    reasonPrompt,
    isSubmitting,
    outcome,
    notice,
    start,
    confirmReason,
    cancelReason: () => setReasonPrompt(null),
    dismissNotice: () => setNotice(null),
  }
}
