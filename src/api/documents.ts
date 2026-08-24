import { z } from 'zod'

import type { AdminScope } from './adminDashboard'
import { requestJson, requestVoid, uploadForm } from './http'
import { pagedResultSchema, type PagedResult, type SortDirection } from './listQuery'
import { serverData, type Sourced } from './mockGate'

/**
 * API SÖZLEŞMESİ — Evraklar. Hepsi GERÇEK uç:
 *
 * - `GET /api/docs` — sayfalı liste (süzgeç + sıralama sunucuda)
 * - `POST /api/docs` — multipart yükleme
 * - `DELETE /api/docs/{id}` — silme
 * - `PUT /api/docs/{id}/assign` — evrağı başka projeye taşıma
 * - `POST|DELETE /api/docs/{id}/units/{unitId}` — birim bağı
 * - `GET /api/docs/{id}/download` — indirme adresi
 *
 * **Evrak BİRİME bağlanır.** Sunucu gövdesi proje seviyesinde evrak ve "havuz"
 * kavramını da destekliyor ama üründe böyle bir akış yok: her evrak en az bir
 * birimle ilişkilendiriliyor (`useDocumentUpload` bunu zorunlu tutuyor).
 *
 * **Arama sunucuda YOK.** Uç `q`/`Search` parametresi almıyor; sayfalı bir
 * listede istemci tarafı arama yalnız GÖRÜNEN sayfayı süzeceği için yanlış
 * sonuç verirdi. Bu yüzden Evraklar ekranındaki arama kutusu kaldırıldı —
 * yarım çalışan bir süzgeç, olmayandan daha yanıltıcı.
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
  /** Tip kimliği; süzgeç bununla gidiyor. */
  docTypeCodeId: number | null
  /** Görünen tip adı — SUNUCUDAN geliyor, istemcide sözlük tutulmuyor. */
  docTypeName: string | null
  /** Evrağın sisteme geliş tarihi (ISO); tarih filtresi buna bakar. */
  receivedAt: string | null
  /** Bir evrak birden çok birimle ilişkilendirilebilir (gereksinim 11). */
  unitNames: string[]
  projectId: number | null
  projectName: string | null
  /** Serbest biçimli proje numarası (bina kodu); sayı olarak yorumlanmaz. */
  projectPId: string | null
  /** "Proje Firması" filtresi kimliğe göre süzüyor; ad tek başına yetmez. */
  projectFirmId: number | null
  /**
   * Tesisat numarası. Sunucuda KARŞILIĞI YOK — ne `Doc`ta ne `Project`te böyle
   * bir alan var. Uydurulmuş bir değer yazmak yerine `null` bırakılıyor, hücre
   * boş işaretini çiziyor.
   */
  installationNo: string | null
  firmName: string | null
  gasFirmName: string | null
  /** Proje detayındaki evrak tablosu boyutu da gösteriyor; genel listede sütunu yok. */
  sizeBytes: number | null
  /**
   * Yükleyen kullanıcı. Liste gövdesinde YOK (yalnız `DocDetailDto` taşıyor);
   * satır başına ikinci bir istek atmamak için `null` kalıyor.
   */
  uploadedByName: string | null
  /**
   * MIME tipi. Dosyanın yeni sekmede mi açılacağı yoksa indirileceği mi
   * kararını YALNIZ bu belirler — uzantıya bakan bir ayrım, uzantısı yanlış
   * yazılmış dosyada sessizce yanlış davranırdı.
   */
  contentType: string | null
}

export interface DocumentListQuery {
  dateFrom: string | null
  dateTo: string | null
  /** Kod KİMLİĞİ; ekran URL'deki `codeValue`'yu buna çeviriyor. */
  docTypeCodeId: number | null
  projectFirmId: number | null
  /**
   * Üst bardaki KAPSAM. Sorguya `gdGroupId` VEYA `gdFirmId` olarak gider, ikisi
   * birden asla — ayrık birleşim bunu tipte garanti ediyor (proje listesiyle
   * aynı desen).
   */
  scope: AdminScope
  page: number
  pageSize: number
  sortBy: DocumentSortKey
  sortDir: SortDirection
}

/**
 * Evrak Ekle ekranındaki satırın kaynağı. İki sekme iki kaynak demek
 * (gereksinim 7): bilgisayardan yeni dosya, ya da aynı projeye daha önce
 * yüklenmiş bir evrağın yeniden ilişkilendirilmesi. Ayrım TİPTE duruyor çünkü
 * ikisi uca farklı gövdeyle gidiyor — birinde dosya, öbüründe yalnız kimlik.
 */
export type DocumentUploadSource =
  | { kind: 'file'; file: File }
  | { kind: 'existing'; documentId: number }

/** Evrak Ekle ekranının tek satırı: kaynak + tipi + işaretlenen birimler. */
export interface DocumentUpload {
  source: DocumentUploadSource
  docTypeCodeId: number
  /** En az bir birim ZORUNLU: evrak birime bağlanıyor. */
  unitIds: number[]
}

const docUnitSchema = z.object({
  id: z.number().int().positive(),
  unitNumber: z.string().nullish(),
  subscriberNo: z.string().nullish(),
})

const docListItemSchema = z.object({
  id: z.number().int().positive(),
  fileName: z.string(),
  contentType: z.string().nullish(),
  sizeBytes: z.number().nullish(),
  docTypeCodeId: z.number().nullish(),
  docTypeName: z.string().nullish(),
  projectId: z.number().nullish(),
  projectName: z.string().nullish(),
  buildingCode: z.string().nullish(),
  gasDistributionFirmName: z.string().nullish(),
  projectUnits: z.array(docUnitSchema),
  projectFirmId: z.number().nullish(),
  projectFirmName: z.string().nullish(),
  receivedAt: z.string().nullish(),
})

const docPageSchema = pagedResultSchema(docListItemSchema)

const downloadSchema = z.object({ url: z.string() })

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === '' ? null : trimmed
}

function toDocumentRow(dto: z.infer<typeof docListItemSchema>): DocumentRow {
  return {
    id: dto.id,
    fileName: dto.fileName,
    docTypeCodeId: dto.docTypeCodeId ?? null,
    docTypeName: toNullable(dto.docTypeName),
    receivedAt: toNullable(dto.receivedAt),
    // Birim numarası boş olabiliyor (çizimden senkron); o satırda abone numarası
    // ayırt etmeye yarıyor, ikisi de yoksa birim hiç yazılmıyor.
    unitNames: dto.projectUnits
      .map((unit) => toNullable(unit.unitNumber) ?? toNullable(unit.subscriberNo))
      .filter((name): name is string => name !== null),
    projectId: dto.projectId ?? null,
    projectName: toNullable(dto.projectName),
    projectPId: toNullable(dto.buildingCode),
    projectFirmId: dto.projectFirmId ?? null,
    installationNo: null,
    firmName: toNullable(dto.projectFirmName),
    gasFirmName: toNullable(dto.gasDistributionFirmName),
    sizeBytes: dto.sizeBytes ?? null,
    uploadedByName: null,
    contentType: toNullable(dto.contentType),
  }
}

/** Sunucunun sıralama anahtarları küçük harf; istemcininki camelCase. */
const SORT_KEY_PARAMS: Record<DocumentSortKey, string> = {
  receivedAt: 'receivedat',
  fileName: 'filename',
}

function buildListQuery(query: DocumentListQuery): string {
  const search = new URLSearchParams({
    Page: String(query.page),
    PageSize: String(query.pageSize),
    SortBy: SORT_KEY_PARAMS[query.sortBy],
    SortDir: query.sortDir,
  })

  // Boş süzgeç parametresi HİÇ yazılmaz: `DocTypeCodeId=` sunucuda ayrı bir
  // anlam taşıyabilir, "tümü" demek için parametrenin YOKLUĞU kullanılır.

  // Uçtaki adlar `ReceivedFrom`/`ReceivedTo`: süzgeç evrağın SİSTEME GELİŞ
  // tarihine (`Doc.ReceivedAt`) bakıyor. Değer `yyyy-MM-dd` olarak gidiyor —
  // sunucu iki ucu da `.Date` üzerinden gün bazlı ve KAPSAYICI karşılaştırıyor,
  // RFC 3339 damgasına çevirmek gün sınırını dilim farkı kadar kaydırırdı.
  if (query.dateFrom !== null) search.set('ReceivedFrom', query.dateFrom)
  if (query.dateTo !== null) search.set('ReceivedTo', query.dateTo)
  if (query.docTypeCodeId !== null) search.set('DocTypeCodeId', String(query.docTypeCodeId))
  if (query.projectFirmId !== null) search.set('ProjectFirmId', String(query.projectFirmId))
  if (query.scope.type === 'group') search.set('GdGroupId', String(query.scope.groupId))
  if (query.scope.type === 'firm') search.set('GdFirmId', String(query.scope.firmId))

  return search.toString()
}

/**
 * Evraklar listesi. Sayfalama, süzme ve sıralama SUNUCUDA; istemci gelen diziyi
 * daraltmıyor.
 *
 * `Sourced` zarfı duruyor çünkü çağıranlar kaynağa göre farklı yüzey çiziyor;
 * artık her zaman `server`.
 */
export async function listDocuments(
  query: DocumentListQuery,
  signal?: AbortSignal,
): Promise<Sourced<PagedResult<DocumentRow>>> {
  const page = await requestJson(
    { method: 'GET', path: `/api/docs?${buildListQuery(query)}`, signal },
    docPageSchema,
  )

  return serverData({ ...page, items: page.items.map(toDocumentRow) })
}

/**
 * Tek projenin evrakları — proje detayındaki sekme ve Evrak Ekle ekranındaki
 * "Proje Evrakları" kaynağı. Sayfalama istemiyor; üst sınır tek sayfada
 * kalmayacak kadar evrak olduğunda listeyi sessizce kesmesin diye yüksek.
 */
const PROJECT_DOCUMENT_PAGE_SIZE = 100

export async function listProjectDocuments(
  projectId: number,
  signal?: AbortSignal,
): Promise<Sourced<DocumentRow[]>> {
  const search = new URLSearchParams({
    ProjectId: String(projectId),
    Page: '1',
    PageSize: String(PROJECT_DOCUMENT_PAGE_SIZE),
    SortBy: SORT_KEY_PARAMS.receivedAt,
    SortDir: 'desc',
  })

  const page = await requestJson(
    { method: 'GET', path: `/api/docs?${search.toString()}`, signal },
    docPageSchema,
  )

  return serverData(page.items.map(toDocumentRow))
}

export async function deleteDocument(documentId: number, signal?: AbortSignal): Promise<void> {
  await requestVoid({ method: 'DELETE', path: `/api/docs/${documentId}`, signal })
}

/** Evrağı başka bir projeye taşır; `null` gövdeyle proje bağı kaldırılır. */
export async function assignDocumentToProject(
  documentId: number,
  projectId: number | null,
  signal?: AbortSignal,
): Promise<void> {
  await requestVoid({
    method: 'PUT',
    path: `/api/docs/${documentId}/assign`,
    rawJsonBody: JSON.stringify({ projectId }),
    signal,
  })
}

export async function linkDocumentToUnit(
  documentId: number,
  unitId: number,
  signal?: AbortSignal,
): Promise<void> {
  await requestVoid({ method: 'POST', path: `/api/docs/${documentId}/units/${unitId}`, signal })
}

export async function unlinkDocumentFromUnit(
  documentId: number,
  unitId: number,
  signal?: AbortSignal,
): Promise<void> {
  await requestVoid({ method: 'DELETE', path: `/api/docs/${documentId}/units/${unitId}`, signal })
}

/** İndirme adresi ayrı bir uçtan geliyor; liste satırı adres taşımıyor. */
export async function getDocumentDownloadUrl(
  documentId: number,
  signal?: AbortSignal,
): Promise<string> {
  const dto = await requestJson(
    { method: 'GET', path: `/api/docs/${documentId}/download`, signal },
    downloadSchema,
  )

  return dto.url
}

export interface DocumentSaveResult {
  savedCount: number
}

/**
 * "Kaydet". Her satır ayrı bir istek:
 *
 * - yeni dosya → `POST /api/docs` (multipart); ilk birim gövdede gidiyor,
 *   kalanlar `POST /api/docs/{id}/units/{unitId}` ile ekleniyor (uç yüklemede
 *   tek birim bağı kuruyor).
 * - var olan evrak → dosya yeniden yüklenmiyor, yalnız birim bağları ekleniyor.
 *
 * Sıralı gönderiliyor: paralel istekte aynı evrağa aynı anda birim bağlanması
 * sunucuda çakışabilir ve hangisinin geçtiği belirsiz kalırdı.
 */
export async function saveProjectDocuments(
  projectId: number,
  uploads: DocumentUpload[],
  signal?: AbortSignal,
): Promise<DocumentSaveResult> {
  for (const upload of uploads) {
    const [firstUnitId, ...restUnitIds] =
      upload.source.kind === 'file' ? upload.unitIds : [undefined, ...upload.unitIds]

    let documentId: number

    if (upload.source.kind === 'file') {
      const form = new FormData()
      form.append('File', upload.source.file)
      form.append('ProjectId', String(projectId))
      form.append('DocTypeCodeId', String(upload.docTypeCodeId))
      if (firstUnitId !== undefined) form.append('ProjectUnitId', String(firstUnitId))

      const created = await uploadForm(
        { path: '/api/docs', form, signal },
        z.object({ id: z.number().int().positive() }),
      )
      documentId = created.id
    } else {
      documentId = upload.source.documentId
    }

    for (const unitId of restUnitIds) {
      if (unitId === undefined) continue
      await linkDocumentToUnit(documentId, unitId, signal)
    }
  }

  return { savedCount: uploads.length }
}
