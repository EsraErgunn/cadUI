import type { DocumentRow, DocumentSortKey } from '../../../api/documents'
import type { DataTableColumn } from '../DataTable'
import { DateTimeCell } from '../DateTimeCell'
import { EmptyValue } from '../EmptyValue'
import { adminButtonVariants } from '../adminVariants'
import { DocumentNameLink } from './DocumentNameLink'

export const DOCUMENT_TABLE_CAPTION =
  'Evrak listesi. Evrak adı ve geliş tarihi başlıkları sıralamayı değiştirir.'

/** Sütunlar dar ekrana sığmaz; bu eşiğin altında tablo yatay kaydırılır
    (gereksinim 4). */
export const DOCUMENT_TABLE_MIN_WIDTH_CLASS = 'min-w-240'

/** Sıra numarası ve eylem sütunu içeriği kadar dursun (proje listesiyle aynı
    gerekçe). */
const NARROW_COLUMN_CLASS = 'w-px whitespace-nowrap'

interface DocumentColumnsOptions {
  /** Sayfa başlangıcı; "No" sütunu sayfa 2'de 31'den devam etsin diye. */
  rowOffset: number
  /** İsteği süren satır; o satırın düğmesi kilitlenir. */
  pendingDocumentId: number | null
  /** Yönetim görünümü mü (`useIsManagementUser`); firma sütunlarını açar. */
  isManagementView: boolean
  /**
   * Evrak silinebilir mi (`useCanWriteProjectContent`). Sunucu da
   * `DELETE /api/docs/{id}` ucunu `Admin, ProjectFirmUser`'a açıyor; gaz dağıtım
   * kullanıcısı evrağı GÖRÜR, silemez. Yetkisizde sütun HİÇ üretilmez —
   * içi boş bir "Aksiyonlar" başlığı eylem varmış gibi görünürdü.
   */
  canDelete: boolean
  onDelete: (documentId: number) => void
}

/** Firma sütununun yeri: "Proje Adı"ndan hemen sonra. */
const FIRM_COLUMN_INDEX = 6

/**
 * Satırda tıklanabilir TEK hücre "Evrak Adı"; geri kalan her şey düz metin.
 *
 * "ProjeId", "Tesisat No" ve "G.D Firması" sütunları KALDIRILDI — bu adlarla
 * yeni sütun yazma.
 */
export function buildDocumentColumns({
  rowOffset,
  pendingDocumentId,
  isManagementView,
  canDelete,
  onDelete,
}: DocumentColumnsOptions): DataTableColumn<DocumentRow, DocumentSortKey>[] {
  const columns: DataTableColumn<DocumentRow, DocumentSortKey>[] = [
    {
      key: 'no',
      label: 'No',
      cellClassName: `${NARROW_COLUMN_CLASS} tabular-nums text-ink-muted`,
      headerClassName: NARROW_COLUMN_CLASS,
      cell: (_document, index) => rowOffset + index + 1,
    },
    {
      key: 'fileName',
      label: 'Evrak Adı',
      sortKey: 'fileName',
      cell: (document) => (
        <DocumentNameLink
          documentId={document.id}
          fileName={document.fileName}
          contentType={document.contentType}
        />
      ),
    },
    {
      key: 'docType',
      label: 'Evrak Tipi',
      // Tip ADI sunucudan geliyor; istemcide ikinci bir sözlük tutulmuyor.
      cell: (document) => document.docTypeName ?? <EmptyValue />,
    },
    {
      key: 'receivedAt',
      label: 'Geliş Tarihi',
      sortKey: 'receivedAt',
      cell: (document) => <DateTimeCell value={document.receivedAt} />,
    },
    {
      key: 'units',
      label: 'Birim',
      // Bir evrak birden çok birime bağlanabiliyor (gereksinim 11); hepsi tek
      // hücrede, satır çoğaltılmıyor — aynı dosya iki satırda görünseydi
      // "kaç evrak var" sorusunun cevabı değişirdi.
      cell: (document) =>
        document.unitNames.length === 0 ? <EmptyValue /> : document.unitNames.join(', '),
    },
    {
      key: 'projectName',
      label: 'Proje Adı',
      // Proje detayına BAĞLANMIYOR: satırda tıklanabilir tek hücre Evrak Adı.
      cell: (document) =>
        document.projectName === null ? <EmptyValue /> : document.projectName,
    },
  ]

  // Firma sütunu YÖNETİM görünümüne özel. Proje firması kullanıcısının
  // listesindeki her evrak zaten kendi firmasının: "Firma Adı" her satırda aynı
  // değeri tekrar ederdi. Gelen VERİ değişmiyor (`DocumentRow` aynı), yalnız
  // sütun çizilmiyor.
  if (isManagementView) {
    columns.splice(FIRM_COLUMN_INDEX, 0, {
      key: 'firmName',
      label: 'Firma Adı',
      cell: (document) => (document.firmName === null ? <EmptyValue /> : document.firmName),
    })
  }

  if (canDelete) {
    columns.push({
      key: 'actions',
      label: 'Aksiyonlar',
      cellClassName: `${NARROW_COLUMN_CLASS} text-right`,
      headerClassName: `${NARROW_COLUMN_CLASS} text-right`,
      cell: (document) => (
        <button
          type="button"
          onClick={() => onDelete(document.id)}
          disabled={pendingDocumentId === document.id}
          aria-busy={pendingDocumentId === document.id}
          className={adminButtonVariants({ tone: 'danger', size: 'sm' })}
        >
          Sil
        </button>
      ),
    })
  }

  return columns
}
