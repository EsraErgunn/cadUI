import { useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { PROJECT_LIST_PATH } from './useCloseEditor'
import { getDocumentTypes } from '../api/documentTypes'
import { findDocumentProject, listProjectDocuments, saveProjectDocuments } from '../api/documents'
import { getProjectUnits } from '../api/projectDetail'
import { useAuthSession } from '../api/useAuthSession'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { QueryError } from '../ui/admin/QueryStates'
import {
  ADMIN_HOME_PATH,
  DOCUMENT_PROJECT_PARAM,
  projectDetailPath,
} from '../ui/admin/adminNavItems'
import { adminButtonVariants } from '../ui/admin/adminVariants'
import { DocumentDropzone } from '../ui/admin/documents/DocumentDropzone'
import { DocumentSourceTabs } from '../ui/admin/documents/DocumentSourceTabs'
import { ProjectDocumentPicker } from '../ui/admin/documents/ProjectDocumentPicker'
import { UploadedDocumentRow } from '../ui/admin/documents/UploadedDocumentRow'
import type { DocumentSource } from '../ui/admin/documents/documentSources'
import { useDocumentUpload } from '../ui/admin/documents/useDocumentUpload'

const PAGE_TITLE = 'Evrak Ekle'
const PAGE_DESCRIPTION = 'Dosyayı yükleyin, evrak tipini seçin ve ilgili birimleri işaretleyin'
const PANEL_ID = 'document-source-panel'

const UPLOADED_TITLE = 'Yüklenen Evraklar'
const NO_FILE_HINT = 'Kaydetmek için önce en az bir dosya ekleyin.'
const UNITS_MISSING_HINT =
  'Projenin birimleri okunamadı; birim seçimi olmadan evrak kaydedilemez.'

/** Uç yokken kayıt yalnız geliştirme derlemesinde tutulabiliyor (K51). */
const SAVE_ERROR_MESSAGES = {
  unknownProject: 'Evrak kaydedilemedi: proje bulunamadı.',
  unavailable:
    'Evrak yükleme ucu sunucuda henüz yok; kayıt yapılamadı (POST /api/projects/{id}/docs).',
} as const

const BREADCRUMB = [
  { label: 'Anasayfa', to: ADMIN_HOME_PATH },
  { label: 'Projeler', to: PROJECT_LIST_PATH },
  { label: PAGE_TITLE },
]

function parseProjectId(raw: string | null): number | undefined {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export function NewDocumentPage() {
  const [searchParams] = useSearchParams()
  const projectId = parseProjectId(searchParams.get(DOCUMENT_PROJECT_PARAM))
  const navigate = useNavigate()
  const session = useAuthSession()

  const [source, setSource] = useState<DocumentSource>('computer')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const upload = useDocumentUpload()

  const project = useMemo(
    () => (projectId === undefined ? null : findDocumentProject(projectId)),
    [projectId],
  )

  // Birimler proje detayıyla AYNI kaynaktan (karar 8): ikinci bir uç istenmedi.
  const { data: units } = useQuery({
    queryKey: ['projectUnits', projectId],
    queryFn: () => getProjectUnits(projectId ?? 0),
    enabled: project !== null,
  })

  const { data: projectDocuments } = useQuery({
    queryKey: ['projectDocumentPicker', projectId],
    queryFn: ({ signal }) => listProjectDocuments(projectId ?? 0, signal),
    enabled: project !== null,
  })

  // Üretim derlemesinde sahte evrak üretilmiyor (K51); sekme boş liste gösterir.
  const pickerRows =
    projectDocuments === undefined || projectDocuments.source === 'unavailable'
      ? []
      : projectDocuments.data

  const documentTypes = useMemo(() => getDocumentTypes(), [])

  const unitNames = useMemo(() => {
    if (units === undefined || units.source === 'unavailable') return []
    return units.data
      .map((unit) => unit.unitNumber)
      .filter((unitNumber): unitNumber is string => unitNumber !== null)
  }, [units])

  // Kimliksiz gelinirse ekran boş kalmasın: evrak hangi projeye bağlanacağını
  // bilmeden çalışamaz (gereksinim 6), kullanıcı listeye yönlendirilir.
  if (project === null) {
    return (
      <div className="mx-auto flex max-w-320 flex-col gap-4">
        <QueryError
          message="Evrak Ekle ekranı bir projeye bağlı açılır; adreste geçerli bir proje yok."
          onRetry={() => void navigate(PROJECT_LIST_PATH)}
        />
        <Link to={PROJECT_LIST_PATH} className={adminButtonVariants({ tone: 'secondary' })}>
          Projelere dön
        </Link>
      </div>
    )
  }

  const handleSave = async () => {
    const uploads = upload.collectValidUploads()
    if (uploads === null) return

    setIsSaving(true)
    setSaveError(null)

    const result = await saveProjectDocuments(project.id, uploads, session?.fullName ?? null)
    setIsSaving(false)

    if (!result.ok) {
      setSaveError(SAVE_ERROR_MESSAGES[result.reason])
      return
    }

    void navigate(projectDetailPath(project.id), {
      state: { savedDocumentCount: result.savedCount },
    })
  }

  const hasRows = upload.rows.length > 0

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5">
      <PageHeader
        breadcrumb={BREADCRUMB}
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
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
              documentTypes={documentTypes}
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
                  units={unitNames}
                  errors={upload.errors.get(row.key)}
                  onTypeChange={(docTypeCode) => upload.setRowType(row.key, docTypeCode)}
                  onUnitsChange={(names) => upload.setRowUnits(row.key, names)}
                  onRemove={() => upload.removeRow(row.key)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{NO_FILE_HINT}</p>
          )}

          {hasRows && unitNames.length === 0 && (
            <p role="alert" className="text-sm text-danger-ink">
              {UNITS_MISSING_HINT}
            </p>
          )}
        </section>

        <div className="flex justify-end gap-3">
          <Link
            to={projectDetailPath(project.id)}
            className={adminButtonVariants({ tone: 'secondary' })}
          >
            İptal
          </Link>
          <button
            type="button"
            disabled={!hasRows || isSaving}
            onClick={() => void handleSave()}
            className={adminButtonVariants({ tone: 'primary' })}
          >
            <Save aria-hidden className="size-4" />
            {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
