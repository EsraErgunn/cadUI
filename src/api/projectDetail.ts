import { z } from 'zod'

import { getDocumentTypes } from './documentTypes'
import { ApiError, requestJson } from './http'
import { isMockDataAllowed, mockedData, serverData, type Sourced } from './mockGate'
import {
  buildMockProjectDocuments,
  buildMockProjectExtras,
  buildMockProjectPolicies,
} from './projectDetailMock'
import {
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
 *   { id, name, description, buildingCode, projectFirmAuthorizationId,
 *     gasDistributionFirmId, cityId, cityName, districtId, districtName,
 *     addressLine, blockLotParcel, createdAt, updatedAt }
 *
 * Bağlı olan diğer GERÇEK uçlar:
 *   GET  /api/projects/{id}/history → OperationHistoryDto[]
 *   POST /api/projects/{id}/approve
 *   POST /api/projects/{id}/reject  → { description }
 *
 * Ekranın istediği geri kalan her şeyin (durum, tesisat no, proje/ısınma tipi,
 * onay bilgileri, teknik değerler, birim/cihaz, evrak, poliçe,
 * .zpd / DWG / PDF indirme) uçta karşılığı YOK. Tamamı
 * `unimplementedEndpoints.ts` içinde bayraklı; oradaki satır silinince buradaki
 * `isEndpointImplemented` çağrısı DERLEME HATASI verir (doğrulandı).
 */

const projectDetailDtoSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullish(),
  buildingCode: z.string().nullish(),
  cityName: z.string().nullish(),
  districtName: z.string().nullish(),
  addressLine: z.string().nullish(),
  blockLotParcel: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Liste eşlemesiyle AYNI kural (projects.ts): bina kodu boşsa kimlik yedeğe düşer. */
function toProjectPId(raw: { id: number; buildingCode?: string | null }): string {
  const buildingCode = raw.buildingCode?.trim()
  return buildingCode === undefined || buildingCode === '' ? String(raw.id) : buildingCode
}

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === '' ? null : trimmed
}

/**
 * Mock durum kimliğe göre dönüyor: hepsi "Taslak" olsaydı onay aksiyonlarının
 * etkin hâli ve onay kartının dolu hâli hiç görülemezdi (KK-2, KK-11).
 *
 * BİLİNEN TUTARSIZLIK: durumun GERÇEK kaynağı liste ucu — `GET /api/projects`
 * satır başına `status` döndürüyor ve `projects.ts` onu `ProjectListItem.status`
 * olarak taşıyor. `GET /api/projects/{id}` ise durumu HİÇ döndürmüyor, bu yüzden
 * detay ekranı aynı proje için listeden farklı (ve geliştirmede uydurma) bir
 * durum gösterebilir. Karar düğmeleri bu değere GÜVENMİYOR: sayfa yalnız durumu
 * gerçekten taslak olan kaydı kilitler (ProjectDetailPage → isDraft).
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

/**
 * `GET /api/projects/{id}/units` — GERÇEK uç.
 *
 * Satırlar çizimden senkronlanıyor (`unitReport`), bu yüzden neredeyse her alan
 * opsiyonel: kullanıcı sayacı çizmiş ama abone adını yazmamış olabilir. Şema
 * bunu `nullish` ile karşılıyor — zorunlu tutulsaydı eksik doldurulmuş tek bir
 * birim yüzünden tablo hiç açılmazdı.
 */
const projectUnitDtoSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    unitNumber: z.string().nullish(),
    subscriberName: z.string().nullish(),
    subscriberNo: z.string().nullish(),
    meterClassLabel: z.string().nullish(),
    area: z.number().nullish(),
    flowCubicMeterPerHour: z.number().nullish(),
    pressureMbar: z.number().nullish(),
    pipeTypeName: z.string().nullish(),
    devices: z.array(
      z.object({
        id: z.number().int().positive(),
        deviceType: z.string().nullish(),
        brand: z.string().nullish(),
        model: z.string().nullish(),
        capacity: z.string().nullish(),
        flowCubicMeterPerHour: z.number().nullish(),
        flueLabel: z.string().nullish(),
      }),
    ),
  }),
)

export async function getProjectUnits(
  projectId: number,
  signal?: AbortSignal,
): Promise<Sourced<ProjectUnitRow[]>> {
  const dto = await requestJson(
    { method: 'GET', path: `/api/projects/${projectId}/units`, signal },
    projectUnitDtoSchema,
  )

  return serverData(
    dto.map((unit) => ({
      id: unit.id,
      unitNumber: toNullable(unit.unitNumber),
      subscriberName: toNullable(unit.subscriberName),
      subscriberNo: toNullable(unit.subscriberNo),
      meterLabel: toNullable(unit.meterClassLabel),
      flowCubicMeterPerHour: unit.flowCubicMeterPerHour ?? null,
      pressureMbar: unit.pressureMbar ?? null,
      areaSquareMeters: unit.area ?? null,
      pipeType: toNullable(unit.pipeTypeName),
      devices: unit.devices.map((device) => ({
        id: device.id,
        name: toNullable(device.deviceType),
        capacity: toNullable(device.capacity),
        flowCubicMeterPerHour: device.flowCubicMeterPerHour ?? null,
        brand: toNullable(device.brand),
        model: toNullable(device.model),
        flueType: toNullable(device.flueLabel),
      })),
    })),
  )
}

/**
 * `GET /api/projects/{id}/history` — `OperationHistory` satırları.
 *
 * DTO'da `id` ve dosya türü YOK: satır anahtarı damga + kod + sıradan
 * kuruluyor, "Dosya" sütunu boş çizer. Dizi indeksini TEK BAŞINA anahtar
 * yapmak, sunucu sırayı değiştirdiğinde React'in yanlış satırı yeniden
 * kullanmasına yol açardı.
 */
const historyDtoSchema = z.array(
  z.object({
    operationCode: z.string().nullish(),
    operationName: z.string().nullish(),
    description: z.string().nullish(),
    roleSnapshot: z.string().nullish(),
    userFullName: z.string().nullish(),
    createdAt: z.string(),
  }),
)

const UNKNOWN_USER_LABEL = 'Bilinmeyen kullanıcı'

export async function getProjectHistory(
  projectId: number,
  signal?: AbortSignal,
): Promise<Sourced<ProjectHistoryRow[]>> {
  const dto = await requestJson(
    { method: 'GET', path: `/api/projects/${projectId}/history`, signal },
    historyDtoSchema,
  )

  return serverData(
    dto.map((row, order) => ({
      id: `${row.createdAt}-${row.operationCode ?? ''}-${order}`,
      fileType: null,
      createdAt: row.createdAt,
      userName: toNullable(row.userFullName) ?? UNKNOWN_USER_LABEL,
      roleSnapshot: toNullable(row.roleSnapshot) ?? '',
      // Kod ham geçiyor: bilinen kodda rozet kendi etiketini bulur, bilinmeyende
      // sunucunun `operationName`'ine düşer (bkz. OperationBadge).
      operation: toNullable(row.operationCode) ?? '',
      operationName: toNullable(row.operationName),
      description: toNullable(row.description),
    })),
  )
}

/**
 * Projenin evrakları. Kaynak, Evraklar ekranının BELLEKTEKİ deposuyla AYNI
 * (`documentsMock`): "yüklenen evrak hem projenin evrak listesine hem genel
 * Evraklar ekranına yansır" (gereksinim 12) ancak tek depo varsa doğru olur.
 * İki ayrı mock tutulsaydı aynı evrak bir ekranda görünüp öbüründe kaybolurdu.
 */
export async function getProjectDocuments(
  projectId: number,
): Promise<Sourced<ProjectDocumentRow[]>> {
  if (isEndpointImplemented('projectDocuments')) {
    throw new Error('getProjectDocuments: uç bağlandı ama gövdesi yazılmadı.')
  }

  // Tip etiketleri GERÇEK uçtan; yalnız mock satırların çizileceği derlemede
  // isteniyor, üretimde bölüm zaten veri göstermiyor.
  if (!isMockDataAllowed()) return { source: 'unavailable', data: null }

  const documentTypes = await getDocumentTypes()
  return mockedData(() => buildMockProjectDocuments(projectId, documentTypes))
}

export function getProjectPolicies(projectId: number): Promise<Sourced<ProjectPolicyRow[]>> {
  if (isEndpointImplemented('projectPolicies')) {
    throw new Error('getProjectPolicies: uç bağlandı ama gövdesi yazılmadı.')
  }

  return Promise.resolve(mockedData(() => buildMockProjectPolicies(projectId)))
}

export type ProjectDecision = 'approve' | 'reject'

/**
 * Gerekçe zorunlu olan işlemler (KK-10); onay gerekçe istemez. Ayrı bir TİP
 * olarak duruyor ki gerekçe diyaloğunun metinleri yalnız bunun için
 * tanımlansın — `ProjectDecision` ile yazılsaydı 'approve' için de bir metin
 * uydurmak gerekirdi.
 */
export type ReasonRequiredDecision = Exclude<ProjectDecision, 'approve'>

export const DECISIONS_REQUIRING_REASON: ReasonRequiredDecision[] = ['reject']

export function requiresReason(decision: ProjectDecision): decision is ReasonRequiredDecision {
  return DECISIONS_REQUIRING_REASON.some((candidate) => candidate === decision)
}

export const DECISION_RESULT_STATUS: Record<ProjectDecision, ProjectDetailStatus> = {
  approve: 'onaylanan',
  reject: 'reddedilen',
}

const DECISION_PATHS: Record<ProjectDecision, string> = {
  approve: 'approve',
  reject: 'reject',
}

export interface ProjectDecisionResult {
  status: ProjectDetailStatus
  /** Yalnız onayda üretilir (KK-11); uç döndürmezse `null`. */
  approvalCode: string | null
}

/** Uç onay kodunu döndürebiliyor; gövde boş/farklı gelirse kod yok sayılır. */
const decisionResponseSchema = z.object({ approvalCode: z.string().nullish() })

/**
 * `POST /api/projects/{id}/approve` ve `POST /api/projects/{id}/reject`.
 *
 * Ret gerekçesi gövdede (`{ description }`); onay gövde istemiyor. Hata
 * FIRLATILIR — çağıran (`useProjectDecisions`) yakalayıp bildirimi yazar,
 * çünkü "reddedildi" demek ancak sunucu 2xx döndüyse doğrudur.
 */
export async function submitProjectDecision(
  projectId: number,
  decision: ProjectDecision,
  description: string | null,
): Promise<ProjectDecisionResult> {
  const body = await requestJson(
    {
      method: 'POST',
      path: `/api/projects/${projectId}/${DECISION_PATHS[decision]}`,
      rawJsonBody: decision === 'reject' ? JSON.stringify({ description }) : undefined,
    },
    z.unknown(),
  )

  const parsed = decisionResponseSchema.safeParse(body)

  return {
    status: DECISION_RESULT_STATUS[decision],
    approvalCode: parsed.success ? (parsed.data.approvalCode ?? null) : null,
  }
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
