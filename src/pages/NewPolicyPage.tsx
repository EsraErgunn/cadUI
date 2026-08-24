import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { PROJECT_LIST_PATH } from './useCloseEditor'
import { listInsuranceCompanies } from '../api/policies'
import { getProjectSummary, getProjectUnits, type ProjectSummary } from '../api/projectDetail'
import { ConfirmDialog } from '../ui/admin/ConfirmDialog'
import { MockDataNotice } from '../ui/admin/MockDataNotice'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { ProjectContextNotice } from '../ui/admin/ProjectContextNotice'
import { parseProjectParam, projectDetailPath } from '../ui/admin/adminNavItems'
import { ADMIN_PARAM_KEYS } from '../ui/admin/adminUrlParams'
import { PolicyFirmStep } from '../ui/admin/policies/PolicyFirmStep'
import { PolicyInfoStep } from '../ui/admin/policies/PolicyInfoStep'
import {
  PolicyDoneStep,
  PolicyMethodStep,
  PolicyStepper,
} from '../ui/admin/policies/PolicyStepper'
import { PolicySummaryStep } from '../ui/admin/policies/PolicySummaryStep'
import { PolicyWizardFooter } from '../ui/admin/policies/PolicyWizardFooter'
import { policyFieldId } from '../ui/admin/policies/policySchema'
import { usePolicyWizard } from '../ui/admin/policies/usePolicyWizard'
import type { ProjectDetailTabKey } from '../ui/admin/projectDetail/tabItems'
import { useHomePath } from '../ui/admin/useHomePath'

const PAGE_TITLE = 'Poliçe Oluşturma'

/**
 * Kırılım "Poliçeler" bölümünden GEÇMEZ (K68): ekran bir projenin işlemi,
 * kullanıcı buraya proje detayından geliyor ve geri dönüşü de oraya.
 */
function buildBreadcrumb(project: ProjectSummary, homePath: string) {
  return [
    { label: 'Anasayfa', to: homePath },
    { label: 'Projeler', to: PROJECT_LIST_PATH },
    { label: project.name, to: projectDetailPath(project.id) },
    { label: PAGE_TITLE },
  ]
}

/** Kayıt sonrası kullanıcı poliçenin listelendiği sekmede açılır (KK-21). */
const POLICY_TAB: ProjectDetailTabKey = 'police'

const MOCK_SECTIONS = [
  'Sigorta şirketi ve acente listeleri (örnek acente adları)',
  'Poliçe kaydı — yalnız bu oturumda tutulur, sunucuya yazılmaz',
]

const CANCEL_DIALOG = {
  title: 'Poliçe oluşturmaktan vazgeçilsin mi?',
  description: 'Girilen bilgiler kaydedilmeden Proje Detayı ekranına dönülecek.',
  confirmLabel: 'Vazgeç',
  cancelLabel: 'Devam et',
}

export function NewPolicyPage() {
  const homePath = useHomePath()
  // Kimlik YOLDA (K68): adres zaten `/projects/:projectId/policies/new`.
  const { projectId: rawProjectId } = useParams()
  const projectId = parseProjectParam(rawProjectId ?? null)
  const navigate = useNavigate()
  const [isCancelPrompted, setIsCancelPrompted] = useState(false)

  // Künye GERÇEK uçtan (K63): mock tohumundan okunsaydı sunucudaki proje ya
  // bulunamaz ya başka bir projenin adıyla açılırdı.
  // Poliçe sunucuda BİRİME bağlanıyor; seçim kutusunun kaynağı proje detayının
  // kullandığı uç — anahtar ORTAK, iki ekran arasında ikinci istek çıkmıyor.
  const unitsQuery = useQuery({
    queryKey: ['projectUnits', projectId],
    queryFn: ({ signal }) => getProjectUnits(projectId ?? 0, signal),
    enabled: projectId !== undefined,
  })

  const unitOptions = useMemo(() => {
    if (unitsQuery.data === undefined || unitsQuery.data.source === 'unavailable') return []

    return unitsQuery.data.data.map((unit) => ({
      id: unit.id,
      // Birim numarası boş olabiliyor (çizimden senkron); abone adı ayırt
      // etmeye yardım ediyor, ikisi de yoksa kimlik yazılıyor.
      label:
        [unit.unitNumber, unit.subscriberName].filter((part) => part !== null).join(' — ') ||
        `#${unit.id}`,
    }))
  }, [unitsQuery.data])

  const projectQuery = useQuery({
    queryKey: ['projectSummary', projectId],
    queryFn: ({ signal }) => getProjectSummary(projectId ?? 0, signal),
    enabled: projectId !== undefined,
  })

  const wizard = usePolicyWizard({ project: projectQuery.data ?? undefined })
  const { focusField, clearFocusRequest, values } = wizard

  const { data: companies } = useQuery({
    queryKey: ['insuranceCompanies'],
    queryFn: ({ signal }) => listInsuranceCompanies(signal),
  })

  useEffect(() => {
    if (focusField === null) return

    document.getElementById(policyFieldId(focusField))?.focus()
    clearFocusRequest()
  }, [focusField, clearFocusRequest])

  const project = projectQuery.data
  const goToProjectList = () => void navigate(PROJECT_LIST_PATH)

  if (projectId === undefined || project === null) {
    return <ProjectContextNotice state="missing" screenName={PAGE_TITLE} onRetry={goToProjectList} />
  }
  if (projectQuery.isPending) {
    return <ProjectContextNotice state="loading" screenName={PAGE_TITLE} onRetry={goToProjectList} />
  }
  if (projectQuery.isError || project === undefined) {
    return (
      <ProjectContextNotice
        state="failed"
        screenName={PAGE_TITLE}
        onRetry={() => void projectQuery.refetch()}
      />
    )
  }

  const companyRows = companies === undefined || companies.source === 'unavailable' ? [] : companies.data

  const goToDetail = (state?: { savedPolicyNumber: string }) => {
    void navigate(`${projectDetailPath(project.id)}?${ADMIN_PARAM_KEYS.tab}=${POLICY_TAB}`, {
      state,
    })
  }

  const handleCancel = () => {
    if (wizard.isDirty) {
      setIsCancelPrompted(true)
      return
    }
    goToDetail()
  }

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <PageHeader
        breadcrumb={buildBreadcrumb(project, homePath)}
        title={PAGE_TITLE}
      />

      <p className="text-sm text-ink-muted">
        Oluşturulan poliçe <span className="font-medium text-ink">{project.name}</span> projesiyle
        ilişkilendirilecek.
      </p>

      <MockDataNotice
        sections={companies !== undefined && companies.source === 'mock' ? MOCK_SECTIONS : []}
      />

      {wizard.submitError !== null && (
        <NoticeBar
          tone="error"
          message={wizard.submitError}
          onDismiss={wizard.clearSubmitError}
        />
      )}

      <div className="flex flex-col gap-6 rounded-xl border border-edge bg-surface p-5">
        <PolicyStepper step={wizard.step} />

        {wizard.step === 'method' && <PolicyMethodStep />}

        {wizard.step === 'firm' && (
          <PolicyFirmStep
            values={values}
            errors={wizard.errors}
            companies={companyRows}
            hasCompanySource={companies === undefined || companies.source !== 'unavailable'}
            onCompanyChange={(id) => wizard.setValue('insuranceCompanyId', id)}
          />
        )}

        {wizard.step === 'info' && (
          <PolicyInfoStep
            values={values}
            errors={wizard.errors}
            units={unitOptions}
            areUnitsPending={unitsQuery.isPending}
            onChange={wizard.setValue}
            onAmountChange={wizard.setAmountText}
            onAmountBlur={wizard.formatAmount}
          />
        )}

        {wizard.step === 'summary' && (
          <PolicySummaryStep values={values} companies={companyRows} units={unitOptions} />
        )}

        {wizard.step === 'done' && <PolicyDoneStep />}

        <PolicyWizardFooter
          step={wizard.step}
          isSubmitting={wizard.isSubmitting}
          onCancel={handleCancel}
          onBack={wizard.goBack}
          onNext={() => void wizard.goNext()}
          onClose={() => goToDetail({ savedPolicyNumber: values.policyNumber })}
        />
      </div>

      {isCancelPrompted && (
        <ConfirmDialog
          title={CANCEL_DIALOG.title}
          description={CANCEL_DIALOG.description}
          confirmLabel={CANCEL_DIALOG.confirmLabel}
          cancelLabel={CANCEL_DIALOG.cancelLabel}
          onConfirm={() => goToDetail()}
          onCancel={() => setIsCancelPrompted(false)}
        />
      )}
    </div>
  )
}
