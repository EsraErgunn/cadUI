import { z } from 'zod'

import { pagedResultSchema, type PagedResult, type SortDirection } from './listQuery'
import {
  deleteMockProject,
  queryMockDistricts,
  queryMockProjectFirms,
  queryMockProjects,
  queryMockProjectStatusCounts,
  submitMockProject,
} from './projectsMock'

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

/** gerçek `GET /api/admin/project-firms`. */
export async function getProjectFirms(signal?: AbortSignal): Promise<Lookup[]> {
  return lookupListSchema.parse(await queryMockProjectFirms(signal))
}
