import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { queryDocumentList } from './documentListQuery'
import { addMockDocuments, getMockDocuments } from './documentsMock'
import type { PagedResult, SortDirection } from './listQuery'
import { mockedData, type Sourced } from './mockGate'
import type { ProjectSummary } from './projectDetailTypes'

/**
 * Evrak ekranlarının veri şekilleri.
 *
 * SUNUCUDA HİÇBİR UCU YOK: ne liste, ne yükleme, ne evrak tipi. Uçları yazmak
 * backend'in işi; bu modül ekranların bağlandığı yüzeyi tanımlar, gövdeyi
 * `documentsMock.ts` besler. Uçlar açılınca çağıranlar değişmez, yalnız bu
 * dosyanın gövdesi gerçek isteğe döner.
 *
 * Beklenen sözleşme taslağı: docs/api-eksikleri-evraklar.md
 */

export const DOCUMENT_PAGE_SIZE = 30

export const DOCUMENT_SORT_KEYS = ['receivedAt', 'fileName'] as const
export type DocumentSortKey = (typeof DOCUMENT_SORT_KEYS)[number]

/** En yeni evrak üstte: listenin en sık beklenen açılış sırası. */
export const DEFAULT_DOCUMENT_SORT_KEY: DocumentSortKey = 'receivedAt'
export const DEFAULT_DOCUMENT_SORT_DIR: SortDirection = 'desc'

export interface DocumentRow {
  id: number
  fileName: string
  /** Tip KODU; etiketi `resolveDocumentTypeLabel` çözer. */
  docTypeCode: string
  /** Evrağın sisteme geliş tarihi (ISO); tarih filtresi buna bakar. */
  receivedAt: string
  /** Bir evrak birden çok birimle ilişkilendirilebilir (gereksinim 11). */
  unitNames: string[]
  projectId: number
  projectName: string
  /** Serbest biçimli proje numarası; sayı olarak yorumlanmaz. */
  projectPId: string
  /** "Proje Firması" filtresi kimliğe göre süzüyor; ad tek başına yetmez. */
  projectFirmId: number | null
  installationNo: string | null
  firmName: string | null
  gasFirmName: string | null
  /** Proje detayındaki evrak tablosu boyutu da gösteriyor; genel listede sütunu yok. */
  sizeBytes: number | null
  uploadedByName: string | null
  /**
   * MIME tipi. Dosyanın yeni sekmede mi açılacağı yoksa indirileceği mi
   * kararını YALNIZ bu belirler — uzantıya bakan bir ayrım, uzantısı yanlış
   * yazılmış dosyada sessizce yanlış davranırdı. Uzantıdan türetme yalnız
   * mock katmanında.
   */
  contentType: string
  /** Bellekteki dosyanın nesne adresi; tohumlanmış satırlarda dosya YOK. */
  url: string | null
}

export interface DocumentListQuery {
  dateFrom: string | null
  dateTo: string | null
  docTypeCode: string | null
  projectFirmId: number | null
  /** Arama YALNIZ evrak adı üzerinde (gereksinim 3). */
  search: string
  page: number
  pageSize: number
  sortBy: DocumentSortKey
  sortDir: SortDirection
}

/**
 * Evrak Ekle ekranındaki satırın kaynağı. İki sekme iki kaynak demek
 * (gereksinim 7): bilgisayardan yeni dosya, ya da aynı projeye daha önce
 * yüklenmiş bir evrağın yeniden ilişkilendirilmesi. Ayrım TİPTE duruyor çünkü
 * ikisi uca farklı gövdeyle gidecek — birinde dosya, öbüründe yalnız kimlik.
 */
export type DocumentUploadSource =
  | { kind: 'file'; file: File }
  | { kind: 'existing'; documentId: number }

/** Evrak Ekle ekranının tek satırı: kaynak + tipi + işaretlenen birimler. */
export interface DocumentUpload {
  source: DocumentUploadSource
  docTypeCode: string
  unitNames: string[]
}

/**
 * Evraklar listesi. Sayfalama, filtre ve sıralama sunucu tarafı sözleşmesine
 * göre çalışır: sorgu parametre olarak gider, yanıt yalnız o sayfayı ve
 * filtrelenmiş toplamı taşır. Bugün bu işi mock yapıyor.
 *
 * `Sourced` zarfı ŞART (K51): sahte veri yalnız geliştirme derlemesinde
 * üretilir. Üretimde uydurulmuş bir evrak listesi gösterilseydi bir demoda
 * gerçek sanılırdı — orada ekran veri yerine "kaynağı yok" der.
 */
export async function listDocuments(
  query: DocumentListQuery,
  signal?: AbortSignal,
): Promise<Sourced<PagedResult<DocumentRow>>> {
  await delay(MOCK_LATENCY_MS, signal)
  return mockedData(() => queryDocumentList(getMockDocuments(), query))
}

/**
 * Tek projenin evrakları — Evrak Ekle ekranındaki "Proje Evrakları" sekmesinin
 * kaynağı. Liste ucundan ayrı bir fonksiyon çünkü sözleşmesi de ayrı olacak
 * (`GET /api/projects/{id}/docs`), sayfalama istemiyor.
 */
export async function listProjectDocuments(
  projectId: number,
  signal?: AbortSignal,
): Promise<Sourced<DocumentRow[]>> {
  await delay(MOCK_LATENCY_MS, signal)
  return mockedData(() =>
    getMockDocuments().filter((document) => document.projectId === projectId),
  )
}

export type DocumentSaveResult =
  | { ok: true; savedCount: number }
  | { ok: false; reason: 'unavailable' }

/**
 * "Kaydet". Yüklenen evrak GERÇEKTEN listeye girer (gereksinim 12: hem projenin
 * evraklarına hem genel Evraklar ekranına yansır) ama depo bellekte: sayfa
 * yenilenince tohum listesine dönülür. Çağıran bunu kullanıcıya SÖYLER.
 *
 * Üretim derlemesinde hiç yazılmaz (`unavailable`): gösterilmeyecek bir depoya
 * kayıt atmak, kullanıcıya yapılmamış bir işi yapılmış göstermek olurdu.
 *
 * Proje künyesini KİMLİK olarak değil nesne olarak alıyor: kimlikten künyeye
 * inen tek yol mock tohumlarıydı ve sunucudaki projeler orada yok.
 */
export async function saveProjectDocuments(
  project: ProjectSummary,
  uploads: DocumentUpload[],
  /** Oturumdaki kullanıcı; proje detayının "Yükleyen" sütununu besliyor. */
  uploadedByName: string | null,
  signal?: AbortSignal,
): Promise<DocumentSaveResult> {
  await delay(MOCK_LATENCY_MS, signal)

  const saved = mockedData(() => addMockDocuments(project, uploads, uploadedByName))
  if (saved.source === 'unavailable') return { ok: false, reason: 'unavailable' }

  return { ok: true, savedCount: saved.data.length }
}

