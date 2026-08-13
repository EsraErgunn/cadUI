import type { DocumentListQuery, DocumentRow } from './documents'
import type { PagedResult } from './listQuery'
import { includesTr } from './turkishText'

/**
 * Sunucunun yapması GEREKEN işi taklit eder: filtre → sırala → SADECE istenen
 * sayfayı dilimle. Saf fonksiyon, testi `__tests__/documentListQuery.test.ts`.
 *
 * Uç açıldığında bu dosya silinir ve çağıran taraf değişmez; bugün burada
 * durması, istemcinin diziyi dilimlediği anlamına gelmiyor — mock sözleşmenin
 * sunucu tarafını oynuyor (K46 deseni).
 */
export function queryDocumentList(
  documents: DocumentRow[],
  query: DocumentListQuery,
): PagedResult<DocumentRow> {
  const matched = documents.filter((document) => matchesQuery(document, query))
  const sorted = [...matched].sort((left, right) => compareDocuments(left, right, query))
  const offset = (query.page - 1) * query.pageSize

  return {
    items: sorted.slice(offset, offset + query.pageSize),
    totalCount: matched.length,
    page: query.page,
    pageSize: query.pageSize,
  }
}

/** ISO damgasının yalnız gün parçası; aralık karşılaştırması gün bazlı kapsayıcı. */
function toIsoDate(timestamp: string): string {
  return timestamp.slice(0, 10)
}

function matchesQuery(document: DocumentRow, query: DocumentListQuery): boolean {
  // Tarih aralığı evrağın SİSTEME GELİŞ tarihine göre (gereksinim 3).
  const receivedDate = toIsoDate(document.receivedAt)
  if (query.dateFrom !== null && receivedDate < query.dateFrom) return false
  if (query.dateTo !== null && receivedDate > query.dateTo) return false

  if (query.docTypeCode !== null && document.docTypeCode !== query.docTypeCode) return false
  if (query.projectFirmId !== null && document.projectFirmId !== query.projectFirmId) return false

  // Arama evrak ADI üzerinde; `includesTr` şart, 'İ'.toLowerCase() birleşen
  // nokta üretip eşleşmeyi sessizce kaçırıyor (knowledge/turkish-collation).
  if (query.search !== '' && !includesTr(document.fileName, query.search)) return false

  return true
}

function compareDocuments(
  left: DocumentRow,
  right: DocumentRow,
  query: DocumentListQuery,
): number {
  const direction = query.sortDir === 'asc' ? 1 : -1

  if (query.sortBy === 'fileName') {
    return left.fileName.localeCompare(right.fileName, 'tr') * direction
  }

  // Aynı saniyede yüklenen dosyalar (tek "Kaydet" birden çok satır yazıyor)
  // sırasız kalmasın: eşitlikte kimlik ayırıyor, yoksa sayfa 2'de aynı satır
  // ikinci kez görünebilirdi.
  const byDate = left.receivedAt.localeCompare(right.receivedAt) * direction
  return byDate === 0 ? (left.id - right.id) * direction : byDate
}
