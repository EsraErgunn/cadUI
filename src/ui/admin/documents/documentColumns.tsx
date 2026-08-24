import { Link } from 'react-router-dom'

import { resolveDocumentTypeLabel, type DocumentType } from '../../../api/documentTypes'
import type { DocumentRow, DocumentSortKey } from '../../../api/documents'
import type { DataTableColumn } from '../DataTable'
import { DateTimeCell } from '../DateTimeCell'
import { EmptyValue } from '../EmptyValue'
import { projectDetailPath } from '../adminNavItems'
import { ADMIN_CELL_LINK, adminButtonVariants } from '../adminVariants'
import { DocumentNameLink } from './DocumentNameLink'

export const DOCUMENT_TABLE_CAPTION =
  'Evrak listesi. Evrak adı ve geliş tarihi başlıkları sıralamayı değiştirir.'

/** On sütun dar ekrana sığmaz; bu eşiğin altında tablo yatay kaydırılır
    (gereksinim 4). */
export const DOCUMENT_TABLE_MIN_WIDTH_CLASS = 'min-w-320'

/** Sıra numarası ve eylem sütunu içeriği kadar dursun (proje listesiyle aynı
    gerekçe). */
const NARROW_COLUMN_CLASS = 'w-px whitespace-nowrap'

interface DocumentColumnsOptions {
  /** Sayfa başlangıcı; "No" sütunu sayfa 2'de 31'den devam etsin diye. */
  rowOffset: number
  documentTypes: DocumentType[]
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

/** Firma sütunlarının yeri: "Tesisat No"dan hemen sonra. */
const FIRM_COLUMN_INDEX = 8

/**
 * "Firma Adı" ve "G.D Firması" DÜZ METİN: ikisinin de gidebileceği bir salt
 * okunur ekran repoda yok. Proje firmaları listesi kimlik filtresi okumuyor
 * (yalnız `q`), G.D. firmasının tek ekranı ise güncelleme FORMU — bir liste
 * hücresinden düzenleme formuna atmak yanlış hedef olurdu.
 * Eksik ekranlar: docs/api-eksikleri-evraklar.md
 */
export function buildDocumentColumns({
  rowOffset,
  documentTypes,
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
          fileName={document.fileName}
          contentType={document.contentType}
          url={document.url}
        />
      ),
    },
    {
      key: 'docType',
      label: 'Evrak Tipi',
      cell: (document) => resolveDocumentTypeLabel(document.docTypeCode, documentTypes),
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
      cell: (document) => (
        <Link to={projectDetailPath(document.projectId)} className={ADMIN_CELL_LINK}>
          {document.projectName}
        </Link>
      ),
    },
    {
      key: 'projectPId',
      label: 'ProjeId',
      cellClassName: 'font-mono tabular-nums',
      cell: (document) => document.projectPId,
    },
    {
      key: 'installationNo',
      label: 'Tesisat No',
      cellClassName: 'font-mono tabular-nums text-ink-muted',
      cell: (document) =>
        document.installationNo === null ? <EmptyValue /> : document.installationNo,
    },
  ]

  // Firma sütunları YÖNETİM görünümüne özel. Proje firması kullanıcısının
  // listesindeki her evrak zaten kendi firmasının: "Firma Adı" her satırda aynı
  // değeri tekrar eder, "G.D Firması" ise onun yönetmediği bir firmayı anlatır.
  // Gelen VERİ değişmiyor (`DocumentRow` aynı), yalnız iki sütun çizilmiyor.
  if (isManagementView) {
    columns.splice(FIRM_COLUMN_INDEX, 0, {
      key: 'firmName',
      label: 'Firma Adı',
      cell: (document) => (document.firmName === null ? <EmptyValue /> : document.firmName),
    }, {
      key: 'gasFirmName',
      label: 'G.D Firması',
      cell: (document) =>
        document.gasFirmName === null ? <EmptyValue /> : document.gasFirmName,
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
