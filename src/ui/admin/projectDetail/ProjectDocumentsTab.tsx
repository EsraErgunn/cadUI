import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { InfoBanner } from './InfoBanner'
import { MissingSourceNotice } from '../MissingSourceNotice'
import { formatFileSize } from './projectDetailFormat'
import type { Sourced } from '../../../api/mockGate'
import type { ProjectDocumentRow } from '../../../api/projectDetail'
import { DataTable, type DataTableColumn } from '../DataTable'
import { DateTimeCell } from '../DateTimeCell'
import { EmptyValue } from '../EmptyValue'
import { documentCreatePath } from '../adminNavItems'
import { adminButtonVariants } from '../adminVariants'

const EMPTY_MESSAGE = 'Projeye ait döküman bulunamamıştır.'

const TABLE_CAPTION = 'Projeye yüklenmiş evraklar.'

const COLUMNS: DataTableColumn<ProjectDocumentRow>[] = [
  { key: 'fileName', label: 'Dosya Adı', cell: (row) => row.fileName },
  {
    key: 'docType',
    label: 'Evrak Tipi',
    cell: (row) => (row.docType === null ? <EmptyValue /> : row.docType),
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

export function ProjectDocumentsTab({
  projectId,
  documents,
}: {
  projectId: number
  documents: Sourced<ProjectDocumentRow[]> | undefined
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          to={documentCreatePath(projectId)}
          className={adminButtonVariants({ tone: 'primary' })}
        >
          <Plus aria-hidden className="size-4" />
          Evrak Ekle
        </Link>
      </div>

      {documents === undefined || documents.source === 'unavailable' ? (
        <MissingSourceNotice endpointHint="GET /api/projects/{id}/docs" />
      ) : documents.data.length === 0 ? (
        <InfoBanner message={EMPTY_MESSAGE} />
      ) : (
        <DataTable
          rows={documents.data}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          caption={TABLE_CAPTION}
          emptyMessage={EMPTY_MESSAGE}
        />
      )}
    </div>
  )
}
