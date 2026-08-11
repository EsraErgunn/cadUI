import { z } from 'zod'

import { fetchText, requestJson, type RequestOptions } from './http'
import { pagedResultSchema, type PagedResult, type SortDirection } from './listQuery'
import {
  queryMockDistricts,
  queryMockFirmEngineers,
  queryMockGasFirmsForProjectFirm,
  queryMockHeatingTypes,
  queryMockProjectFirms,
  queryMockProjectStatusCounts,
  queryMockProjectTypes,
  submitMockProject,
} from './projectsMock'
import { includesTr } from './turkishText'
import type { Id, ProjectData } from '../core/model'
import { parseProjectJson, serializeProjectData } from '../core/serialize'

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

/**
 * Bina kullanımı PARAMETRİK DEĞİL: proje/ısınma tipinin aksine Ayarlar'dan
 * beslenmiyor, iki değeri sözleşmede sabit (proje detayındaki "Müstakil" alanı
 * bu ikiliye karşılık geliyor).
 */
export const BUILDING_USAGE_TYPES = ['coklu', 'mustakil'] as const
export type BuildingUsageType = (typeof BUILDING_USAGE_TYPES)[number]

export const BUILDING_USAGE_TYPE_LABELS: Record<BuildingUsageType, string> = {
  coklu: 'Çoklu',
  mustakil: 'Müstakil',
}

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

const projectListItemSchema = z.object({
  id: z.number().int().positive(),
  pId: z.string(),
  name: z.string(),
  firmName: z.string(),
  buildingCode: z.string().nullable(),
  projectType: z.string(),
  // Dar birleşim DEĞİL: uç ısınma tipini henüz döndürmüyor, yer tutucu geçebilmeli.
  heatingType: z.string(),
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
  firmName: string
  buildingCode: string | null
  projectType: ProjectTypeCode
  heatingType: HeatingTypeCode
  updatedAt: string
  createdAt: string
  gasFirm: Lookup | null
  hasDocuments: boolean
}

export interface ProjectListQuery {
  status: ProjectStatus
  dateFrom: string | null
  dateTo: string | null
  districtId: number | null
  projectFirmId: number | null
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
const submitProjectResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), missingDocuments: z.array(z.string()) }),
])

/**
 * Rozet adetlerini üreten mock kaydın şekli. Liste artık gerçek uçtan geldiği
 * için bunun zod şeması ve eşleyicisi kaldırıldı; tip yalnız `projectsMock`
 * ayakta kaldığı sürece duruyor.
 *
 * TODO(api): `GET /api/projects/status-counts` bağlanınca bu tip de silinecek.
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
 * GERÇEK UÇ SÖZLEŞMESİ — doğrulandı (2026-08-04, cadapi yerel).
 *
 * GET    /api/projects       → 200, DÜZ DİZİ: [{ id, name, code, createdAt, updatedAt }]
 *                              Sayfalama/filtre parametresi YOK, kayıt id'ye göre azalan.
 * POST   /api/projects       → 200, { id, name, description, code,
 *                                     projectFirmRegionId, gasDistributionFirmRegionId,
 *                                     createdAt, updatedAt }
 *                              Zorunlu: name, projectFirmRegionId, gasDistributionFirmRegionId.
 *                              Opsiyonel: description, code. Tanınmayan alan SESSİZCE atılır.
 * DELETE /api/projects/{id}  → 200 { message }, kayıt yoksa 404.
 *
 * Doğrulama hatası: 400 { errors: { Alan: [mesaj] } }
 * İş kuralı hatası: 400 { message }
 */
const apiProjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  code: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Uç, listede olmayan alanları hiç göndermiyor. Tabloda boş hücre yerine tire
 * çıksın diye tek bir yer tutucu kullanılıyor — gösterim metninin veri
 * katmanında olması geçici, uç alanları döndürmeye başlayınca kalkacak.
 *
 * TODO(api): firma adı, proje tipi, ısınma tipi, bina kodu, evrak durumu ve
 * gaz dağıtım firması uçtan gelmiyor; sözleşmeye eklenince eşleme düzeltilecek.
 */
const MISSING_VALUE_LABEL = '—'

/**
 * Uç `status` döndürmüyor; kayıtların tamamı taslak sayılıyor. Diğer sekmeler
 * bu yüzden boş liste alır — uydurma bir durum atamak, kullanıcıya onaya
 * gitmiş gibi görünen bir proje gösterirdi.
 *
 * TODO(api): proje durumu uca eklenince bu sabit kalkacak.
 */
const API_PROJECT_STATUS: ProjectStatus = 'taslak'

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

function mapApiProject(raw: z.infer<typeof apiProjectSchema>): ProjectListItem {
  return {
    id: raw.id,
    pId: toProjectPId(raw),
    name: raw.name,
    firmName: MISSING_VALUE_LABEL,
    buildingCode: null,
    projectType: MISSING_VALUE_LABEL,
    heatingType: MISSING_VALUE_LABEL,
    updatedAt: raw.updatedAt,
    createdAt: raw.createdAt,
    gasFirm: null,
    hasDocuments: false,
  }
}

function matchesQuery(project: ProjectListItem, query: ProjectListQuery): boolean {
  if (query.status !== API_PROJECT_STATUS) return false

  // Tarih aralığı güncelleme tarihine göre, gün bazlı kapsayıcı.
  const updatedDay = project.updatedAt.slice(0, 10)
  if (query.dateFrom !== null && updatedDay < query.dateFrom) return false
  if (query.dateTo !== null && updatedDay > query.dateTo) return false

  if (query.search !== '') {
    const hit = includesTr(project.name, query.search) || includesTr(project.pId, query.search)
    if (!hit) return false
  }

  // TODO(api): ilçe, proje firması ve bölge uçtan gelmiyor; bu üç filtre şimdilik
  // hiçbir kaydı elemiyor. Elenseydi filtre seçilir seçilmez liste boşalır ve
  // kullanıcı veri kaybettiğini sanardı.
  return true
}

function compareProjects(a: ProjectListItem, b: ProjectListItem, query: ProjectListQuery): number {
  const direction = query.sortDir === 'asc' ? 1 : -1
  if (query.sortBy === 'name') return a.name.localeCompare(b.name, 'tr') * direction
  return a[query.sortBy].localeCompare(b[query.sortBy]) * direction
}

/**
 * TODO(api): `GET /api/projects` filtre/sıralama/sayfalama parametresi almıyor,
 * bu yüzden TÜM liste çekilip istemcide süzülüyor, sıralanıyor ve 30'arlı
 * diliniyor. Kayıt sayısı büyüyünce uca `page`/`pageSize`/`q` eklenmeli —
 * CLAUDE.md "sayfalama sunucu taraflı" kuralının bilinçli, geçici istisnası.
 */
export async function listProjects(
  query: ProjectListQuery,
  signal?: AbortSignal,
): Promise<PagedResult<ProjectListItem>> {
  const raw = await requestJson(
    { method: 'GET', path: '/api/projects', signal },
    z.array(apiProjectSchema),
  )

  const matched = raw
    .map(mapApiProject)
    .filter((project) => matchesQuery(project, query))
    .sort((a, b) => compareProjects(a, b, query))

  const start = (query.page - 1) * query.pageSize

  return projectPageSchema.parse({
    items: matched.slice(start, start + query.pageSize),
    totalCount: matched.length,
    page: query.page,
    pageSize: query.pageSize,
  })
}

/** gerçek `GET /api/admin/projects/status-counts`. */
export async function getProjectStatusCounts(
  query: ProjectStatusCountsQuery,
  signal?: AbortSignal,
): Promise<Record<ProjectStatus, number>> {
  const counts = await queryMockProjectStatusCounts(query, signal)
  return statusCountsSchema.parse(counts)
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

/** gerçek `GET /api/admin/districts`. */
export async function getDistricts(signal?: AbortSignal): Promise<Lookup[]> {
  return lookupListSchema.parse(await queryMockDistricts(signal))
}

/**
 * gerçek `GET /api/admin/project-firms`.
 *
 * Bölge süzgeci YOK: üst bardaki kapsam seçicisi kaldırıldığı için hem liste
 * ekranının filtre kutusu hem yeni proje formu TÜM firmaları istiyor
 * (docs/kararlar.md K31).
 */
export async function getProjectFirms(signal?: AbortSignal): Promise<Lookup[]> {
  return lookupListSchema.parse(await queryMockProjectFirms(signal))
}

/**
 * API SÖZLEŞMESİ - Yeni proje formu.
 *
 * POST /api/admin/projects
 *   Gövde = CreateProjectPayload. P_ID SUNUCUDA üretilir, istemci göndermez.
 *   Proje "taslak" durumunda oluşur.
 *   201 → { id, pId, status }
 *
 * GET /api/admin/project-types   → ParametricOption[]  (Ayarlar'dan beslenir)
 * GET /api/admin/heating-types   → ParametricOption[]  (Ayarlar'dan beslenir)
 *
 * GET /api/admin/firm-engineers?projectFirmId=
 *   projectFirmId YOKSA sunucu token'daki firmadan türetir — proje firması
 *   kullanıcısı kendi firma kimliğini taşımıyor (bkz. getFirmEngineers).
 *   200 → RawFirmEngineer[]
 *
 * GET /api/admin/gas-distribution-firms/for-project-firm?projectFirmId=
 *   Seçili proje firmasının ÇALIŞTIĞI GD firmaları (bir proje firması birden
 *   fazla GD firmasıyla çalışabilir).
 *   200 → Lookup[]
 *
 * TODO(api): uçların yolları ve alan adları backend'le doğrulanacak.
 */

/** Ayarlar'dan beslenen seçenek: kod sözleşme, etiket kullanıcıya gösterilen ad. */
export interface ParametricOption<TCode extends string = string> {
  code: TCode
  label: string
}

export type ProjectTypeOption = ParametricOption<ProjectTypeCode>
export type HeatingTypeOption = ParametricOption<HeatingType>

/** Yetkili mühendis seçim kutusunun kaynağı. */
export interface FirmEngineer {
  id: number
  fullName: string
}

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
  /** yyyy-aa-gg; saat dilimi kaymasın diye ISO damgası değil, düz tarih. */
  startDate: string
  endDate: string
  engineerUserId: number
  connectionObject: string | null
  address: string
  apartmentCount: number
  workplaceCount: number
  areaSquareMeters: number
  /** Ada/Pafta/Parsel — serbest metin (tapu bilgisi). */
  parcelInfo: string | null
  projectType: ProjectTypeCode
  /** Yapı ruhsatına bağlı proje mi. */
  isPermitProject: boolean
  heatingType: HeatingType
  buildingUsageType: BuildingUsageType
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

const rawParametricOptionSchema = z.object({
  code: z.string(),
  label: z.string(),
})

/** Sunucu adı iki parça + aktiflik bayrağıyla gönderiyor; ekran tek ad bekliyor. */
const rawFirmEngineerSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  isActive: z.boolean(),
})

const createdProjectSchema = z.object({
  id: z.number().int().positive(),
  pId: z.string(),
  status: z.enum(PROJECT_STATUSES),
})

export type RawParametricOption = z.infer<typeof rawParametricOptionSchema>
export type RawFirmEngineer = z.infer<typeof rawFirmEngineerSchema>

export function mapFirmEngineer(raw: RawFirmEngineer): FirmEngineer {
  return { id: raw.id, fullName: `${raw.firstName} ${raw.lastName}`.trim() }
}

/**
 * Isınma tipi sunucuda parametrik ama `heatingType` alanı dar birleşimle kilitli
 * (liste ekranının şeması bu enum'a bağlı). Tanınmayan kod gelirse form KIRILMAZ:
 * seçenek süzülür ve bir kez uyarı düşer — kullanıcıya seçtiremeyeceğimiz bir
 * değeri göstermek, sonradan doğrulamada patlamaktan iyidir.
 */
export function mapHeatingTypeOptions(raw: RawParametricOption[]): HeatingTypeOption[] {
  const known: HeatingTypeOption[] = []
  const unknownCodes: string[] = []

  for (const option of raw) {
    const code = HEATING_TYPES.find((candidate) => candidate === option.code)
    if (code === undefined) {
      unknownCodes.push(option.code)
      continue
    }
    known.push({ code, label: option.label })
  }

  if (unknownCodes.length > 0) {
    // Sessizce kaybolan seçenek, hata ayıklanamayan bir "listede yok" şikâyetine
    // dönüşür; sözleşme sapması görünür kalmalı. no-console kuralı unutulmuş
    // hata ayıklama çıktısı içindir, bilinçli sözleşme uyarısı için değil.
    // eslint-disable-next-line no-console
    console.warn(`Bilinmeyen ısınma tipi kodu sunucudan geldi: ${unknownCodes.join(', ')}`)
  }

  return known
}

/** gerçek `GET /api/admin/project-types`. Kod listesi parametrik: süzülmez. */
export async function getProjectTypes(signal?: AbortSignal): Promise<ProjectTypeOption[]> {
  const raw = z.array(rawParametricOptionSchema).parse(await queryMockProjectTypes(signal))
  return raw.map((option) => ({ code: option.code, label: option.label }))
}

/** gerçek `GET /api/admin/heating-types`. */
export async function getHeatingTypes(signal?: AbortSignal): Promise<HeatingTypeOption[]> {
  const raw = z.array(rawParametricOptionSchema).parse(await queryMockHeatingTypes(signal))
  return mapHeatingTypeOptions(raw)
}

/**
 * gerçek `GET /api/admin/firm-engineers`.
 *
 * `projectFirmId` opsiyonel: admin firmayı seçerek sorar, proje firması kullanıcısı
 * kendi firma kimliğini taşımadığı için kimliksiz sorar ve sunucu token'dan türetir.
 * TODO(api): kimliksiz çağrının uçta desteklendiği doğrulanacak.
 */
export async function getFirmEngineers(
  projectFirmId?: number,
  signal?: AbortSignal,
): Promise<FirmEngineer[]> {
  const raw = z
    .array(rawFirmEngineerSchema)
    .parse(await queryMockFirmEngineers(projectFirmId, signal))

  // Pasif kullanıcıyı sunucunun süzmesi beklenir; ikinci süzgeç ucuz ve
  // yetkisini kaybetmiş bir mühendisin yeni projeye atanmasını engeller.
  return raw.filter((engineer) => engineer.isActive).map(mapFirmEngineer)
}

/** gerçek `GET /api/admin/gas-distribution-firms/for-project-firm`. */
export async function getGasFirmsForProjectFirm(
  projectFirmId: number,
  signal?: AbortSignal,
): Promise<Lookup[]> {
  return lookupListSchema.parse(await queryMockGasFirmsForProjectFirm(projectFirmId, signal))
}

const apiCreatedProjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullish(),
  code: z.string().nullish(),
  projectFirmRegionId: z.number().int(),
  gasDistributionFirmRegionId: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Uç `projectFirmRegionId`/`gasDistributionFirmRegionId` istiyor: bunlar firma
 * kimliği DEĞİL, firma×bölge bağ kaydının kimliği. Formdaki `projectFirmId`
 * (11, 12…) buraya konulamaz — uç "bölgesi bulunamadı" der.
 *
 * Bu kimlikleri listeleyen bir uç YOK (`/api/regions`, `/api/projectfirmregions`
 * → 404; `/api/projectfirms` yalnız firmayı döndürüyor, bölge bağını değil) ve
 * bugün veritabanında yalnız 1 numaralı bağ kayıtlı — 2..6 denendi, hepsi
 * reddedildi. Sabit bu yüzden, tahmin olduğu için değil.
 *
 * TODO(api): firma×bölge bağlarını listeleyen bir uç açılınca form bu değeri
 * seçilen firmadan türetecek ve sabit kalkacak.
 */
const SEEDED_PROJECT_FIRM_REGION_ID = 1
const SEEDED_GAS_FIRM_REGION_ID = 1

/**
 * `POST /api/projects`. Uç bugün yalnız `name`, `description`, `code` ve iki
 * bölge bağını saklıyor; formun geri kalan alanları GÖNDERİLMİYOR.
 *
 * TODO(api): adres, iş başlama/bitiş tarihi, yetkili mühendis, bağlantı nesnesi,
 * daire/işyeri sayısı, alan, ada/pafta/parsel, proje tipi, ruhsat bayrağı, ısınma
 * tipi, bina kullanımı tipi, kapasite, S.K. basıncı ve kapak açıklaması uçta
 * karşılığı olmadığı için kaydedilmiyor. Bunları `description` içine JSON olarak
 * gömmek sunucunun sorgulayamadığı, şemasız bir alan yaratırdı — bilinçli olarak
 * yapılmadı, uç genişleyince tek tek eklenecek.
 */
export async function createProject(payload: CreateProjectPayload): Promise<CreatedProject> {
  const created = await requestJson(
    {
      method: 'POST',
      path: '/api/projects',
      rawJsonBody: JSON.stringify({
        name: payload.name,
        projectFirmRegionId: SEEDED_PROJECT_FIRM_REGION_ID,
        gasDistributionFirmRegionId: SEEDED_GAS_FIRM_REGION_ID,
      }),
    },
    apiCreatedProjectSchema,
  )

  // pId liste eşlemesiyle AYNI kuraldan türüyor; ayrışsaydı yeni kayıt vurgusu
  // (pId eşleşmesi) hiçbir satırı yakalamazdı.
  return createdProjectSchema.parse({
    id: created.id,
    pId: toProjectPId(created),
    status: API_PROJECT_STATUS,
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
      // stringify eder ve alan sırası sözleşmeden sapardı.
      rawJsonBody: serializeProjectData(data),
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
