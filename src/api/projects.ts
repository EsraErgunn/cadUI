import { z } from 'zod'

import { fetchText, requestJson, type RequestOptions } from './http'
import { pagedResultSchema, type PagedResult, type SortDirection } from './listQuery'
import {
  createMockProject,
  deleteMockProject,
  queryMockDistricts,
  queryMockFirmEngineers,
  queryMockGasFirmsForProjectFirm,
  queryMockHeatingTypes,
  queryMockProjectFirms,
  queryMockProjects,
  queryMockProjectStatusCounts,
  queryMockProjectTypes,
  submitMockProject,
} from './projectsMock'
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
 * - region: Bölge adı (üst bardaki kapsam seçimi, tam eşleşme). Firma ekranıyla
 *           AYNI anahtar ve aynı değer kümesi kullanılır.
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
  heatingType: z.enum(HEATING_TYPES),
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
  heatingType: HeatingType
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
  /** Bölge ADI. İlçe/firma kimlikle gelirken bunun ad olması bilinçli: üst bardaki
      kapsam seçimi (`useRegionParam`) ve firma ekranı da adla çalışıyor. */
  region: string | null
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
 * Sunucunun ham yanıtı. Alan adları backend'le HENÜZ kesinleşmedi; gaz dağıtım
 * firması düz iki alan olarak geliyor, arayüz ise iç içe nesne bekliyor.
 * Alan adı değişirse yalnız bu şema ve `mapProjectListItem` güncellenir —
 * bileşenler ve `ProjectListItem` etkilenmez.
 */
const rawProjectListItemSchema = z.object({
  id: z.number().int().positive(),
  pId: z.string(),
  name: z.string(),
  firmName: z.string(),
  buildingCode: z.string().nullish(),
  projectType: z.string(),
  heatingType: z.enum(HEATING_TYPES),
  updatedAt: z.string(),
  createdAt: z.string(),
  gasFirmId: z.number().int().positive().nullish(),
  gasFirmName: z.string().nullish(),
  hasDocuments: z.boolean(),
})

export type RawProjectListItem = z.infer<typeof rawProjectListItemSchema>

/**
 * Ham kaydı ekranın beklediği şekle çevirir. İki normalizasyon yapar:
 * eksik/boş metinleri `null`'a indirger (tabloda "—" gösterilecek) ve düz gaz
 * firması alanlarını tek nesnede toplar.
 */
export function mapProjectListItem(raw: RawProjectListItem): ProjectListItem {
  const buildingCode = raw.buildingCode?.trim()
  const gasFirmId = raw.gasFirmId ?? null
  const gasFirmName = raw.gasFirmName ?? null

  return {
    id: raw.id,
    pId: raw.pId,
    name: raw.name,
    firmName: raw.firmName,
    buildingCode: buildingCode === undefined || buildingCode === '' ? null : buildingCode,
    projectType: raw.projectType,
    heatingType: raw.heatingType,
    updatedAt: raw.updatedAt,
    createdAt: raw.createdAt,
    gasFirm:
      gasFirmId === null || gasFirmName === null ? null : { id: gasFirmId, name: gasFirmName },
    hasDocuments: raw.hasDocuments,
  }
}

/**
 * gerçek `GET /api/admin/projects` bağlanınca bu gövde fetch +
 * `rawProjectListItemSchema` doğrulaması + `mapProjectListItem` olacak; imza ve
 * dönüş tipi aynı kaldığı için çağıran taraf değişmez.
 */
export async function listProjects(
  query: ProjectListQuery,
  signal?: AbortSignal,
): Promise<PagedResult<ProjectListItem>> {
  const { items, totalCount } = await queryMockProjects(query, signal)

  // İki şema iki farklı sözleşmeyi korur: ham şema sunucunun gönderdiğini,
  // sayfa şeması eşlemeden sonra ekranın beklediğini. Mock da olsa ikisinden de
  // geçiyor — sözleşme bozulursa gerçek endpoint'ten önce burada patlar.
  const rawItems = z.array(rawProjectListItemSchema).parse(items)

  return projectPageSchema.parse({
    items: rawItems.map(mapProjectListItem),
    totalCount,
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

/** gerçek `DELETE /api/admin/projects/:id`. */
export async function deleteProject(id: number): Promise<void> {
  await deleteMockProject(id)
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
 * `region` opsiyonel: liste ekranının filtre kutusu TÜM firmaları ister, yeni
 * proje formu ise üst bardaki bölge seçimiyle sınırlı olanları. İki ayrı fonksiyon
 * açmak aynı ucu iki yerden tarif etmek olurdu.
 */
export async function getProjectFirms(
  region?: string | null,
  signal?: AbortSignal,
): Promise<Lookup[]> {
  return lookupListSchema.parse(await queryMockProjectFirms(region ?? null, signal))
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
 * GET /api/admin/gas-distribution-firms/for-project-firm?projectFirmId=&region=
 *   Seçili proje firmasının ÇALIŞTIĞI GD firmaları (bir proje firması birden
 *   fazla GD firmasıyla çalışabilir), bölgeyle ayrıca sınırlanır.
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

export interface GasFirmsForProjectFirmQuery {
  projectFirmId: number
  /** Üst bardaki kapsam seçimi; "Hepsi" ise null. */
  region: string | null
}

/** gerçek `GET /api/admin/gas-distribution-firms/for-project-firm`. */
export async function getGasFirmsForProjectFirm(
  query: GasFirmsForProjectFirmQuery,
  signal?: AbortSignal,
): Promise<Lookup[]> {
  return lookupListSchema.parse(await queryMockGasFirmsForProjectFirm(query, signal))
}

/** gerçek `POST /api/admin/projects`. */
export async function createProject(payload: CreateProjectPayload): Promise<CreatedProject> {
  return createdProjectSchema.parse(await createMockProject(payload))
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
