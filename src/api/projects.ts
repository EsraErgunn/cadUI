import { z } from 'zod'

// Yalnız TİP: `import type` erimeli, yoksa dashboard'un mock modülü proje
// listesinin paketine de girerdi.
import type { AdminScope } from './adminDashboard'
import { getCurrentUser } from './auth'
import { ApiError, fetchText, requestJson, type RequestOptions } from './http'
import { pagedResultSchema, type PagedResult, type SortDirection } from './listQuery'
import {
  MISSING_USER_FIRMS_MESSAGE,
  ProjectFirmAuthorizationError,
  resolveProjectFirmAuthorizationId,
} from './projectFirmAuthorizations'
import { queryMockProjectFirms } from './projectsMock'
import type { Id, ProjectData } from '../core/model'
import { serializeProjectDataForBackend } from '../core/projectExportFormat'
import { parseProjectJson } from '../core/serialize'

/**
 * API SÖZLEŞMESİ — Projeler listesi (GERÇEK uçlar; yol `/api/projects`,
 * `/api/admin/...` DEĞİL). Parametre adları sunucudaki gibi PascalCase, kapsam
 * anahtarları ise dashboard ucuyla aynı camelCase.
 *
 * GET /api/projects
 * - Status: Draft | PendingApproval | Approved | Rejected (arayüz kodları
 *   `SERVER_STATUS_CODES` ile çevrilir)
 * - DateFrom, DateTo: RFC 3339 damgası; gün sonuna kadar KAPSAYICI
 * - CityId, DistrictId, ProjectFirmId: kimlik
 * - gdGroupId VEYA gdFirmId: üst bardaki kapsam; İKİSİ BİRDEN gitmez
 * - SortBy: updatedAt | createdAt | name  (varsayılan: updatedAt)
 * - SortDir: asc | desc                   (varsayılan: desc)
 * - Page: 1 tabanlı, PageSize: 30
 * - ARAMA `Search` olarak sunucuya gider (proje adı + bina kodu)
 * 200 → { items, totalCount, page, pageSize }
 *
 * GET /api/projects/status-counts
 * - Listeyle AYNI süzgeçleri alır, `Status` hariç: rozetler durumdan bağımsız.
 * 200 → { draft, pendingApproval, approved, rejected }
 *
 * GET    /api/projects/{id} → tekil kayıt (bkz. `api/projectDetail.ts`)
 * POST   /api/projects      → ProjectCreateDto (aşağıda `createProject`)
 * DELETE /api/projects/{id} → 200, soft-delete
 *
 * GET /api/cities                      → Lookup[]
 * GET /api/cities/{cityId}/districts   → Lookup[]
 *
 * POST /api/projects/{id}/submit → "Onaya Gönder"; eksik evrakta
 * `{ ok: false, missingDocuments }`.
 *
 * PUT /api/projects/{id} → proje güncelleme. Uç VAR ve `RowVersion` ile
 * iyimser eşzamanlılık destekliyor; eksik olan EKRAN.
 * TODO(esra): güncelleme ekranı yazılınca `updateProject` buraya eklenecek —
 * gövde `ProjectUpdateDto` ve detay ucundan okunan `rowVersion` geri gönderilmeli,
 * yoksa sunucu 409 döndürür.
 *
 * ESKİ NOT (artık geçersiz): proje GÜNCELLEME — gövdesi create
 * alanları + `rowVersion` ister ama `GET /api/projects/{id}` o alanları
 * döndürmediği için doldurulacak bir form da kurulamıyor
 * (bkz. `projectDetailExtras`).
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

/**
 * Liste ekranının açılış sekmesi. `DEFAULT_PROJECT_SORT_KEY` ile aynı yerde
 * duruyor: üçü de "adres bir şey söylemiyorsa ne varsayılır" sorusunun cevabı
 * ve varsayılan değerler URL'e YAZILMADIĞI için (CLAUDE.md) bağlantı üreten
 * taraf da bu sabiti bilmek zorunda.
 */
export const DEFAULT_PROJECT_STATUS: ProjectStatus = 'taslak'

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
 * Proje satırındaki gaz dağıtım firması. `Lookup`tan farkı KİMLİĞİN
 * opsiyonel olması: liste ucu adı döndürüyor ama kimliği her zaman değil ve
 * kimliksiz satırda ad gizlenmek yerine bağlantısız gösteriliyor.
 */
export interface ProjectGasFirm {
  id: number | null
  name: string
}

const projectGasFirmSchema = z.object({
  id: z.number().int().positive().nullable(),
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
  gasFirm: projectGasFirmSchema.nullable(),
  status: z.enum(PROJECT_STATUSES).nullable(),
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
  gasFirm: ProjectGasFirm | null
  /**
   * Sunucunun durum KODU (`status`) arayüz koduna çevrilmiş hâli. Tabloda
   * sütunu yok — satırlar zaten sekmeyle süzülü — ama satır aksiyonları
   * ("Onaya Gönder", "Sil") buna bakar. Sunucu tanımadığımız bir kod
   * döndürürse `null` kalır: uydurma bir durum atamaktansa bilinmiyor demek.
   */
  status: ProjectStatus | null
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
   * Üst bardaki KAPSAM (`useAdminScopeParam`). Sorguya `gdGroupId` VEYA
   * `gdFirmId` olarak gider, ikisi birden asla — ayrık birleşim bunu tipte
   * garanti ediyor (bkz. `api/adminDashboard.ts`).
   */
  scope: AdminScope
  /**
   * Uca `Search` olarak gider; proje adında ve bina kodunda aranır.
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
 * Mock kaydın şekli. Liste, rozetler ve "Onaya Gönder" artık gerçek uçtan
 * geldiği için bu tipin zod şeması ve eşleyicisi kaldırıldı; yalnız
 * `projectsMock` evrak/poliçe tohumları (`getMockProjectSeeds`) için ayakta
 * kaldığı sürece duruyor.
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
 *   ARAMA `Search` parametresiyle sunucuda yapılır.
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
  buildingCode: z.string().nullish(),
  /** Proje firmasının ünvanı (`FirmName`). */
  firmName: z.string().nullish(),
  /**
   * Gaz dağıtım firmasının ADI (`GasDistributionFirmName`). Kimlik ayrı bir
   * alan ve sözleşmede zorunlu değil; gelmezse hücre bağlantısız metin çizer.
   */
  gasDistributionFirmName: z.string().nullish(),
  gasDistributionFirmId: z.number().int().nullish(),
  /** Projede en az bir evrak var mı; satırdaki rozet buna bakıyor. */
  hasDocuments: z.boolean().nullish(),
  /** Durum KODU ve adı. `status` satır aksiyonlarını süren GERÇEK durum
      (`toProjectStatus`); `statusName` arayüze taşınmıyor — etiketler
      `PROJECT_STATUS_LABELS`'tan geliyor ve iki kaynak ayrışırdı. */
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
const apiProjectPageSchema = pagedResultSchema(apiProjectListItemSchema)

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

/**
 * `SERVER_STATUS_CODES`'un tersi: liste ucunun satır başına döndürdüğü durum
 * kodunu arayüz koduna çevirir. Kod tanınmazsa (ya da hiç gelmezse) `null` —
 * bilinmeyen bir kodu "taslak" saymak, projeyi olmadığı bir durumda gösterip
 * "Onaya Gönder" düğmesini yanlış satıra koyardı.
 */
export function toProjectStatus(raw: string | null | undefined): ProjectStatus | null {
  const code = raw?.trim().toLowerCase()
  if (code === undefined || code === '') return null

  return (
    PROJECT_STATUSES.find((status) => SERVER_STATUS_CODES[status].toLowerCase() === code) ?? null
  )
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
 * Uçta P_ID diye bir alan yok; sunucunun proje numarası `buildingCode`
 * (eskiden yanlışlıkla `code` okunuyordu, o ad uçta hiç yoktu ve pId her
 * satırda kimliğe düşüyordu). Boşsa kayıt kimliği yedek: boş bırakılsaydı yeni
 * kayıt vurgusu (pId eşleşmesi) tüm satırları yakalardı.
 */
function toProjectPId(raw: { id: number; buildingCode?: string | null }): string {
  const buildingCode = raw.buildingCode?.trim()
  return buildingCode === undefined || buildingCode === '' ? String(raw.id) : buildingCode
}

function toNullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === '' ? null : trimmed
}

/**
 * Firma adı, bina kodu ve gaz dağıtım firması artık GERÇEK (`FirmName`,
 * `BuildingCode`, `GasDistributionFirmName`).
 * Evrak durumu (`hasDocuments`) artık uçtan geliyor; eskiden her satıra sabit
 * `false` yazılıyordu ve rozet hiçbir projede görünmüyordu.
 */
function mapApiProject(raw: z.infer<typeof apiProjectListItemSchema>): ProjectListItem {
  const gasFirmName = toNullableText(raw.gasDistributionFirmName)

  return {
    id: raw.id,
    pId: toProjectPId(raw),
    name: raw.name,
    firmName: toNullableText(raw.firmName),
    buildingCode: toNullableText(raw.buildingCode),
    projectType: toNullableText(raw.projectTypeName),
    heatingType: toNullableText(raw.heatingTypeName),
    updatedAt: raw.updatedAt,
    createdAt: raw.createdAt,
    // Kimlik gelmiyorsa ad yine gösterilir, yalnız bağlantı kurulmaz: adı
    // atmak, sunucunun GERÇEKTEN döndürdüğü veriyi saklamak olurdu.
    gasFirm:
      gasFirmName === null
        ? null
        : { id: raw.gasDistributionFirmId ?? null, name: gasFirmName },
    status: toProjectStatus(raw.status),
    hasDocuments: raw.hasDocuments ?? false,
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
 * Üst bardaki kapsamı sorguya yazar. Kapsam yoksa parametre HİÇ yazılmaz: boş
 * `gdGroupId=` sunucuda ayrı bir anlam taşıyabilir, "tümü" demek için
 * parametrenin YOKLUĞU kullanılıyor (dashboard ucundaki kuralın aynısı).
 *
 * Firma seçiliyken grup GİTMEZ: sunucu iki parametreyi birlikte kabul etmiyor
 * ve firma zaten daha dar kapsam — grubu da göndermek çelişki olurdu.
 */
function appendScopeParams(search: URLSearchParams, scope: AdminScope): void {
  if (scope.type === 'group') search.set('gdGroupId', String(scope.groupId))
  if (scope.type === 'firm') search.set('gdFirmId', String(scope.firmId))
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
  // Boş arama parametre olarak HİÇ yazılmaz; `appendParam` boş değeri atlıyor.
  appendParam(search, 'Search', query.search === '' ? null : query.search)
  appendScopeParams(search, query.scope)

  return search
}

/**
 * `GET /api/projects` — süzme, sıralama ve sayfalama SUNUCUDA (Swagger
 * 2026-08-14). Yanıtın `totalCount`'u sayfalamayı, `items` sırası tabloyu
 * yönetiyor; istemci diziyi dilimlemiyor.
 *
 * Arama da SUNUCUDA (`Search`): proje adı ve bina kodunda geçiyor. İstemcide
 * süzülürken yalnız GÖRÜNEN sayfayı kapsıyordu ve `totalCount` süzülmemiş
 * adedi göstermeye devam ediyordu — kullanıcı "3 sonuç" yazan bir listede 30
 * satır görüyordu.
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

  const page = await requestJson(
    { method: 'GET', path: `/api/projects?${search.toString()}`, signal },
    apiProjectPageSchema,
  )

  return projectPageSchema.parse({
    items: page.items.map(mapApiProject),
    totalCount: page.totalCount,
    page: page.page,
    pageSize: page.pageSize,
  })
}

/**
 * Sekme rozetleri — `GET /api/projects/status-counts`. Listeyle AYNI süzgeçleri
 * alır, `Status` almaz: rozetler durumdan bağımsız sayılır.
 *
 * Arama rozetlere de YANSIR: `Search` diğer süzgeçlerle birlikte gidiyor,
 * yani rozetteki adet ile listedeki satır sayısı aynı kümeyi anlatıyor.
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

/**
 * "Onaya Gönder" — GERÇEK uç: `POST /api/projects/{id}/submit`.
 *
 * İki sonuç da GÖVDEDE: gönderim başarılıysa 200 `{ ok: true }`, zorunlu evrak
 * eksikse **400** `{ ok: false, missingDocuments }`. Eksik evrak bir hata
 * durumu olduğu için `http.ts` fırlatıyor; gövdeyi `ApiError.body` üzerinden
 * geri okuyoruz — ikinci bir istek atmadan.
 *
 * Şemaya uymayan gövde artık BAŞARI SAYILMIYOR. Eskiden sayılıyordu ve
 * sözleşme kayması "gönderildi" diye görünüyordu: proje taslakta kalırken
 * kullanıcı işini bitmiş sanıyordu. Artık sebebi konsola yazılıp hata
 * yükseltiliyor, çağıran kullanıcıya "gönderilemedi" diyor.
 */
export async function submitProject(id: number): Promise<SubmitProjectResult> {
  try {
    const body = await requestJson(
      { method: 'POST', path: `/api/projects/${id}/submit` },
      z.unknown(),
    )

    return parseSubmitResult(body, 'başarılı yanıt')
  } catch (error) {
    if (error instanceof ApiError && error.status === BAD_REQUEST) {
      const parsed = submitProjectResultSchema.safeParse(error.body)
      // 400 yalnız eksik evrakta bu şekli taşıyor; başka bir doğrulama hatasıysa
      // (ör. yanlış durumdan geçiş) olduğu gibi yükselir.
      if (parsed.success) return parsed.data
    }

    throw error
  }
}

const BAD_REQUEST = 400

function parseSubmitResult(body: unknown, source: string): SubmitProjectResult {
  const parsed = submitProjectResultSchema.safeParse(body)
  if (parsed.success) return parsed.data

  // BİLİNÇLİ teşhis çıktısı: sözleşme kayması sessizce yutulursa "gönderildi"
  // yazan ama gönderilmemiş bir ekran kalır.
  // eslint-disable-next-line no-console -- yukarıdaki gerekçe
  console.error(`submitProject: ${source} sözleşmeye uymuyor`, parsed.error.issues)
  throw new Error('Onaya gönderme yanıtı beklenen biçimde değil.')
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
  buildingCode: z.string().nullish(),
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
 * İKİ ALAN AD DEĞİŞTİREREK gidiyor ve bu bilinçli (backend 91baf4c): sunucuda
 * `connectionObject` ve `coverNote` diye alan YOK — ekip "Bağlantı Nesnesi"nin
 * bina koduyla aynı işi gördüğüne karar verip `Building.Code`'u tuttu, kapak
 * açıklamasını da `description` içinde birleştirdi. Payload adları formun
 * etiketlerini yansıttığı için DEĞİŞMİYOR; çeviri yalnız burada, `capacity`
 * dönüşümüyle aynı desen.
 *
 * `buildingCode` sunucuda BENZERSİZ: aynı bağlantı nesnesi ikinci bir projede
 * kullanılırsa uç 409 döner ve form onu alan hatasına çevirir
 * (`useNewProjectForm`).
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
        buildingCode: payload.connectionObject,
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
        description: payload.coverNote,
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

/**
 * Projenin en son kaydı; hiç sürüm yoksa undefined.
 *
 * Yalnız çizimi değil KİMLİĞİNİ de döndürüyor: editör hangi sürümün açık
 * olduğunu biliyor olmalı, yoksa kayıt geçmişi listesi "yüklü olan hangisi"
 * sorusunu cevaplayamaz ve kullanıcı zaten açık olan sürümü yeniden yükler.
 */
export async function loadLatestProjectVersion(
  projectId: Id,
  options?: RequestOptions,
): Promise<{ versionId: Id; data: ProjectData } | undefined> {
  // Uç CreatedAt'e göre AZALAN sıralı döndürüyor; ilk kayıt en yenisi.
  const [latest] = await getProjectVersions(projectId, options)
  if (!latest) return undefined

  return { versionId: latest.id, data: await loadProjectVersion(latest.id, options) }
}
