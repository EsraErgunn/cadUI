import type { DocumentRow } from '../../../api/documents'
import { DataTable, type DataTableColumn } from '../DataTable'
import { DateTimeCell } from '../DateTimeCell'
import { EmptyValue } from '../EmptyValue'
import { adminButtonVariants } from '../adminVariants'
import type { ProjectDocumentActions } from '../projectDetail/ProjectDocumentsTab'

const EMPTY_MESSAGE = 'Bu projeye daha önce evrak yüklenmemiş.'
const TABLE_CAPTION =
  'Projeye daha önce yüklenmiş evraklar; birimini değiştirebilir veya silebilirsiniz.'

/** Eylem sütunu içeriği kadar dursun (liste ekranlarıyla aynı gerekçe). */
const NARROW_COLUMN_CLASS = 'w-px whitespace-nowrap'

interface ProjectDocumentPickerProps {
  documents: DocumentRow[]
  actions: ProjectDocumentActions
}

/**
 * "Proje Evrakları" sekmesi: projeye daha önce yüklenmiş evraklar.
 *
 * Sekme bir süre SEÇİCİYDİ — var olan evrağı yükleme listesine ekleyip başka
 * birimlerle yeniden ilişkilendirmek için. O akış kalktı: burada yalnız
 * DÜZENLEME var, kaydın birimi değiştirilir ya da kayıt silinir. Yükleme aynı
 * ekranın "Bilgisayardan Seç" sekmesinde.
 *
 * Eylemler proje detayının evrak sekmesiyle AYNI hook'tan geliyor
 * (`useProjectDocumentActions`): iki ekran aynı işi yapıyor ve ikinci bir
 * kopya, birim değiştirmenin sırasını bir yerde yanlış kurardı.
 */
export function ProjectDocumentPicker({ documents, actions }: ProjectDocumentPickerProps) {
  const columns: DataTableColumn<DocumentRow>[] = [
    { key: 'fileName', label: 'Evrak Adı', cell: (document) => document.fileName },
    {
      key: 'docType',
      label: 'Evrak Tipi',
      cell: (document) => document.docTypeName ?? <EmptyValue />,
    },
    {
      key: 'units',
      label: 'Birim',
      cell: (document) =>
        document.unitNames.length === 0 ? <EmptyValue /> : document.unitNames.join(', '),
    },
    {
      key: 'receivedAt',
      label: 'Geliş Tarihi',
      cell: (document) => <DateTimeCell value={document.receivedAt} />,
    },
    {
      key: 'actions',
      label: 'İşlem',
      cellClassName: `${NARROW_COLUMN_CLASS} text-right`,
      headerClassName: `${NARROW_COLUMN_CLASS} text-right`,
      cell: (document) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => actions.requestUnitChange(document)}
            disabled={actions.pendingDocumentId === document.id}
            className={adminButtonVariants({ tone: 'secondary', size: 'sm' })}
          >
            Birim Değiştir
          </button>
          <button
            type="button"
            onClick={() => actions.requestDelete(document.id)}
            disabled={actions.pendingDocumentId === document.id}
            aria-busy={actions.pendingDocumentId === document.id}
            className={adminButtonVariants({ tone: 'danger', size: 'sm' })}
          >
            Sil
          </button>
        </div>
      ),
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
