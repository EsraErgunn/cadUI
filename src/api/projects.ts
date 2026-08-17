import { z } from 'zod'

import { getCurrentUser } from './auth'
import { fetchText, requestJson, type RequestOptions } from './http'
import { pagedResultSchema, type PagedResult, type SortDirection } from './listQuery'
import {
  MISSING_USER_FIRMS_MESSAGE,
  ProjectFirmAuthorizationError,
  resolveProjectFirmAuthorizationId,
} from './projectFirmAuthorizations'
import { queryMockProjectFirms, submitMockProject } from './projectsMock'
import { includesTr } from './turkishText'
import type { Id, ProjectData } from '../core/model'
import { serializeProjectDataForBackend } from '../core/projectExportFormat'
import { parseProjectJson } from '../core/serialize'

/**
 * API SÖZLEŞMESİ - Projeler listesi.
 *
 * GET /api/admin/projects
 * - status: taslak | onayBekleyen | onaylanan | reddedilen
 * - from, to: ISO tarih (yyyy-aa-gg), güncelleme tarihine göre kapsayıcı aralık
 * - district: İlçe kimliği
 * - firm: Proje firması kimliği
 * - q: Serbest arama — proje adı, P_ID VE tesisat numarası üzerinde çalışır
 *      (büyük/küçük harf ve Türkçe karakter duyarsız)
 * - sort: updatedAt | createdAt | name (varsayılan: updatedAt)
 * - dir: asc | desc (varsayılan: desc)
 * - page: 1 tabanlı
 * - pageSize: 30
 *
 * 200 → PagedResult<ProjectListItem>
 *
 * GET /api/admin/projects/status-counts
 * - Listeyle AYNI filtre parametrelerini alır, `status` hariç: sekme rozetleri
 *   uygulanan filtreye göre hesaplanır.
 * 200 → Record<ProjectStatus, number>
 *
 * DELETE /api/admin/projects/:id → 204
 *
 * POST /api/admin/projects/:id/submit
 * 200 → { ok: true }
 * 422 → { ok: false, missingDocuments: string[] }   (eksik evrak)
 *
 * GET /api/admin/districts     → Lookup[]
 * GET /api/admin/project-firms → Lookup[]
 */

export const PROJECT_PAGE_SIZE = 30

export const PROJECT_STATUSES = ['taslak', 'onayBekleyen', 'onaylanan', 'reddedilen'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  taslak: 'Taslak',
  onayBekleyen: 'Onay Bekleyen',
  onaylanan: 'Onaylanan',
  reddedilen: 'Reddedilen',
}

export const PROJECT_TYPES = [
  'ILAVE',
  'ILAVE_TADILAT',
  'KOLON',
  'KOLON_TADILAT',
  'RUHSAT',
] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  ILAVE: 'İlave',
  ILAVE_TADILAT: 'İlave Tadilat',
  KOLON: 'Kolon',
  KOLON_TADILAT: 'Kolon Tadilat',
  RUHSAT: 'Ruhsat',
}

/**
 * Proje tipi sunucuda PARAMETRİK: listeye yeni kod eklenebilir ve arayüz onu
 * bilmeden karşılaşabilir. Bu yüzden alan dar birleşimle kilitlenmez — bilinen
 * kodlar otomatik tamamlamada çıkar, bilinmeyen kod şemadan geçer ve rozet ham
 * kodu gösterir (patlamaz). Aynı sebeple şema `z.string()`.
 */
export type ProjectTypeCode = ProjectType | (string & {})

export const HEATING_TYPES = ['bireysel', 'merkezi'] as const
export type HeatingType = (typeof HEATING_TYPES)[number]

export const HEATING_TYPE_LABELS: Record<HeatingType, string> = {
  bireysel: 'Bireysel',
  merkezi: 'Merkezi',
}

/**
 * LİSTEDEKİ ısınma tipi — `ProjectTypeCode` ile aynı gerekçe: tip parametrik,
 * arayüz bilmediği bir kodla karşılaşabilir ve rozet ham kodu gösterir.
 * FORM tarafı bu genişlemeyi ALMAZ: `CreateProjectPayload.heatingType` dar
 * birleşim kalır, yoksa kullanıcı seçemeyeceği bir değerle proje kaydederdi.
 */
export type HeatingTypeCode = HeatingType | (string & {})

export const PROJECT_SORT_KEYS = ['updatedAt', 'createdAt', 'name'] as const
export type ProjectSortKey = (typeof PROJECT_SORT_KEYS)[number]

export const DEFAULT_PROJECT_SORT_KEY: ProjectSortKey = 'updatedAt'
/** Son güncellenen üstte: liste ekranının en sık beklenen açılış sırası. */
export const DEFAULT_PROJECT_SORT_DIR: SortDirection = 'desc'

/** İlçe / proje firması gibi kimlik + ad taşıyan seçim kutusu kaynağı. */
export interface Lookup {
  id: number
  name: string
}

const lookupSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
})

/**
 * Uçtan GELMEYEN alanlar `null`: `GET /api/projects` beş alan döndürüyor
 * (Swagger 2026-08-14). Eskiden bu alanlara "—" METNİ yazılıyordu; gösterim
 * metni veri katmanında durunca tip de yalan söylüyordu (`firmName: string`).
 * Artık yokluk `null` ile taşınıyor, tireyi tablo çiziyor (`EmptyValue`).
 */
const projectListItemSchema = z.object({
  id: z.number().int().positive(),
  pId: z.string(),
  name: z.string(),
  firmName: z.string().nullable(),
  buildingCode: z.string().nullable(),
  // Dar birleşim DEĞİL: tipler sunucuda parametrik, bilinmeyen kod rozette
  // ham hâliyle çıkar (bkz. ProjectTypeCode).
  projectType: z.string().nullable(),
  heatingType: z.string().nullable(),
  updatedAt: z.string(),
  createdAt: z.string(),
  gasFirm: lookupSchema.nullable(),
  hasDocuments: z.boolean(),
})

export interface ProjectListItem {
  id: number
  /** Serbest biçimli proje numarası — sayı olarak yorumlanmaz, olduğu gibi gösterilir. */
  pId: string
  name: string
  firmName: string | null
  buildingCode: string | null
  projectType: ProjectTypeCode | null
  heatingType: HeatingTypeCode | null
  updatedAt: string
  createdAt: string
  gasFirm: Lookup | null
  /**
   * Uç bu bilgiyi döndürmüyor; bugün her satırda `false` ve bu bir VARSAYIM —
   * ikon "evrak yok" diyor, sunucu böyle bir şey söylemedi.
   * TODO(esra): `GET /api/projects/{id}/docs` bağlanınca gerçek değere geçilecek.
   */
  hasDocuments: boolean
}

export interface ProjectListQuery {
  status: ProjectStatus
  dateFrom: string | null
  dateTo: string | null
  /** İlçe süzgeci ile bağlı: ilçe listesi ancak il seçilince gelir. */
  cityId: number | null
  districtId: number | null
  projectFirmId: number | null
  /**
   * Uçta karşılığı YOK; gelen sayfa istemcide süzülüyor (bkz. `filterBySearch`).
   * Alan sorguda duruyor çünkü URL durumu ve arama kutusu ona bağlı.
   */
  search: string
  page: number
  pageSize: number
  sortBy: ProjectSortKey
  sortDir: SortDirection
}

/** Rozet adetleri sekmeden ve sayfalamadan bağımsız: yalnız filtre kriterleri. */
export type ProjectStatusCountsQuery = Omit<
  ProjectListQuery,
  'status' | 'page' | 'pageSize' | 'sortBy' | 'sortDir'
>

export type SubmitProjectResult = { ok: true } | { ok: false; missingDocuments: string[] }

const projectPageSchema = pagedResultSchema(projectListItemSchema)
const statusCountsSchema = z.record(z.enum(PROJECT_STATUSES), z.number().int().nonnegative())
const lookupListSchema = z.array(lookupSchema)

/** `GET /api/cities` satırı; `plateCode` arayüze taşınmıyor. */
const cityListDtoSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    name: z.string(),
    plateCode: z.string().nullable(),
  }),
)
const submitProjectResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), missingDocuments: z.array(z.string()) }),
])

/**
 * Mock kaydın şekli. Liste de rozetler de artık gerçek uçtan geldiği için bu
 * tipin zod şeması ve eşleyicisi kaldırıldı; yalnız `projectsMock` "Onaya
 * Gönder" ve evrak/poliçe tohumları için ayakta kaldığı sürece duruyor.
 *
 * TODO(esra): `POST /api/projects/{id}/submit` açılınca `projectsMock` ile
 * birlikte bu tip de silinecek.
 */
export interface RawProjectListItem {
  id: number
  pId: string
  name: string
  firmName: string
  buildingCode?: string | null
  projectType: string
  heatingType: HeatingType
  updatedAt: string
  createdAt: string
  gasFirmId?: number | null
  gasFirmName?: string | null
  hasDocuments: boolean
}

/**
 * GERÇEK UÇ SÖZLEŞMESİ — Swagger ile doğrulandı (2026-08-14, güncel sürüm).
 *
 * GET /api/projects
 *   Query (PascalCase): Status, DateFrom, DateTo (RFC 3339 date-time),
 *   CityId, DistrictId, ProjectFirmId, SortBy, SortDir, Page, PageSize.
 *   200 → { items: [{ id, name, code, status, statusName, projectTypeName,
 *                     heatingTypeName, createdAt, updatedAt }],
 *           totalCount, page, pageSize }
 *   SÜZME VE SAYFALAMA ARTIK SUNUCUDA — istemci dizi dilimlemiyor.
 *   ARAMA parametresi YOK: sözleşmede `q`/`Search` bulunmuyor.
 *
 * GET /api/projects/status-counts
 *   Query: DateFrom, DateTo, CityId, DistrictId, ProjectFirmId (Status YOK —
 *   rozetler durumdan bağımsız). 200 → { draft, pendingApproval, approved, rejected }
 *
 * POST   /api/projects       → 200, ProjectDto (aşağıda `apiCreatedProjectSchema`)
 * DELETE /api/projects/{id}  → 200, soft-delete (pasifleştirir), kayıt yoksa 404.
 *
 * Doğrulama hatası: 400 { errors: { Alan: [mesaj] } }
 * İş kuralı hatası: 400 { message }
 */
const apiProjectListItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  code: z.string().nullish(),
  /** Durum KODU ve adı. Tabloda sütunu yok (satırlar zaten sekmeyle süzülü);
      sözleşmeyi belgelemek için şemada duruyorlar. */
  status: z.string().nullish(),
  statusName: z.string().nullish(),
  /** Uç KOD değil AD döndürüyor; rozet bilinmeyen kodu ham gösterdiği için
      ad da olduğu gibi basılabiliyor. */
  projectTypeName: z.string().nullish(),
  heatingTypeName: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Uç şu an (2026-08-17 ölçüldü) sayfalı zarf DEĞİL, düz dizi dönüyor —
 * Swagger'daki "PagedResult" sözleşmesi henüz uygulanmamış. Liste ekranı
 * `requestJson`'un şema doğrulamasına bu yüzden takılıp sonsuz "yükleniyor"da
 * kalıyordu (schema.safeParse başarısız → ApiError → react-query sessizce
 * tekrar dener, ağ sekmesinde aynı `/api/projects` isteği art arda görülür).
 * Sayfalama SUNUCUDA olana kadar iki gövde biçimi de kabul edilir; dizi
 * geldiğinde toplam/sayfa istemci tarafında türetilir.
 */
const apiProjectPageSchema = z.union([
  z.array(apiProjectListItemSchema),
  pagedResultSchema(apiProjectListItemSchema),
])

function toApiProjectPage(
  raw: z.infer<typeof apiProjectPageSchema>,
  requestedPage: number,
  requestedPageSize: number,
): { items: z.infer<typeof apiProjectListItemSchema>[]; totalCount: number; page: number; pageSize: number } {
  if (!Array.isArray(raw)) return raw

  return { items: raw, totalCount: raw.length, page: requestedPage, pageSize: requestedPageSize }
}

/**
 * Sunucunun durum kodu ↔ arayüzün kodu. `status-counts` yanıtının anahtarları
 * (draft/pendingApproval/approved/rejected) bu adlandırmayı doğruluyor.
 *
 * TODO(esra): `Status` query parametresinin BEKLEDİĞİ değer biçimi Swagger'da
 * yazılı değil; buradaki dört değer tek kaynaktan gidiyor — sunucu farklı bir
 * biçim istiyorsa (ör. sayısal CodeValue) yalnız bu sözlük değişir.
 */
const SERVER_STATUS_CODES: Record<ProjectStatus, string> = {
  taslak: 'Draft',
  onayBekleyen: 'PendingApproval',
  onaylanan: 'Approved',
  reddedilen: 'Rejected',
}

/** Yeni proje taslak açılır (ürün kuralı); `POST` yanıtı durum döndürmüyor. */
const CREATED_PROJECT_STATUS: ProjectStatus = 'taslak'

/** `status-counts` yanıtının anahtarları; sözleşmede birebir bu adlarla. */
const statusCountsDtoSchema = z.object({
  draft: z.number().int().nonnegative(),
  pendingApproval: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
})

/**
 * Uçta P_ID diye bir alan yok; `code` opsiyonel ve varsayılan olarak null.
 * Kayıt kimliği yedek olarak kullanılıyor: boş bırakılsaydı yeni kayıt
 * vurgusu (pId eşleşmesi) tüm satırları yakalardı.
 *
 * TODO(api): sunucu üretimli proje numarası gelince burası sadeleşecek.
 */
function toProjectPId(raw: { id: number; code?: string | null }): string {
  const code = raw.code?.trim()
  return code === undefined || code === '' ? String(raw.id) : code
}

function toNullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === '' ? null : trimmed
}

/**
 * TODO(esra): firma adı, bina kodu, evrak durumu ve gaz dağıtım firması uçtan
 * GELMİYOR — sözleşmeye eklendiğinde bu `null`'lar gerçek değerlerle dolacak,
 * çağıran taraf değişmeyecek.
 */
function mapApiProject(raw: z.infer<typeof apiProjectListItemSchema>): ProjectListItem {
  return {
    id: raw.id,
    pId: toProjectPId(raw),
    name: raw.name,
    firmName: null,
    buildingCode: null,
    projectType: toNullableText(raw.projectTypeName),
    heatingType: toNullableText(raw.heatingTypeName),
    updatedAt: raw.updatedAt,
    createdAt: raw.createdAt,
    gasFirm: null,
    hasDocuments: false,
  }
}

/**
 * Gün → RFC 3339 damgası. Uç `date-time` istiyor, URL'de ise `yyyy-aa-gg`
 * duruyor. Parçalar YEREL saatle kuruluyor: `new Date('2026-08-01')` UTC gece
 * yarısı sayılır ve +03'te günü bir gün geriye kaydırırdı.
 */
function toDayBoundary(isoDay: string, edge: 'start' | 'end'): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay)
  if (match === null) return null

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date =
    edge === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : // Aralık KAPSAYICI: bitiş günü içindeki kayıtlar da girsin.
        new Date(year, month - 1, day, 23, 59, 59, 999)

  return date.toISOString()
}

/** Uç PascalCase anahtar bekliyor; boş değerler hiç yazılmaz (adres temiz kalır). */
function appendParam(search: URLSearchParams, key: string, value: string | number | null): void {
  if (value === null || value === '') return
  search.set(key, String(value))
}

/**
 * Liste ve rozet uçlarının ORTAK süzgeç parametreleri. İkisi aynı kriterleri
 * alıyor (rozetlerde yalnız `Status` yok); tek yerde üretiliyor ki biri
 * güncellenip öbürü unutulmasın.
 */
function buildFilterParams(query: ProjectStatusCountsQuery): URLSearchParams {
  const search = new URLSearchParams()

  appendParam(search, 'DateFrom', query.dateFrom === null ? null : toDayBoundary(query.dateFrom, 'start'))
  appendParam(search, 'DateTo', query.dateTo === null ? null : toDayBoundary(query.dateTo, 'end'))
  appendParam(search, 'CityId', query.cityId)
  appendParam(search, 'DistrictId', query.districtId)
  appendParam(search, 'ProjectFirmId', query.projectFirmId)

  return search
}

/**
 * Sözleşmede ARAMA parametresi YOK. Kutu kaldırılmadığı için gelen sayfa
 * istemcide süzülüyor — yani arama YALNIZ görüntülenen sayfayı kapsıyor,
 * `totalCount` süzülmemiş adedi göstermeye devam ediyor.
 *
 * TODO(esra): uca `Q` parametresi eklenmeli; eklenince bu fonksiyon ve
 * çağrısı silinip parametre `buildFilterParams`'a taşınacak.
 */
function filterBySearch(items: ProjectListItem[], search: string): ProjectListItem[] {
  if (search === '') return items

  // `includesTr` şart: 'İ'.toLowerCase() birleşen nokta üretip eşleşmeyi
  // sessizce kaçırıyor (knowledge/turkish-collation).
  return items.filter(
    (project) => includesTr(project.name, search) || includesTr(project.pId, search),
  )
}

/**
 * `GET /api/projects` — süzme, sıralama ve sayfalama SUNUCUDA (Swagger
 * 2026-08-14). Yanıtın `totalCount`'u sayfalamayı, `items` sırası tabloyu
 * yönetiyor; istemci diziyi dilimlemiyor.
 *
 * Tek istisna arama: uçta karşılığı yok, gelen sayfa `filterBySearch` ile
 * süzülüyor (bkz. oradaki not).
 */
export async function listProjects(
  query: ProjectListQuery,
  signal?: AbortSignal,
): Promise<PagedResult<ProjectListItem>> {
  const search = buildFilterParams(query)
  appendParam(search, 'Status', SERVER_STATUS_CODES[query.status])
  appendParam(search, 'SortBy', query.sortBy)
  appendParam(search, 'SortDir', query.sortDir)
  appendParam(search, 'Page', query.page)
  appendParam(search, 'PageSize', query.pageSize)

  const raw = await requestJson(
    { method: 'GET', path: `/api/projects?${search.toString()}`, signal },
    apiProjectPageSchema,
  )
  const page = toApiProjectPage(raw, query.page, query.pageSize)

  return projectPageSchema.parse({
    items: filterBySearch(page.items.map(mapApiProject), query.search),
    totalCount: page.totalCount,
    page: page.page,
    pageSize: page.pageSize,
  })
}

/**
 * Sekme rozetleri — `GET /api/projects/status-counts`. Listeyle AYNI süzgeçleri
 * alır, `Status` almaz: rozetler durumdan bağımsız sayılır.
 *
 * Arama rozetlere YANSIMAZ (uçta parametresi yok): kutuya yazılan metin
 * listedeki satırları süzer ama rozetteki adet süzülmemiş kalır.
 */
export async function getProjectStatusCounts(
  query: ProjectStatusCountsQuery,
  signal?: AbortSignal,
): Promise<Record<ProjectStatus, number>> {
  const search = buildFilterParams(query)
  const dto = await requestJson(
    { method: 'GET', path: `/api/projects/status-counts?${search.toString()}`, signal },
    statusCountsDtoSchema,
  )

  return statusCountsSchema.parse({
    taslak: dto.draft,
    onayBekleyen: dto.pendingApproval,
    onaylanan: dto.approved,
    reddedilen: dto.rejected,
  })
}

/** `DELETE /api/projects/{id}` → 200 `{ message }`. Gövde kullanılmıyor; uç
    ileride 204'e dönerse şema değil, http.ts'in gövde okuması ayarlanacak. */
export async function deleteProject(id: number): Promise<void> {
  await requestJson({ method: 'DELETE', path: `/api/projects/${id}` }, z.unknown())
}

/** gerçek `POST /api/admin/projects/:id/submit`. */
export async function submitProject(id: number): Promise<SubmitProjectResult> {
  const result = await submitMockProject(id)
  return submitProjectResultSchema.parse(result)
}

/**
 * `GET /api/cities` → 81 il (seeder ile dolu gelir). GERÇEK uç.
 *
 * İLSİZ bir ilçe listesi ucu YOK; liste ekranının ilçe süzgeci de bu yüzden
 * önce il sorar (eski `getDistricts` mock'u kalktı).
 *
 * `plateCode` alanı da geliyor ama arayüze taşınmıyor: seçim kutusunda plaka
 * göstermek istenmedi, taşınsaydı kullanılmayan bir alan olurdu.
 */
export async function getCities(signal?: AbortSignal): Promise<Lookup[]> {
  const dtos = await requestJson(
    { method: 'GET', path: '/api/cities', signal },
    cityListDtoSchema,
  )

  return dtos.map((city) => ({ id: city.id, name: city.name }))
}

/**
 * `GET /api/cities/{cityId}/districts` → seçilen ilin ilçeleri. GERÇEK uç.
 *
 * İl KİMLİĞİ zorunlu: ilçeler ile bağımsız listelenemiyor. Form bu yüzden
 * ilçe kutusunu il seçilene kadar pasif tutuyor.
 */
export async function getCityDistricts(
  cityId: number,
  signal?: AbortSignal,
): Promise<Lookup[]> {
  return requestJson(
    { method: 'GET', path: `/api/cities/${cityId}/districts`, signal },
    lookupListSchema,
  )
}

/**
 * MOCK proje firmaları. Tek çağıranı kaldı: EVRAKLAR listesinin firma süzgeci.
 *
 * Gerçek uç VAR (`GET /api/projectfirms`, `api/projectFirms.ts`) ve hem proje
 * listesi hem yeni proje formu ona bağlandı. Evrak süzgeci bağlanamıyor çünkü
 * evrak satırları bu mock'un kimlikleriyle (11–15) tohumlanıyor; gerçek uca
 * çevrilseydi süzgeç hiçbir kaydın eşleşmediği bir hâle düşerdi (K75).
 *
 * TODO(esra): evrak uçları gelince bu fonksiyon ve `MOCK_PROJECT_FIRMS` silinecek.
 */
export async function getProjectFirms(signal?: AbortSignal): Promise<Lookup[]> {
  return lookupListSchema.parse(await queryMockProjectFirms(signal))
}

/**
 * API SÖZLEŞMESİ - Yeni proje formu.
 *
 * POST /api/projects
 *   Gövde = ProjectCreateDto (aşağıda `createProject`). P_ID SUNUCUDA üretilir.
 *   Proje "taslak" durumunda oluşur.
 *
 * Proje / ısınma / bina kullanımı tipleri PARAMETRİK ve tek bir kod grubu
 * ucundan geliyor (`api/codes.ts`): gövdeye kod METNİ değil kod KİMLİĞİ gider.
 *
 * GET /api/admin/gas-distribution-firms/for-project-firm?projectFirmId=
 *   Seçili proje firmasının ÇALIŞTIĞI GD firmaları (bir proje firması birden
 *   fazla GD firmasıyla çalışabilir).
 *   200 → Lookup[]
 *
 * TODO(api): firma uçlarının yolları ve alan adları backend'le doğrulanacak.
 */

/**
 * Formun sunucuya gönderdiği gövde. Firma alanları OPSİYONEL: proje firması
 * kullanıcısında bu iki alan hiç gönderilmez, sunucu token'dan türetir. İstemcinin
 * gönderdiği firma kimliğine güvenmek başka firmanın adına proje açmaya yol açardı
 * (bkz. knowledge/access-control.md).
 */
export interface CreateProjectPayload {
  name: string
  projectFirmId?: number
  gasDistributionFirmId?: number
  /** İl kimliği — uca `cityId` olarak gider (zorunlu alan). */
  cityId: number
  /** İlçe kimliği — uca `districtId` olarak gider (zorunlu alan). */
  districtId: number
  connectionObject: string | null
  address: string
  apartmentCount: number
  workplaceCount: number
  areaSquareMeters: number
  /** Ada/Pafta/Parsel — serbest metin (tapu bilgisi). */
  parcelInfo: string | null
  /** `ProjectType` kod grubundaki kaydın kimliği (bkz. api/codes.ts). */
  projectTypeCodeId: number
  /** Yapı ruhsatına bağlı proje mi. */
  isPermitProject: boolean
  /** `HeatingType` kod grubundaki kaydın kimliği. */
  heatingTypeCodeId: number
  /** `BuildingUsageType` kod grubundaki kaydın kimliği. */
  buildingUsageTypeCodeId: number
  capacityCubicMeterPerHour: number
  serviceBoxPressureMbar: number
  coverNote: string | null
}

export interface CreatedProject {
  id: number
  /** Sunucunun ürettiği proje numarası; istemci üretmez. */
  pId: string
  status: ProjectStatus
}

const createdProjectSchema = z.object({
  id: z.number().int().positive(),
  pId: z.string(),
  status: z.enum(PROJECT_STATUSES),
})

/**
 * `POST /api/projects` yanıtı (2026-08 sözleşmesi). Şema YALNIZ çağıranın
 * ihtiyaç duyduğu alanları zorunlu tutuyor: sunucu il/ilçe adlarını da türetip
 * döndürüyor ama form onları kullanmıyor, zorunlu kılınsalardı uç bir alanı
 * kaldırdığında kayıt sınırda sessizce patlardı.
 */
const apiCreatedProjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullish(),
  code: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Uç `projectFirmAuthorizationId` istiyor: bu firma kimliği DEĞİL, proje
 * firmasının belirli bir gaz dağıtım firmasındaki YETKİ kaydının kimliği.
 * Formdaki `projectFirmId` (11, 12…) buraya konulamaz — uç 400 döner.
 *
 * Kimlik 2026-08-16'ya kadar SABİTTİ (seed'deki tek satır, `= 1`) çünkü
 * listeleyen uç yoktu: her proje, seçilen firmadan bağımsız olarak o tek yetki
 * kaydına bağlanıyordu. `GET /api/project-firm-authorizations` açılınca sabit
 * kalktı ve kimlik seçilen firma çiftinden çözülüyor.
 *
 * Firma çifti iki kaynaktan gelebiliyor:
 * - **admin**: formdaki proje firması + GD firması seçimleri (alanlar yalnız
 *   admin'de render ediliyor, bkz. `newProjectSchema`),
 * - **proje firması kullanıcısı**: alanlar hiç görünmüyor, çift oturumdaki
 *   kullanıcıdan (`GET /api/auth/me`) okunuyor.
 */
async function resolveAuthorizationId(payload: CreateProjectPayload): Promise<number> {
  if (payload.projectFirmId !== undefined && payload.gasDistributionFirmId !== undefined) {
    return resolveProjectFirmAuthorizationId({
      projectFirmId: payload.projectFirmId,
      gasDistributionFirmId: payload.gasDistributionFirmId,
    })
  }

  const me = await getCurrentUser()

  if (me.projectFirmId === null || me.gasDistributionFirmId === null) {
    throw new ProjectFirmAuthorizationError(MISSING_USER_FIRMS_MESSAGE)
  }

  return resolveProjectFirmAuthorizationId({
    projectFirmId: me.projectFirmId,
    gasDistributionFirmId: me.gasDistributionFirmId,
  })
}

/**
 * `POST /api/projects`.
 *
 * SÖZLEŞME DEĞİŞTİ (2026-08): uç artık `projectFirmRegionId` +
 * `gasDistributionFirmRegionId` DEĞİL, `projectFirmAuthorizationId` istiyor ve
 * ayrıca `cityId`/`districtId`/`addressLine`/`blockLotParcel` kabul ediyor.
 * Eski gövde 400 alıyordu ("Proje firması yetkisi zorunludur") — proje ekleme
 * bu yüzden hiç çalışmıyordu.
 *
 * `ProjectCreateDto` artık tesisat ve yapı alanlarının tamamını saklıyor; üç
 * tip alanı kod KİMLİĞİ olarak gidiyor (`*CodeId`) ve sayısal alanların hepsi
 * int32 — ondalık gövde 400 döner, doğrulama `newProjectSchema`'da tam sayıyı
 * zorunlu tutuyor.
 *
 * `description` ve `code` GÖNDERİLMİYOR: formda karşılıkları yok, uçta ikisi de
 * `null` kabul ediyor. Form alanlarını `description` içine JSON olarak gömmek
 * sunucunun sorgulayamadığı şemasız bir alan yaratırdı.
 */
export async function createProject(payload: CreateProjectPayload): Promise<CreatedProject> {
  // Yetki kimliği kayıttan ÖNCE çözülüyor: çözülemezse proje hiç açılmasın.
  // Sonrasına bırakılsaydı kayıt sunucuya yazılmış, bağı yanlış kalmış olurdu.
  const projectFirmAuthorizationId = await resolveAuthorizationId(payload)

  const created = await requestJson(
    {
      method: 'POST',
      path: '/api/projects',
      rawJsonBody: JSON.stringify({
        name: payload.name,
        projectFirmAuthorizationId,
        cityId: payload.cityId,
        districtId: payload.districtId,
        addressLine: payload.address,
        blockLotParcel: payload.parcelInfo,
        connectionObject: payload.connectionObject,
        projectTypeCodeId: payload.projectTypeCodeId,
        heatingTypeCodeId: payload.heatingTypeCodeId,
        buildingUsageTypeCodeId: payload.buildingUsageTypeCodeId,
        isPermitProject: payload.isPermitProject,
        apartmentCount: payload.apartmentCount,
        workplaceCount: payload.workplaceCount,
        areaSquareMeters: payload.areaSquareMeters,
        // Uçtaki ad birimsiz; birim gövdede kaybolmasın diye payload alanı
        // `capacityCubicMeterPerHour` kalıyor, çeviri yalnız burada.
        capacity: payload.capacityCubicMeterPerHour,
        serviceBoxPressureMbar: payload.serviceBoxPressureMbar,
        coverNote: payload.coverNote,
      }),
    },
    apiCreatedProjectSchema,
  )

  // pId liste eşlemesiyle AYNI kuraldan türüyor; ayrışsaydı yeni kayıt vurgusu
  // (pId eşleşmesi) hiçbir satırı yakalamazdı.
  return createdProjectSchema.parse({
    id: created.id,
    pId: toProjectPId(created),
    // Yanıt durum döndürmüyor; yeni proje kural gereği taslak açılıyor ve
    // çağıran onu "Taslak" sekmesinde vurguluyor.
    status: CREATED_PROJECT_STATUS,
  })
}

/**
 * API SÖZLEŞMESİ — çizim versiyonları (cadapi ProjectVersionsController).
 *
 * POST /api/projects/{projectId}/newversion?label=...
 *   Gövde = ham çizim JSON'u (serialize.ts'in ürettiği metin).
 *   200 → { id, projectId, objectKey, label, createdAt }
 * GET  /api/projects/{projectId}/versions      → [{ id, label, createdAt }]
 * GET  /api/projectversions/{id}/get           → { url }  (süreli MinIO linki)
 *
 * Çizim JSON'u SQL'e girmez, MinIO'da durur; API yalnız anahtarı tutar.
 * Autosave YOK — bu fonksiyonlar sadece kullanıcı "Kaydet"e basınca çağrılır.
 */

const projectVersionCreatedSchema = z.object({
  id: z.number().int(),
  projectId: z.number().int(),
  objectKey: z.string(),
  label: z.string().nullable(),
  createdAt: z.string(),
})

const projectVersionListItemSchema = z.object({
  id: z.number().int(),
  label: z.string().nullable(),
  createdAt: z.string(),
})

const projectVersionDownloadSchema = z.object({
  url: z.string(),
})

export type ProjectVersionCreated = z.infer<typeof projectVersionCreatedSchema>
export type ProjectVersionListItem = z.infer<typeof projectVersionListItemSchema>

/**
 * Yeni sürüm SADECE "Farklı Kaydet" ile üretilir (CLAUDE.md ürün kuralı), ama
 * uçtaki her yazma zaten yeni ve DEĞİŞMEZ bir MinIO nesnesi doğurur — etiket
 * (label) sürümü kullanıcıya ayırt ettiren tek alan.
 */
export function saveProjectVersion(
  projectId: Id,
  data: ProjectData,
  label?: string,
  options?: RequestOptions,
): Promise<ProjectVersionCreated> {
  const query = label ? `?label=${encodeURIComponent(label)}` : ''

  return requestJson(
    {
      method: 'POST',
      path: `/api/projects/${projectId}/newversion${query}`,
      // Metin burada üretiliyor: nesne gönderilseydi fetch ikinci kez
      // stringify eder ve alan sırası sözleşmeden sapardı. Düzenleme modeline
      // (serializeProjectData) EK olarak backend'in okuyacağı sayaç bazlı
      // unitReport'u da gömer (core/projectExportFormat.ts) — düzenleme
      // modelinin kendisi ve kabul testi bundan ETKİLENMEZ.
      rawJsonBody: serializeProjectDataForBackend(data),
      signal: options?.signal,
    },
    projectVersionCreatedSchema,
  )
}

export function getProjectVersions(
  projectId: Id,
  options?: RequestOptions,
): Promise<ProjectVersionListItem[]> {
  return requestJson(
    { method: 'GET', path: `/api/projects/${projectId}/versions`, signal: options?.signal },
    z.array(projectVersionListItemSchema),
  )
}

/**
 * İki adım: API süreli bir MinIO linki üretir, çizim o linkten çekilir.
 * JSON API'den GEÇMEZ — büyük çizim gövdesi uçtan akmasın diye böyle.
 */
export async function loadProjectVersion(
  versionId: Id,
  options?: RequestOptions,
): Promise<ProjectData> {
  const { url } = await requestJson(
    { method: 'GET', path: `/api/projectversions/${versionId}/get`, signal: options?.signal },
    projectVersionDownloadSchema,
  )

  // Depodan gelen metin de şemadan geçer: nesne elle değiştirilmiş olabilir.
  return parseProjectJson(await fetchText(url, options))
}

/** Projenin en son kaydı; hiç sürüm yoksa undefined. */
export async function loadLatestProjectVersion(
  projectId: Id,
  options?: RequestOptions,
): Promise<ProjectData | undefined> {
  // Uç CreatedAt'e göre AZALAN sıralı döndürüyor; ilk kayıt en yenisi.
  const [latest] = await getProjectVersions(projectId, options)
  if (!latest) return undefined

  return loadProjectVersion(latest.id, options)
}
