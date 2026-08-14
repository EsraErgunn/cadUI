import { z } from 'zod'

import { ApiError, requestJson } from './http'
import { mockedData, type Sourced } from './mockGate'
import {
  buildMockProjectDocuments,
  buildMockProjectExtras,
  buildMockProjectHistory,
  buildMockProjectPolicies,
  buildMockProjectUnits,
} from './projectDetailMock'
import {
  REVISION_REQUESTED_STATUS,
  type ProjectDetail,
  type ProjectDetailStatus,
  type ProjectDocumentRow,
  type ProjectHistoryRow,
  type ProjectPolicyRow,
  type ProjectServerFields,
  type ProjectSummary,
  type ProjectUnitRow,
} from './projectDetailTypes'
import { PROJECT_STATUSES } from './projects'
import { isEndpointImplemented } from './unimplementedEndpoints'

/**
 * Tipler ayrı dosyada ama modülün public yüzü BURASI: çağıranlar tek yerden
 * import etsin diye yeniden dışa aktarılıyorlar (barrel değil — bu modülün
 * kendi API'si).
 */
export * from './projectDetailTypes'

/**
 * API SÖZLEŞMESİ — Proje detayı.
 *
 * GERÇEK ve bağlı olan tek uç:
 *   GET /api/projects/{id} → ProjectDetailDto
 *   { id, name, description, code, projectFirmAuthorizationId,
 *     gasDistributionFirmRegionId, cityId, cityName, districtId, districtName,
 *     addressLine, blockLotParcel, createdAt, updatedAt }
 *
 * Ekranın istediği geri kalan her şeyin (durum, tesisat no, proje/ısınma tipi,
 * onay bilgileri, teknik değerler, birim/cihaz, işlem geçmişi, evrak, poliçe,
 * onay/ret/revizyon, .zpd / DWG / PDF indirme) uçta karşılığı YOK. Tamamı
 * `unimplementedEndpoints.ts` içinde bayraklı; oradaki satır silinince buradaki
 * `isEndpointImplemented` çağrısı DERLEME HATASI verir (doğrulandı).
 */

const projectDetailDtoSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullish(),
  code: z.string().nullish(),
  cityName: z.string().nullish(),
  districtName: z.string().nullish(),
  addressLine: z.string().nullish(),
  blockLotParcel: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Liste eşlemesiyle AYNI kural (projects.ts): kod boşsa kimlik yedeğe düşer. */
function toProjectPId(raw: { id: number; code?: string | null }): string {
  const code = raw.code?.trim()
  return code === undefined || code === '' ? String(raw.id) : code
}

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === '' ? null : trimmed
}

/**
 * Mock durum kimliğe göre dönüyor: hepsi "Taslak" olsaydı onay aksiyonlarının
 * etkin hâli ve onay kartının dolu hâli hiç görülemezdi (KK-2, KK-11).
 *
 * BİLİNEN TUTARSIZLIK: liste ekranı `GET /api/projects` durum döndürmediği için
 * her kaydı "taslak" sayıyor (projects.ts → API_PROJECT_STATUS). Sunucu durumu
 * döndürene kadar liste ile detay aynı proje için farklı durum gösterebilir.
 */
function mockStatusOf(projectId: number): ProjectDetailStatus {
  return PROJECT_STATUSES[projectId % PROJECT_STATUSES.length]
}

/**
 * `GET /api/projects/{id}` — GERÇEK uç. Yanıtın taşımadığı alanlar ayrı bir
 * bayrağın arkasında; bu yüzden tek bir istek iki kaynaklı bir sonuç üretiyor.
 */
export async function getProjectDetail(
  projectId: number,
  signal?: AbortSignal,
): Promise<ProjectDetail> {
  const dto = await requestJson(
    { method: 'GET', path: `/api/projects/${projectId}`, signal },
    projectDetailDtoSchema,
  )

  const server: ProjectServerFields = {
    id: dto.id,
    pId: toProjectPId(dto),
    name: dto.name,
    description: toNullable(dto.description),
    cityName: toNullable(dto.cityName),
    districtName: toNullable(dto.districtName),
    addressLine: toNullable(dto.addressLine),
    blockLotParcel: toNullable(dto.blockLotParcel),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }

  if (isEndpointImplemented('projectDetailExtras')) {
    throw new Error('getProjectDetail: detay ucu bağlandı ama gövdesi yazılmadı.')
  }

  const extras = mockedData(() => buildMockProjectExtras(dto.id, mockStatusOf(dto.id)))

  return { server, extras: extras.source === 'unavailable' ? null : extras.data }
}

const NOT_FOUND = 404

/**
 * Bir projeye bağlı açılan ekranların künyesi (`?project=<id>`). Kaynak, detay
 * ekranını besleyen GERÇEK uç.
 *
 * Künye mock tohumlarından okunduğu sürece iki türlü yanlış davranıyordu:
 * sunucudaki proje tohum listesinde yoksa ekran açılmıyor, kimlik tesadüfen bir
 * tohuma denk gelirse BAŞKA bir projenin adı gösteriliyordu (K63).
 *
 * 404 `null` döner (kimlik geçersiz — ekran sebebini yazar); ağ/sunucu hatası
 * FIRLATIR, çünkü "proje yok" ile "sunucuya ulaşılamadı" farklı sonuçlar.
 */
export async function getProjectSummary(
  projectId: number,
  signal?: AbortSignal,
): Promise<ProjectSummary | null> {
  try {
    const { server } = await getProjectDetail(projectId, signal)
    return { id: server.id, name: server.name, pId: server.pId }
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND) return null
    throw error
  }
}

export function getProjectUnits(projectId: number): Promise<Sourced<ProjectUnitRow[]>> {
  if (isEndpointImplemented('projectUnits')) {
    throw new Error('getProjectUnits: uç bağlandı ama gövdesi yazılmadı.')
  }

  return Promise.resolve(mockedData(() => buildMockProjectUnits(projectId)))
}

export function getProjectHistory(projectId: number): Promise<Sourced<ProjectHistoryRow[]>> {
  if (isEndpointImplemented('projectHistory')) {
    throw new Error('getProjectHistory: uç bağlandı ama gövdesi yazılmadı.')
  }

  return Promise.resolve(mockedData(() => buildMockProjectHistory(projectId)))
}

/**
 * Projenin evrakları. Kaynak, Evraklar ekranının BELLEKTEKİ deposuyla AYNI
 * (`documentsMock`): "yüklenen evrak hem projenin evrak listesine hem genel
 * Evraklar ekranına yansır" (gereksinim 12) ancak tek depo varsa doğru olur.
 * İki ayrı mock tutulsaydı aynı evrak bir ekranda görünüp öbüründe kaybolurdu.
 */
export function getProjectDocuments(projectId: number): Promise<Sourced<ProjectDocumentRow[]>> {
  if (isEndpointImplemented('projectDocuments')) {
    throw new Error('getProjectDocuments: uç bağlandı ama gövdesi yazılmadı.')
  }

  return Promise.resolve(mockedData(() => buildMockProjectDocuments(projectId)))
}

export function getProjectPolicies(projectId: number): Promise<Sourced<ProjectPolicyRow[]>> {
  if (isEndpointImplemented('projectPolicies')) {
    throw new Error('getProjectPolicies: uç bağlandı ama gövdesi yazılmadı.')
  }

  return Promise.resolve(mockedData(() => buildMockProjectPolicies(projectId)))
}

export type ProjectDecision = 'approve' | 'reject' | 'requestRevision'

/**
 * Gerekçe zorunlu olan işlemler (KK-10); onay gerekçe istemez. Ayrı bir TİP
 * olarak duruyor ki gerekçe diyaloğunun metinleri yalnız bu ikisi için
 * tanımlansın — `ProjectDecision` ile yazılsaydı 'approve' için de bir metin
 * uydurmak gerekirdi.
 */
export type ReasonRequiredDecision = Exclude<ProjectDecision, 'approve'>

export const DECISIONS_REQUIRING_REASON: ReasonRequiredDecision[] = ['reject', 'requestRevision']

export function requiresReason(decision: ProjectDecision): decision is ReasonRequiredDecision {
  return DECISIONS_REQUIRING_REASON.some((candidate) => candidate === decision)
}

export const DECISION_RESULT_STATUS: Record<ProjectDecision, ProjectDetailStatus> = {
  approve: 'onaylanan',
  reject: 'reddedilen',
  requestRevision: REVISION_REQUESTED_STATUS,
}

export type ProjectDecisionResult =
  | {
      ok: true
      status: ProjectDetailStatus
      /** Yalnız onayda üretilir (KK-11); diğer işlemlerde `null`. */
      approvalCode: string | null
      /** Kayıt gerçekten sunucuya yazıldı mı. Bugün her zaman `false`. */
      isPersisted: boolean
    }
  | { ok: false; reason: 'unimplemented' }

/**
 * Onay / ret / revizyon. Uç YOK: geliştirmede sonucu taklit eder ve çağıran
 * `isPersisted: false` görüp uyarıyı gösterir, üretimde işlemi hiç yapmadan
 * `unimplemented` döner — sahte bir "onaylandı" bildirimi üretmek, kullanıcıya
 * yapılmamış bir işi yapılmış göstermek olurdu.
 */
export function submitProjectDecision(
  projectId: number,
  decision: ProjectDecision,
): Promise<ProjectDecisionResult> {
  if (isEndpointImplemented('projectDecision')) {
    throw new Error('submitProjectDecision: uç bağlandı ama gövdesi yazılmadı.')
  }

  const simulated = mockedData(() => ({
    ok: true as const,
    status: DECISION_RESULT_STATUS[decision],
    approvalCode: decision === 'approve' ? `ONY-${projectId}` : null,
    isPersisted: false,
  }))

  if (simulated.source === 'unavailable') {
    return Promise.resolve({ ok: false, reason: 'unimplemented' })
  }

  return Promise.resolve(simulated.data)
}

export type ProjectFileKind = 'zpd' | 'pdfReport'

const FILE_KIND_ENDPOINTS = {
  zpd: 'projectZpdFile',
  pdfReport: 'projectPdfReport',
} as const

export type ProjectFileDownload =
  | { ok: true; fileName: string; url: string }
  | { ok: false; reason: 'unimplemented' }

/**
 * `.zpd` / DWG / PDF indirme. Üçünün de ucu yok ve GELİŞTİRMEDE DE sahte dosya
 * ÜRETİLMİYOR: indirilen bozuk bir dosya, ekrandaki mock bir değerden çok daha
 * uzun süre gerçek sanılır (kullanıcının diskinde kalır). Çağıran `ok: false`
 * görüp ucun eksik olduğunu SÖYLER.
 */
export function requestProjectFile(kind: ProjectFileKind): Promise<ProjectFileDownload> {
  if (isEndpointImplemented(FILE_KIND_ENDPOINTS[kind])) {
    throw new Error('requestProjectFile: uç bağlandı ama gövdesi yazılmadı.')
  }

  return Promise.resolve({ ok: false, reason: 'unimplemented' })
}
