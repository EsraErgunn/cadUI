import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  DRAFT_STATUS,
  getProjectDetail,
  getProjectFirmInfo,
  getProjectDocuments,
  getProjectHistory,
  getProjectPolicies,
  getProjectUnits,
  requestProjectFile,
  type ProjectFileKind,
} from '../api/projectDetail'
import { projectFirmQueryKey } from '../api/projectFirmForm'
import { useAuthSession } from '../api/useAuthSession'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { QueryError, QueryLoading } from '../ui/admin/QueryStates'
import { useSavedDocumentNotice } from '../ui/admin/documents/useSavedDocumentNotice'
import { useSavedPolicyNotice } from '../ui/admin/policies/useSavedPolicyNotice'
import { ProjectDetailHeader } from '../ui/admin/projectDetail/ProjectDetailHeader'
import { ProjectDetailPanels } from '../ui/admin/projectDetail/ProjectDetailPanels'
import { ProjectDetailTabs } from '../ui/admin/projectDetail/ProjectDetailTabs'
import { ReasonDialog } from '../ui/admin/projectDetail/ReasonDialog'
import { buildApprovalFromHistory } from '../ui/admin/projectDetail/approvalFromHistory'
import { mergeDecisionHistory } from '../ui/admin/projectDetail/decisionHistory'
import { useProjectDecisions } from '../ui/admin/projectDetail/useProjectDecisions'
import { useProjectDetailTab } from '../ui/admin/projectDetail/useProjectDetailTab'
import { useProjectDocumentActions } from '../ui/admin/projectDetail/useProjectDocumentActions'
import { useCanApproveProject } from '../ui/admin/useCanApproveProject'

const PANEL_ID = 'project-detail-panel'

const REASON_DIALOG_COPY = {
  reject: {
    title: 'Proje reddedilsin mi?',
    description: 'Gerekçe işlem geçmişine kaydedilir ve firma kullanıcısına iletilir.',
    confirmLabel: 'Reddet',
  },
} as const

const FILE_UNAVAILABLE_MESSAGES: Record<ProjectFileKind, string> = {
  zpd: 'ZetaCAD proje dosyasını (.zpd) veren uç sunucuda henüz yok.',
  pdfReport: 'PDF raporu üreten uç sunucuda henüz yok.',
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
  // Evrak Ekle ekranından dönüşteki başarı bildirimi (gereksinim 12).
  const savedDocumentNotice = useSavedDocumentNotice()
  // Poliçe Oluşturma ekranından dönüşteki başarı bildirimi (KK-21).
  const savedPolicyNotice = useSavedPolicyNotice()

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
    queryFn: ({ signal }) => getProjectHistory(projectId ?? 0, signal),
    enabled: projectId !== undefined,
  })

  const { data: documents } = useQuery({
    queryKey: ['projectDocuments', projectId],
    queryFn: () => getProjectDocuments(projectId ?? 0),
    enabled: projectId !== undefined,
  })

  const { data: policies } = useQuery({
    queryKey: ['projectPolicies', projectId],
    queryFn: () => getProjectPolicies(projectId ?? 0),
    enabled: projectId !== undefined,
  })

  /**
   * Proje firması künyesi — kimlik detay yanıtından geliyor. Anahtar tekil
   * firma sorgusuyla ORTAK (`projectFirmQueryKey`): firma güncellenince bu kart
   * da tazeleniyor, ikinci bir kopya önbellek tutulmuyor.
   */
  const projectFirmId = detailQuery.data?.server.projectFirmId ?? null
  const { data: firm } = useQuery({
    queryKey: projectFirmQueryKey(projectFirmId),
    queryFn: ({ signal }) => getProjectFirmInfo(projectFirmId ?? 0, signal),
    enabled: projectFirmId !== null,
  })

  const documentActions = useProjectDocumentActions(projectId ?? 0)

  /** Evrak sekmesindeki "Birim Değiştir" kutusu projenin birimlerinden besleniyor. */
  const documentUnitOptions = useMemo(() => {
    if (units === undefined || units.source === 'unavailable') return []

    return units.data.map((unit) => ({
      id: unit.id,
      // Birim numarası boş olabiliyor (çizimden senkron); abone adı ayırt
      // etmeye yardım ediyor, ikisi de yoksa kimlik yazılıyor.
      label:
        [unit.unitNumber, unit.subscriberName].filter((part) => part !== null).join(' — ') ||
        `#${unit.id}`,
    }))
  }, [units])

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
  // Karar verildiyse durum ONDAN gelir: proje durumu hâlâ mock bir kaynaktan
  // okunduğu için sorguyu tazelemek işlemi geri alınmış gösterirdi.
  const status = decisions.outcome?.status ?? detail.extras?.general.status ?? null
  // Durum BİLİNMİYORSA taslak SAYILMAZ. Detay ucu durum döndürmüyor
  // (`projectDetailExtras` hâlâ mock, üretimde `extras` boş geliyor) ve
  // "bilinmiyor = taslak" varsayımı Onayla/Reddet düğmelerini üretimde her
  // projede kapatıyordu. KK-2 kilidi yalnız durumu GERÇEKTEN taslak olan
  // kayıtta çalışır; geri kalanında son sözü sunucu söyler (iş kuralı hatası
  // 400 döner ve bildirim olarak çıkar).
  const isDraft = status === DRAFT_STATUS

  const historyRows = mergeDecisionHistory(
    history === undefined || history.source === 'unavailable' ? [] : history.data,
    decisions.outcome,
    { name: session?.fullName ?? 'Bilinmeyen kullanıcı', roleLabel: session?.roleCode ?? '—' },
  )

  // Onay künyesinin kaynağı işlem geçmişi: sunucuda ayrı bir "onay bilgileri"
  // alanı yok. `historyRows` kullanılıyor ki bu turda verilen karar da künyeye
  // ANINDA yansısın — ham `history` beklenirse kullanıcı onayladıktan sonra kart
  // bir sonraki çekime kadar boş kalırdı.
  const approval = buildApprovalFromHistory(historyRows)

  const reasonCopy = decisions.reasonPrompt === null ? null : REASON_DIALOG_COPY[decisions.reasonPrompt]

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
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

      {savedDocumentNotice !== null && (
        // Kayıt SUNUCUDA: artık yarım bir işlem değil, düz başarı bildirimi.
        <NoticeBar
          tone="success"
          message={savedDocumentNotice.message}
          onDismiss={savedDocumentNotice.dismiss}
        />
      )}

      {savedPolicyNotice !== null && (
        // `success`: kayıt artık `POST /api/policies` ile gerçekten kalıcı.
        // Bir süre `warning` idi çünkü poliçe yalnız bellekteki depoya yazılıyordu.
        <NoticeBar
          tone="success"
          message={savedPolicyNotice.message}
          onDismiss={savedPolicyNotice.dismiss}
        />
      )}

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
          detail={detail}
          units={units}
          history={history}
          historyRows={historyRows}
          documents={documents}
          firm={firm ?? null}
          approval={approval}
          documentUnitOptions={documentUnitOptions}
          documentActions={documentActions}
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
