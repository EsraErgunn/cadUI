import { ProjectDocumentsTab } from './ProjectDocumentsTab'
import { ProjectHistoryTab } from './ProjectHistoryTab'
import { ProjectInfoTab } from './ProjectInfoTab'
import { ProjectOperationsTab } from './ProjectOperationsTab'
import { ProjectPlanTab } from './ProjectPlanTab'
import { ProjectPolicyTab } from './ProjectPolicyTab'
import type { ProjectDetailTabKey } from './tabItems'
import type { Sourced } from '../../../api/mockGate'
import type {
  ProjectDecision,
  ProjectDetail,
  ProjectDocumentRow,
  ProjectFileKind,
  ProjectHistoryRow,
  ProjectPolicyRow,
  ProjectUnitRow,
} from '../../../api/projectDetail'

interface ProjectDetailPanelsProps {
  tab: ProjectDetailTabKey
  projectId: number
  detail: ProjectDetail
  units: Sourced<ProjectUnitRow[]> | undefined
  history: Sourced<ProjectHistoryRow[]> | undefined
  historyRows: ProjectHistoryRow[]
  documents: Sourced<ProjectDocumentRow[]> | undefined
  policies: Sourced<ProjectPolicyRow[]> | undefined
  canApprove: boolean
  isDraft: boolean
  isSubmitting: boolean
  onDecision: (decision: ProjectDecision) => void
  onDownload: (kind: ProjectFileKind) => void
}

/**
 * Aktif sekmenin içeriği. Sayfadan ayrıldı: altı dalı da sayfanın içinde tutmak
 * bileşeni 200 satırın üstüne çıkarıyordu (CLAUDE.md).
 *
 * Sekme değişince yalnız bu dal değişir; sayfa yeniden YÜKLENMEZ (KK-3) —
 * yönlendirme yok, adres yalnız query parametresiyle güncelleniyor.
 */
export function ProjectDetailPanels({
  tab,
  projectId,
  detail,
  units,
  history,
  historyRows,
  documents,
  policies,
  canApprove,
  isDraft,
  isSubmitting,
  onDecision,
  onDownload,
}: ProjectDetailPanelsProps) {
  if (tab === 'bilgi') {
    return (
      <ProjectInfoTab
        detail={detail}
        units={units}
        onDownloadZpd={() => onDownload('zpd')}
      />
    )
  }

  if (tab === 'plan') {
    return <ProjectPlanTab projectId={projectId} onDownloadDwg={() => onDownload('planDwg')} />
  }

  if (tab === 'gecmis') {
    return (
      <ProjectHistoryTab
        history={
          history === undefined || history.source === 'unavailable'
            ? history
            : { source: history.source, data: historyRows }
        }
      />
    )
  }

  if (tab === 'evrak') return <ProjectDocumentsTab documents={documents} />

  if (tab === 'police') return <ProjectPolicyTab policies={policies} />

  return (
    <ProjectOperationsTab
      canApprove={canApprove}
      isDraft={isDraft}
      isSubmitting={isSubmitting}
      onDecision={onDecision}
      onPdfReport={() => onDownload('pdfReport')}
    />
  )
}
