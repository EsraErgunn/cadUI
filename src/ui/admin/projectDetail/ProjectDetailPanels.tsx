import type { ProjectDocumentUnitOption } from './ProjectDocumentUnitDialog'
import { ProjectDocumentsTab, type ProjectDocumentActions } from './ProjectDocumentsTab'
import { ProjectHistoryTab } from './ProjectHistoryTab'
import { ProjectInfoTab } from './ProjectInfoTab'
import { ProjectOperationsTab } from './ProjectOperationsTab'
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
  detail: ProjectDetail
  units: Sourced<ProjectUnitRow[]> | undefined
  history: Sourced<ProjectHistoryRow[]> | undefined
  historyRows: ProjectHistoryRow[]
  documents: Sourced<ProjectDocumentRow[]> | undefined
  /** Evrak sekmesindeki "Birim Değiştir" kutusunun kaynağı. */
  documentUnitOptions: ProjectDocumentUnitOption[]
  documentActions: ProjectDocumentActions
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
  detail,
  units,
  history,
  historyRows,
  documents,
  documentUnitOptions,
  documentActions,
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

  // Proje kimliği "Evrak Ekle" bağlantısına gidiyor: yüklenen evrak GELİNEN
  // projeyle ilişkilendiriliyor, ekran kimliksiz açılamaz (gereksinim 6).
  if (tab === 'evrak') {
    return (
      <ProjectDocumentsTab
        projectId={detail.server.id}
        documents={documents}
        units={documentUnitOptions}
        actions={documentActions}
      />
    )
  }

  if (tab === 'police') {
    return <ProjectPolicyTab projectId={detail.server.id} policies={policies} />
  }

  return (
    <ProjectOperationsTab
      projectId={detail.server.id}
      canApprove={canApprove}
      isDraft={isDraft}
      isSubmitting={isSubmitting}
      onDecision={onDecision}
      onPdfReport={() => onDownload('pdfReport')}
    />
  )
}
