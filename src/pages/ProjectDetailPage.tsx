import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  DRAFT_STATUS,
  getProjectDetail,
  getProjectDocuments,
  getProjectHistory,
  getProjectPolicies,
  getProjectUnits,
  requestProjectFile,
  type ProjectFileKind,
} from '../api/projectDetail'
import { useAuthSession } from '../api/useAuthSession'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { MockDataNotice } from '../ui/admin/projectDetail/MockDataNotice'
import { ProjectDetailHeader } from '../ui/admin/projectDetail/ProjectDetailHeader'
import { ProjectDetailPanels } from '../ui/admin/projectDetail/ProjectDetailPanels'
import { ProjectDetailTabs } from '../ui/admin/projectDetail/ProjectDetailTabs'
import { ReasonDialog } from '../ui/admin/projectDetail/ReasonDialog'
import { mergeDecisionHistory } from '../ui/admin/projectDetail/decisionHistory'
import { useProjectDecisions } from '../ui/admin/projectDetail/useProjectDecisions'
import { useProjectDetailTab } from '../ui/admin/projectDetail/useProjectDetailTab'
import { useCanApproveProject } from '../ui/admin/useCanApproveProject'

const PANEL_ID = 'project-detail-panel'

const REASON_DIALOG_COPY = {
  reject: {
    title: 'Proje reddedilsin mi?',
    description: 'Gerekçe işlem geçmişine kaydedilir ve firma kullanıcısına iletilir.',
    confirmLabel: 'Reddet',
  },
  requestRevision: {
    title: 'Revizyon istensin mi?',
    description: 'Gerekçe işlem geçmişine kaydedilir ve firma kullanıcısına iletilir.',
    confirmLabel: 'Revizyon İste',
  },
} as const

const FILE_UNAVAILABLE_MESSAGES: Record<ProjectFileKind, string> = {
  zpd: 'ZetaCAD proje dosyasını (.zpd) veren uç sunucuda henüz yok.',
  planDwg: 'Planı DWG olarak üreten uç sunucuda henüz yok.',
  pdfReport: 'PDF raporu üreten uç sunucuda henüz yok.',
}

/** Mock uyarısında sayılan bölümler; hangi kartın uydurma olduğu açıkça yazsın. */
function buildMockSections(hasExtras: boolean, hasUnits: boolean): string[] {
  const sections: string[] = []

  if (hasExtras) {
    sections.push(
      'Proje Genel Bilgileri (durum, tesisat no, G.D. firması, proje/ısınma tipi, müstakil, ruhsat)',
      'Proje Firma Bilgileri (kartın tamamı)',
      'Proje Onay Bilgileri (kartın tamamı)',
      'Detay Bilgileri (kartın tamamı)',
    )
  }
  if (hasUnits) sections.push('Birim / Cihaz Bilgileri tablosu')

  return sections
}

function parseProjectId(raw: string | undefined): number | undefined {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export function ProjectDetailPage() {
  const projectId = parseProjectId(useParams().projectId)
  const { tab, setTab } = useProjectDetailTab()
  const canApprove = useCanApproveProject()
  const session = useAuthSession()
  const [fileNotice, setFileNotice] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: ['projectDetail', projectId],
    queryFn: ({ signal }) => getProjectDetail(projectId ?? 0, signal),
    enabled: projectId !== undefined,
  })

  const { data: units } = useQuery({
    queryKey: ['projectUnits', projectId],
    queryFn: () => getProjectUnits(projectId ?? 0),
    enabled: projectId !== undefined,
  })

  const { data: history } = useQuery({
    queryKey: ['projectHistory', projectId],
    queryFn: () => getProjectHistory(projectId ?? 0),
    enabled: projectId !== undefined,
  })

  const { data: documents } = useQuery({
    queryKey: ['projectDocuments', projectId],
    queryFn: getProjectDocuments,
    enabled: projectId !== undefined,
  })

  const { data: policies } = useQuery({
    queryKey: ['projectPolicies', projectId],
    queryFn: getProjectPolicies,
    enabled: projectId !== undefined,
  })

  const decisions = useProjectDecisions(projectId ?? 0)

  const handleDownload = useCallback(async (kind: ProjectFileKind) => {
    const result = await requestProjectFile(kind)
    // Uç açılınca `ok: true` gelecek ve indirme başlayacak; bugün eksikliği
    // SÖYLÜYORUZ — sahte bir dosya indirmek diske kalıcı bir yalan yazardı.
    if (!result.ok) setFileNotice(FILE_UNAVAILABLE_MESSAGES[kind])
  }, [])

  if (projectId === undefined) {
    return <QueryError message="Proje kimliği okunamadı." onRetry={() => window.history.back()} />
  }

  if (detailQuery.isPending) return <QueryLoading message="Proje detayı yükleniyor…" />

  if (detailQuery.isError || detailQuery.data === undefined) {
    return (
      <QueryError message="Proje detayı yüklenemedi." onRetry={() => void detailQuery.refetch()} />
    )
  }

  const detail = detailQuery.data
  // Karar verildiyse durum ONDAN gelir: uç olmadığı için sorguyu tazelemek
  // mock'un ilk hâlini geri getirir ve işlem geri alınmış görünürdü.
  const status = decisions.outcome?.status ?? detail.extras?.general.status ?? null
  const isDraft = status === null || status === DRAFT_STATUS

  const historyRows = mergeDecisionHistory(
    history === undefined || history.source === 'unavailable' ? [] : history.data,
    decisions.outcome,
    { name: session?.fullName ?? 'Bilinmeyen kullanıcı', roleLabel: session?.roleCode ?? '—' },
  )

  const reasonCopy = decisions.reasonPrompt === null ? null : REASON_DIALOG_COPY[decisions.reasonPrompt]

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5">
      <ProjectDetailHeader
        detail={detail}
        status={status}
        canApprove={canApprove}
        isDraft={isDraft}
        isSubmitting={decisions.isSubmitting}
        onApprove={() => decisions.start('approve')}
        onReject={() => decisions.start('reject')}
        onDownloadPdf={() => void handleDownload('pdfReport')}
      />

      <MockDataNotice
        sections={buildMockSections(
          detail.extras !== null,
          units !== undefined && units.source === 'mock',
        )}
      />

      {decisions.notice !== null && (
        <NoticeBar
          tone={decisions.notice.tone}
          message={decisions.notice.message}
          details={decisions.notice.details}
          onDismiss={decisions.dismissNotice}
        />
      )}

      {fileNotice !== null && (
        <NoticeBar tone="error" message={fileNotice} onDismiss={() => setFileNotice(null)} />
      )}

      <ProjectDetailTabs value={tab} onChange={setTab} panelId={PANEL_ID} />

      <div id={PANEL_ID} role="tabpanel" aria-label="Proje detayı içeriği">
        <ProjectDetailPanels
          tab={tab}
          projectId={projectId}
          detail={detail}
          units={units}
          history={history}
          historyRows={historyRows}
          documents={documents}
          policies={policies}
          canApprove={canApprove}
          isDraft={isDraft}
          isSubmitting={decisions.isSubmitting}
          onDecision={decisions.start}
          onDownload={(kind) => void handleDownload(kind)}
        />
      </div>

      {reasonCopy !== null && (
        <ReasonDialog
          title={reasonCopy.title}
          description={reasonCopy.description}
          confirmLabel={reasonCopy.confirmLabel}
          isPending={decisions.isSubmitting}
          onConfirm={decisions.confirmReason}
          onCancel={decisions.cancelReason}
        />
      )}
    </div>
  )
}
