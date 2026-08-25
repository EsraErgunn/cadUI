import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { InfoBanner } from './InfoBanner'
import { ProjectDocumentActionDialogs } from './ProjectDocumentActionDialogs'
import type { ProjectDocumentUnitOption } from './ProjectDocumentUnitDialog'
import { formatFileSize } from './projectDetailFormat'
import type { EditableDocument } from './useProjectDocumentActions'
import type { Sourced } from '../../../api/mockGate'
import type { ProjectDocumentRow } from '../../../api/projectDetail'
import { DataTable, type DataTableColumn } from '../DataTable'
import { DateTimeCell } from '../DateTimeCell'
import { EmptyValue } from '../EmptyValue'
import { MissingSourceNotice } from '../MissingSourceNotice'
import { NoticeBar } from '../NoticeBar'
import { documentCreatePath } from '../adminNavItems'
import { adminButtonVariants } from '../adminVariants'
import { useCanWriteProjectContent } from '../useRole'

const EMPTY_MESSAGE = 'Projeye ait döküman bulunamamıştır.'

const TABLE_CAPTION = 'Projeye yüklenmiş evraklar.'

/** Eylem sütunu içeriği kadar dursun (liste ekranlarıyla aynı gerekçe). */
const NARROW_COLUMN_CLASS = 'w-px whitespace-nowrap'

interface ProjectDocumentsTabProps {
  /** "Evrak Ekle" bağlantısı yüklemeyi GELİNEN projeyle ilişkilendiriyor. */
  projectId: number
  documents: Sourced<ProjectDocumentRow[]> | undefined
  /** Projenin birimleri; bağ değiştirme kutusunun kaynağı. */
  units: ProjectDocumentUnitOption[]
  actions: ProjectDocumentActions
}

/**
 * Sekmenin yaptığı işler. Sayfa tarafından besleniyor (`ProjectDetailPage`):
 * istekler ve önbellek geçersizleştirmesi orada, bileşen yalnız çiziyor.
 */
export interface ProjectDocumentActions {
  pendingDocumentId: number | null
  notice: { tone: 'success' | 'error'; message: string } | null
  dismissNotice: () => void

  deleteTargetId: number | null
  requestDelete: (documentId: number) => void
  cancelDelete: () => void
  confirmDelete: () => void

  unitTarget: EditableDocument | null
  unitError: string | null
  dismissUnitError: () => void
  requestUnitChange: (document: EditableDocument) => void
  cancelUnitChange: () => void
  confirmUnitChange: (unitId: number) => void
}

function buildColumns(
  actions: ProjectDocumentActions,
  canWriteContent: boolean,
): DataTableColumn<ProjectDocumentRow>[] {
  const columns: DataTableColumn<ProjectDocumentRow>[] = [
    { key: 'fileName', label: 'Dosya Adı', cell: (row) => row.fileName },
    {
      key: 'docType',
      label: 'Evrak Tipi',
      cell: (row) => (row.docType === null ? <EmptyValue /> : row.docType),
    },
    {
      key: 'units',
      label: 'Birim',
      cell: (row) => (row.unitNames.length === 0 ? <EmptyValue /> : row.unitNames.join(', ')),
    },
    {
      key: 'size',
      label: 'Boyut',
      cellClassName: 'text-right tabular-nums',
      cell: (row) => formatFileSize(row.sizeBytes) ?? <EmptyValue />,
    },
    {
      key: 'uploadedBy',
      label: 'Yükleyen',
      cell: (row) => (row.uploadedByName === null ? <EmptyValue /> : row.uploadedByName),
    },
    { key: 'receivedAt', label: 'Tarih', cell: (row) => <DateTimeCell value={row.receivedAt} /> },
  ]

  // Yazma yetkisi yoksa sütun HİÇ üretilmez — boş bir "Aksiyonlar" başlığı
  // eylem varmış gibi görünürdü (poliçe tablosuyla aynı gerekçe).
  if (!canWriteContent) return columns

  return [
    ...columns,
    {
      key: 'actions',
      label: 'Aksiyonlar',
      cellClassName: `${NARROW_COLUMN_CLASS} text-right`,
      headerClassName: `${NARROW_COLUMN_CLASS} text-right`,
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => actions.requestUnitChange(row)}
            disabled={actions.pendingDocumentId === row.id}
            className={adminButtonVariants({ tone: 'secondary', size: 'sm' })}
          >
            Birim Değiştir
          </button>
          <button
            type="button"
            onClick={() => actions.requestDelete(row.id)}
            disabled={actions.pendingDocumentId === row.id}
            aria-busy={actions.pendingDocumentId === row.id}
            className={adminButtonVariants({ tone: 'danger', size: 'sm' })}
          >
            Sil
          </button>
        </div>
      ),
    },
  ]
}

/**
 * Proje evrakları: listeleme + yükleme + düzenleme.
 *
 * Yükleme kendi ekranına GÖTÜRÜR (`/admin/documents/new?project=`) — evrak tipi
 * ve birim seçimi orada birlikte alınıyor, sekmenin içinde ikinci bir yükleme
 * yüzeyi kurulmuyor. Sekmenin kendi işleri var olan kaydın birimini değiştirmek
 * ve kaydı silmek.
 *
 * Üçü de aynı kapıdan geçiyor (`useCanWriteProjectContent`): sunucu
 * `POST/DELETE /api/docs` uçlarını `Admin, ProjectFirmUser`'a açıyor, yani
 * yönetici hepsini görür, gaz dağıtım kullanıcısı yalnız listeler.
 */
export function ProjectDocumentsTab({
  projectId,
  documents,
  units,
  actions,
}: ProjectDocumentsTabProps) {
  const canWriteContent = useCanWriteProjectContent()
  // Her render'da yeniden kuruluyor: sütunlar `actions`'ın kapanışlarını
  // taşıyor ve `pendingDocumentId` değişince düğmelerin kilidi güncellenmeli.
  const columns = buildColumns(actions, canWriteContent)

  return (
    <div className="flex flex-col gap-4">
      {canWriteContent && (
        <div>
          <Link
            to={documentCreatePath(projectId)}
            className={adminButtonVariants({ tone: 'primary' })}
          >
            <Plus aria-hidden className="size-4" />
            Evrak Ekle
          </Link>
        </div>
      )}

      {actions.notice !== null && (
        <NoticeBar
          tone={actions.notice.tone}
          message={actions.notice.message}
          onDismiss={actions.dismissNotice}
        />
      )}

      {documents === undefined || documents.source === 'unavailable' ? (
        <MissingSourceNotice endpointHint="GET /api/docs?ProjectId=" />
      ) : documents.data.length === 0 ? (
        <InfoBanner message={EMPTY_MESSAGE} />
      ) : (
        <DataTable
          rows={documents.data}
          columns={columns}
          rowKey={(row) => row.id}
          caption={TABLE_CAPTION}
          emptyMessage={EMPTY_MESSAGE}
        />
      )}

      <ProjectDocumentActionDialogs units={units} actions={actions} />
    </div>
  )
}
