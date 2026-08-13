import { Link } from 'react-router-dom'

import { resolveDocumentTypeLabel, type DocumentType } from '../../../api/documentTypes'
import type { DocumentRow, DocumentSortKey } from '../../../api/documents'
import type { DataTableColumn } from '../DataTable'
import { DateTimeCell } from '../DateTimeCell'
import { EmptyValue } from '../EmptyValue'
import { projectDetailPath } from '../adminNavItems'
import { ADMIN_CELL_LINK } from '../adminVariants'
import { DocumentNameLink } from './DocumentNameLink'

export const DOCUMENT_TABLE_CAPTION =
  'Evrak listesi. Evrak adı ve geliş tarihi başlıkları sıralamayı değiştirir.'

/** On sütun dar ekrana sığmaz; bu eşiğin altında tablo yatay kaydırılır
    (gereksinim 4). */
export const DOCUMENT_TABLE_MIN_WIDTH_CLASS = 'min-w-320'

interface DocumentColumnsOptions {
  /** Sayfa başlangıcı; "No" sütunu sayfa 2'de 31'den devam etsin diye. */
  rowOffset: number
  documentTypes: DocumentType[]
}

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
}: DocumentColumnsOptions): DataTableColumn<DocumentRow, DocumentSortKey>[] {
  return [
    {
      key: 'no',
      label: 'No',
      cellClassName: 'tabular-nums text-ink-muted',
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
    {
      key: 'firmName',
      label: 'Firma Adı',
      cell: (document) => (document.firmName === null ? <EmptyValue /> : document.firmName),
    },
    {
      key: 'gasFirmName',
      label: 'G.D Firması',
      cell: (document) =>
        document.gasFirmName === null ? <EmptyValue /> : document.gasFirmName,
    },
  ]
}
