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
}

const DECISION_ERROR_MESSAGE = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'

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
 * Onay / ret akışı (KK-10, KK-11). Revizyon talebinin sunucuda karşılığı YOK,
 * bu yüzden karar kümesi iki değerli.
 *
 * Sonuç `outcome` olarak BURADA tutuluyor ve sayfa durumu bununla eziyor:
 * proje durumu ayrı bir uçtan gelmediği için (`projectDetailExtras` hâlâ mock)
 * sorguyu tazelemek işlemi geri alınmış gösterirdi.
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
        const result = await submitProjectDecision(projectId, decision, reason)

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
          tone: 'success',
          message: `${DECISION_SUCCESS_MESSAGES[decision]}${approvalNote}`,
        })
      } catch {
        setNotice({ tone: 'error', message: DECISION_ERROR_MESSAGE })
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
