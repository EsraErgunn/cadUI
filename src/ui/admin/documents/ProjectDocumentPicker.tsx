import { Plus } from 'lucide-react'

import { resolveDocumentTypeLabel, type DocumentType } from '../../../api/documentTypes'
import type { DocumentRow } from '../../../api/documents'
import { DataTable, type DataTableColumn } from '../DataTable'
import { DateTimeCell } from '../DateTimeCell'
import { adminButtonVariants } from '../adminVariants'

const EMPTY_MESSAGE = 'Bu projeye daha önce evrak yüklenmemiş.'
const TABLE_CAPTION = 'Projeye daha önce yüklenmiş evraklar; listeye ekleyip yeniden ilişkilendirebilirsiniz.'
const ADDED_LABEL = 'Eklendi'

interface ProjectDocumentPickerProps {
  documents: DocumentRow[]
  documentTypes: DocumentType[]
  isAdded: (documentId: number) => boolean
  onAdd: (document: DocumentRow) => void
}

/**
 * "Proje Evrakları" sekmesi: aynı projeye daha önce yüklenmiş evrağı listeye
 * ekleyip başka birimlerle yeniden ilişkilendirmek için (gereksinim 7). Dosya
 * yeniden yüklenmiyor, yalnız kaydın kimliği taşınıyor.
 */
export function ProjectDocumentPicker({
  documents,
  documentTypes,
  isAdded,
  onAdd,
}: ProjectDocumentPickerProps) {
  const columns: DataTableColumn<DocumentRow>[] = [
    { key: 'fileName', label: 'Evrak Adı', cell: (document) => document.fileName },
    {
      key: 'docType',
      label: 'Evrak Tipi',
      cell: (document) => resolveDocumentTypeLabel(document.docTypeCode, documentTypes),
    },
    {
      key: 'receivedAt',
      label: 'Geliş Tarihi',
      cell: (document) => <DateTimeCell value={document.receivedAt} />,
    },
    {
      key: 'add',
      label: 'İşlem',
      cellClassName: 'text-right',
      cell: (document) => {
        const added = isAdded(document.id)

        return (
          <button
            type="button"
            disabled={added}
            onClick={() => onAdd(document)}
            aria-label={`${document.fileName} dosyasını listeye ekle`}
            className={adminButtonVariants({ tone: 'secondary', size: 'sm' })}
          >
            <Plus aria-hidden className="size-3.5" />
            {added ? ADDED_LABEL : 'Ekle'}
          </button>
        )
      },
    },
  ]

  return (
    <DataTable
      rows={documents}
      columns={columns}
      rowKey={(document) => document.id}
      caption={TABLE_CAPTION}
      emptyMessage={EMPTY_MESSAGE}
    />
  )
}
