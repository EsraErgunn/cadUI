import type { DecisionOutcome } from './useProjectDecisions'
import type {
  HistoryOperation,
  ProjectDecision,
  ProjectHistoryRow,
} from '../../../api/projectDetail'

/** Her karar işlem geçmişine kendi etiketiyle düşer (KK-11). */
const DECISION_OPERATIONS: Record<ProjectDecision, HistoryOperation> = {
  approve: 'projeOnay',
  reject: 'projeRet',
  requestRevision: 'revizyonTalebi',
}

/**
 * Uç olmadığı için sunucudan gelmeyen, işlemi yapan kullanıcının kendi
 * oturumundan üretilen kayıt kimliği. Negatif: gerçek kayıt kimlikleri pozitif
 * artan tamsayı (knowledge/id-scheme.md), çakışma olmaz ve satırın sunucudan
 * gelmediği kimliğinden bile bellidir.
 */
const LOCAL_DECISION_ROW_ID = -1

interface DecisionActor {
  name: string
  /** "Yetki" sütununa yazılan kaynak; oturumdaki rol adı. */
  roleLabel: string
}

/**
 * Karar sonrası işlem geçmişine eklenen satır (KK-11). Gerekçe açıklama
 * alanında görünür — revizyon talebinin gerekçesinin görüneceği yer burası.
 */
export function mergeDecisionHistory(
  rows: ProjectHistoryRow[],
  outcome: DecisionOutcome | null,
  actor: DecisionActor,
): ProjectHistoryRow[] {
  if (outcome === null) return rows

  const decisionRow: ProjectHistoryRow = {
    id: LOCAL_DECISION_ROW_ID,
    fileType: null,
    createdAt: outcome.at,
    userName: actor.name,
    roleSnapshot: actor.roleLabel,
    operation: DECISION_OPERATIONS[outcome.decision],
    description: outcome.reason,
  }

  return [decisionRow, ...rows]
}
