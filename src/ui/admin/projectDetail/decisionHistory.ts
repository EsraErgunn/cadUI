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
}

/**
 * Sunucudan gelmeyen, işlemi yapan kullanıcının kendi oturumundan üretilen
 * satır anahtarı. Sunucu satırlarının anahtarı damga + kod + sıradan kuruluyor,
 * bu sabit onlarla çakışmaz ve satırın yerel olduğu anahtarından bellidir.
 */
const LOCAL_DECISION_ROW_ID = 'local-decision'

interface DecisionActor {
  name: string
  /** "Yetki" sütununa yazılan kaynak; oturumdaki rol adı. */
  roleLabel: string
}

/**
 * Karar sonrası işlem geçmişine eklenen satır (KK-11). Gerekçe açıklama
 * alanında görünür — ret gerekçesinin görüneceği yer burası.
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
    operationName: null,
    description: outcome.reason,
  }

  return [decisionRow, ...rows]
}
