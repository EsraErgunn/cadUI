import { useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { PROJECT_LIST_PATH } from './useCloseEditor'
import { getDocumentTypes, type DocumentType } from '../api/documentTypes'
import { listProjectDocuments, saveProjectDocuments } from '../api/documents'
import { ApiError } from '../api/http'
import { getProjectSummary, getProjectUnits } from '../api/projectDetail'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { ProjectContextNotice } from '../ui/admin/ProjectContextNotice'
import {
  PROJECT_PARAM,
  parseProjectParam,
  projectDetailPath,
} from '../ui/admin/adminNavItems'
import { ADMIN_FORM_ACTION_WIDTH, adminButtonVariants } from '../ui/admin/adminVariants'
import { DocumentDropzone } from '../ui/admin/documents/DocumentDropzone'
import { DocumentSourceTabs } from '../ui/admin/documents/DocumentSourceTabs'
import { ProjectDocumentPicker } from '../ui/admin/documents/ProjectDocumentPicker'
import { UploadedDocumentRow } from '../ui/admin/documents/UploadedDocumentRow'
import type { DocumentSource } from '../ui/admin/documents/documentSources'
import { useDocumentUpload } from '../ui/admin/documents/useDocumentUpload'
import { useHomePath } from '../ui/admin/useHomePath'

/** Kod grubu nadiren değişiyor; ekranlar arası gezinmede yeniden istenmesin. */
const DOCUMENT_TYPE_STALE_MS = 5 * 60 * 1000

/** Sabit boş dizi: her render'da yeni dizi üretmek alt bileşenleri boşuna
    yeniden çizerdi. */
const EMPTY_DOCUMENT_TYPES: DocumentType[] = []

const PAGE_TITLE = 'Evrak Ekle'
const PANEL_ID = 'document-source-panel'

const UPLOADED_TITLE = 'Yüklenen Evraklar'
const NO_FILE_HINT = 'Kaydetmek için önce en az bir dosya ekleyin.'
const UNITS_MISSING_HINT =
  'Projenin birimleri okunamadı; birim seçimi olmadan evrak kaydedilemez.'

/** Ağa HİÇ çıkılamadığında gösterilen metin; sunucunun kendi mesajı varsa o kazanır. */
const SAVE_ERROR_MESSAGE = 'Evrak kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.'

/** İlk madde ROLE göre çözülüyor (`useHomePath`); ekran üç rolde de açık. */
const BREADCRUMB_TAIL = [{ label: 'Projeler', to: PROJECT_LIST_PATH }, { label: PAGE_TITLE }]

export function NewDocumentPage() {
  const homePath = useHomePath()
  const [searchParams] = useSearchParams()
  const projectId = parseProjectParam(searchParams.get(PROJECT_PARAM))
  const navigate = useNavigate()

  const [source, setSource] = useState<DocumentSource>('computer')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const upload = useDocumentUpload()

  // Künye GERÇEK uçtan: mock tohumlarından okunduğu sürece sunucudaki projeler
  // ya bulunamıyor ya başka bir projenin adıyla açılıyordu.
  const {
    data: project,
    isPending: isProjectPending,
    isError: hasProjectFailed,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ['projectSummary', projectId],
    queryFn: ({ signal }) => getProjectSummary(projectId ?? 0, signal),
    enabled: projectId !== undefined,
  })

  const hasProject = project !== undefined && project !== null

  // Birimler proje detayıyla AYNI kaynaktan (karar 8): ikinci bir uç istenmedi.
  const { data: units } = useQuery({
    queryKey: ['projectUnits', projectId],
    queryFn: () => getProjectUnits(projectId ?? 0),
    enabled: hasProject,
  })

  const { data: projectDocuments } = useQuery({
    queryKey: ['projectDocumentPicker', projectId],
    queryFn: ({ signal }) => listProjectDocuments(projectId ?? 0, signal),
    enabled: hasProject,
  })

  // Üretim derlemesinde sahte evrak üretilmiyor (K51); sekme boş liste gösterir.
  const pickerRows =
    projectDocuments === undefined || projectDocuments.source === 'unavailable'
      ? []
      : projectDocuments.data

  const { data: documentTypes = EMPTY_DOCUMENT_TYPES } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: ({ signal }) => getDocumentTypes(signal),
    staleTime: DOCUMENT_TYPE_STALE_MS,
  })

  // Evrak birime KİMLİKLE bağlanıyor; etiket yalnız kutuda görünüyor. Birim
  // numarası boş olabildiği için (çizimden senkron) abone adı yedek.
  const unitOptions = useMemo(() => {
    if (units === undefined || units.source === 'unavailable') return []

    return units.data.map((unit) => ({
      id: unit.id,
      label:
        [unit.unitNumber, unit.subscriberName].filter((part) => part !== null).join(' — ') ||
        `#${unit.id}`,
    }))
  }, [units])

  // Evrak hangi projeye bağlanacağını bilmeden çalışamaz (gereksinim 6): kimlik
  // yoksa, sunucuda yoksa ya da okunamadıysa ekran sebebini yazar.
  const goToProjectList = () => void navigate(PROJECT_LIST_PATH)

  if (projectId === undefined || project === null) {
    return <ProjectContextNotice state="missing" screenName={PAGE_TITLE} onRetry={goToProjectList} />
  }
  if (isProjectPending) {
    return <ProjectContextNotice state="loading" screenName={PAGE_TITLE} onRetry={goToProjectList} />
  }
  if (hasProjectFailed || project === undefined) {
    return (
      <ProjectContextNotice
        state="failed"
        screenName={PAGE_TITLE}
        onRetry={() => void refetchProject()}
      />
    )
  }

  const handleSave = async () => {
    const uploads = upload.collectValidUploads()
    if (uploads === null) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const result = await saveProjectDocuments(project.id, uploads)

      void navigate(projectDetailPath(project.id), {
        state: { savedDocumentCount: result.savedCount },
      })
    } catch (error) {
      // Sunucunun kendi mesajı KORUNUR (dosya boyutu, tip kısıtı gibi hatalar
      // ancak orada biliniyor); ağ hatasında genel metne düşülüyor.
      setSaveError(error instanceof ApiError ? error.message : SAVE_ERROR_MESSAGE)
    } finally {
      setIsSaving(false)
    }
  }

  const hasRows = upload.rows.length > 0

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: 'Anasayfa', to: homePath }, ...BREADCRUMB_TAIL]}
        title={PAGE_TITLE}
      />

      <p className="text-sm text-ink-muted">
        Yüklenen evraklar{' '}
        <Link to={projectDetailPath(project.id)} className="font-medium text-selection underline">
          {project.name}
        </Link>{' '}
        projesiyle ilişkilendirilecek.
      </p>

      {upload.rejected.length > 0 && (
        <NoticeBar
          tone="error"
          message="Bazı dosyalar listeye eklenmedi."
          details={upload.rejected.map((item) => `${item.fileName}: ${item.message}`)}
          onDismiss={upload.dismissRejections}
        />
      )}

      {saveError !== null && (
        <NoticeBar tone="error" message={saveError} onDismiss={() => setSaveError(null)} />
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-5">
        <DocumentSourceTabs value={source} panelId={PANEL_ID} onChange={setSource} />

        <div id={PANEL_ID} role="tabpanel" aria-label="Evrak kaynağı içeriği">
          {source === 'computer' ? (
            <DocumentDropzone onFilesSelected={upload.addFiles} />
          ) : (
            <ProjectDocumentPicker
              documents={pickerRows}
              isAdded={upload.hasExistingDocument}
              onAdd={upload.addExistingDocument}
            />
          )}
        </div>

        <section aria-label={UPLOADED_TITLE} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-ink">{UPLOADED_TITLE}</h2>

          {hasRows ? (
            <ul className="flex list-none flex-col gap-3">
              {upload.rows.map((row) => (
                <UploadedDocumentRow
                  key={row.key}
                  row={row}
                  documentTypes={documentTypes}
                  units={unitOptions}
                  errors={upload.errors.get(row.key)}
                  onTypeChange={(docTypeCodeId) => upload.setRowType(row.key, docTypeCodeId)}
                  onUnitsChange={(unitIds) => upload.setRowUnits(row.key, unitIds)}
                  onRemove={() => upload.removeRow(row.key)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{NO_FILE_HINT}</p>
          )}

          {hasRows && unitOptions.length === 0 && (
            <p role="alert" className="text-sm text-danger-ink">
              {UNITS_MISSING_HINT}
            </p>
          )}
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            to={projectDetailPath(project.id)}
            className={adminButtonVariants({ tone: 'secondary', className: ADMIN_FORM_ACTION_WIDTH })}
          >
            İptal
          </Link>
          <button
            type="button"
            disabled={!hasRows || isSaving}
            onClick={() => void handleSave()}
            className={adminButtonVariants({ tone: 'primary', className: ADMIN_FORM_ACTION_WIDTH })}
          >
            <Save aria-hidden className="size-4" />
            {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
