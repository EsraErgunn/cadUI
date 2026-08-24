import { z } from 'zod'

import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { requestJson, requestVoid } from './http'
import { pagedResultSchema, type PagedResult, type SortDirection } from './listQuery'
import { mockedData, serverData, type Sourced } from './mockGate'
import {
  addMockPolicy,
  getMockAgencies,
  getMockPolicies,
  getMockPolicyRows,
  removeMockPolicy,
} from './policiesMock'
import { queryPolicyList } from './policyListQuery'
import type { ProjectSummary } from './projectDetailTypes'
import { isEndpointImplemented } from './unimplementedEndpoints'

/**
 * API SÖZLEŞMESİ — Poliçe oluşturma.
 *
 * SUNUCUDA HİÇBİR UCU YOK: ne sigorta şirketi, ne acente, ne poliçe kaydı.
 * `Policy` entity'si veritabanında VAR (ProjectUnit'e bağlı) ama controller'ı
 * yok. Uçları yazmak backend'in işi; bu modül ekranın bağlandığı yüzeyi
 * tanımlar, gövdeyi `policiesMock.ts` besler. Uçlar açılınca çağıranlar
 * değişmez, yalnız bu dosyanın gövdesi gerçek isteğe döner —
 * `unimplementedEndpoints.ts`'ten satır silinince buradaki
 * `isEndpointImplemented` çağrısı derleme hatası verir.
 *
 * Beklenen sözleşme taslağı: docs/api-eksikleri-policeler.md
 */

/**
 * `PolicyDto` — liste ve tekil detay AYNI gövdeyi döndürüyor.
 *
 * Alanların çoğu opsiyonel: poliçe birime bağlı ve birim silinmiş olabiliyor
 * (`isUnitDeleted`), tutar/tarih de girilmemiş olabiliyor. Zorunlu tutmak, yarım
 * doldurulmuş tek bir kayıt yüzünden listeyi sınırda öldürürdü.
 */
const policyDtoSchema = z.object({
  id: z.number().int().positive(),
  projectId: z.number().int(),
  projectUnitId: z.number().int().nullish(),
  unitNumber: z.string().nullish(),
  insuranceCompanyId: z.number().int().nullish(),
  insuranceCompanyTitle: z.string().nullish(),
  policyNumber: z.string().nullish(),
  amount: z.number().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  isActive: z.boolean().nullish(),
  isUnitDeleted: z.boolean().nullish(),
})

export type PolicyDto = z.infer<typeof policyDtoSchema>

const policyPageSchema = pagedResultSchema(policyDtoSchema)

/** Proje detayındaki sekme sayfalama istemiyor; üst sınır listeyi kesmesin diye yüksek. */
const PROJECT_POLICY_PAGE_SIZE = 100

/**
 * Bir PROJENİN poliçeleri — GERÇEK uç (`GET /api/policies?ProjectId=`).
 *
 * `excludeUnitDeleted` GÖNDERİLMİYOR: silinmiş birime bağlı poliçe de listede
 * kalmalı, yoksa kayıt sessizce kaybolur ve kullanıcı sildiği birimle birlikte
 * poliçesinin de gittiğini fark etmez. Satır `isUnitDeleted` taşıyor, ayrımı
 * arayüz yapar.
 */
export async function listProjectPolicies(
  projectId: number,
  signal?: AbortSignal,
): Promise<PolicyDto[]> {
  const search = new URLSearchParams({
    ProjectId: String(projectId),
    Page: '1',
    PageSize: String(PROJECT_POLICY_PAGE_SIZE),
  })

  const page = await requestJson(
    { method: 'GET', path: `/api/policies?${search.toString()}`, signal },
    policyPageSchema,
  )

  return page.items
}

/** Tekil poliçe (`GET /api/policies/{id}`); güncelleme ekranı gelince formu besleyecek. */
export function getPolicy(policyId: number, signal?: AbortSignal): Promise<PolicyDto> {
  return requestJson({ method: 'GET', path: `/api/policies/${policyId}`, signal }, policyDtoSchema)
}

/**
 * Poliçe güncelleme (`PUT /api/policies/{id}`).
 *
 * Ekranı HENÜZ YOK; fonksiyon sözleşmeyi bağlamak için burada — yol ve gövde
 * biçimi bir yerde yazılı olmazsa ekranı yazan kişi yeniden keşfetmek zorunda
 * kalır. Gövde birim TAŞIMAZ: `PolicyUpdateDto` birimi almıyor, poliçe başka
 * bir birime taşınamıyor.
 *
 * TODO(esra): güncelleme ekranı yazılınca çağıran buraya bağlanacak.
 */
export interface UpdatePolicyPayload {
  insuranceCompanyId: number | null
  policyNumber: string | null
  amount: number | null
  startDate: string | null
  endDate: string | null
}

export function updatePolicy(
  policyId: number,
  payload: UpdatePolicyPayload,
  signal?: AbortSignal,
): Promise<void> {
  return requestVoid({
    method: 'PUT',
    path: `/api/policies/${policyId}`,
    rawJsonBody: JSON.stringify(payload),
    signal,
  })
}

export interface InsuranceCompany {
  id: number
  name: string
}

export interface PolicyAgency {
  id: number
  /** Acente listesi seçilen şirkete bağlı (gereksinim 16); süzme bu alanla. */
  insuranceCompanyId: number
  name: string
}

/**
 * Poliçe yöntemi. Bugün tek değer var ama dar birleşim olarak duruyor: sigorta
 * şirketi servisleri üzerinden otomatik poliçe ileride eklenecek ve o gün
 * eklenecek kod, seçeneği listeleyen her yeri derleme hatasıyla gösterecek.
 */
export const POLICY_METHODS = ['manual'] as const
export type PolicyMethod = (typeof POLICY_METHODS)[number]

export const POLICY_METHOD_LABELS: Record<PolicyMethod, string> = {
  manual: 'Manuel Poliçe',
}

export interface CreatePolicyPayload {
  projectId: number
  /** Poliçenin bağlandığı birim; sunucuda kayıt proje değil BİRİM başına. */
  projectUnitId: number
  method: PolicyMethod
  insuranceCompanyId: number
  agencyId: number
  policyNumber: string
  /** Kuruş DAHİL tutar (2 ondalık); biçimlendirme gösterim katmanında. */
  amount: number
  /** yyyy-aa-gg — saat dilimi kaymasın diye ISO damgası değil, düz tarih. */
  startDate: string
  endDate: string
}

export type PolicyCreateResult =
  | { ok: true; policyId: number }
  | { ok: false; reason: 'duplicateNumber' | 'unavailable' }

export const POLICY_PAGE_SIZE = 30

export const POLICY_SORT_KEYS = ['startDate', 'policyNumber'] as const
export type PolicySortKey = (typeof POLICY_SORT_KEYS)[number]

/** En yeni poliçe üstte: listenin en sık beklenen açılış sırası. */
export const DEFAULT_POLICY_SORT_KEY: PolicySortKey = 'startDate'
export const DEFAULT_POLICY_SORT_DIR: SortDirection = 'desc'

/** Poliçeler listesinin satırı. Şirket KİMLİĞİ de var: filtre kimliğe göre
    süzüyor, ad tek başına yetmez (evrak satırındaki `projectFirmId` deseni). */
export interface PolicyRow {
  id: number
  policyNumber: string
  insuranceCompanyId: number
  insuranceCompanyName: string
  agencyName: string
  method: PolicyMethod
  /** Kuruş DAHİL teminat tutarı; biçimlendirme gösterim katmanında. */
  amount: number
  startDate: string
  endDate: string
  projectId: number
  /** Künyesi çözülemeyen kayıtta `null` — uydurma proje adı yazılmaz (K63). */
  projectName: string | null
  projectPId: string | null
}

export interface PolicyListQuery {
  /** Arama poliçe numarası VE proje adı üzerinde: iki ayrı kutu, tek listede
      kullanıcıya iki arama alanı gösterirdi. */
  search: string
  insuranceCompanyId: number | null
  page: number
  pageSize: number
  sortBy: PolicySortKey
  sortDir: SortDirection
}

/**
 * Poliçeler listesi — bütün projelerin poliçeleri. Sayfalama, filtre ve
 * sıralama sunucu tarafı sözleşmesine göre çalışır; bugün bu işi mock yapıyor.
 *
 * `Sourced` zarfı ŞART (K51): üretim derlemesinde uydurma poliçe listesi
 * gösterilseydi bir demoda gerçek sanılırdı — orada ekran "kaynağı yok" der.
 */
export async function listPolicies(
  query: PolicyListQuery,
  signal?: AbortSignal,
): Promise<Sourced<PagedResult<PolicyRow>>> {
  if (isEndpointImplemented('policyList')) {
    throw new Error('listPolicies: uç bağlandı ama gövdesi yazılmadı.')
  }

  await delay(MOCK_LATENCY_MS, signal)
  return mockedData(() => queryPolicyList(getMockPolicyRows(), query))
}

/** Poliçe silme — GERÇEK uç (`DELETE /api/policies/{id}`). */
export async function deletePolicy(policyId: number, signal?: AbortSignal): Promise<void> {
  await requestVoid({ method: 'DELETE', path: `/api/policies/${policyId}`, signal })

  // Bellekteki depo da temizleniyor: poliçe LİSTESİ ekranı hâlâ mock'tan
  // besleniyor (uç tüm projeleri listeleyemiyor) ve silinen kayıt orada
  // durmaya devam ederse kullanıcı silmenin işe yaramadığını sanır.
  removeMockPolicy(policyId)
}

/**
 * `GET /api/insurance-companies` — GERÇEK uç.
 *
 * Yol tireli. Bir süre `/api/insurancecompanies` varsayılıyordu ve o adres 404
 * dönüyordu; uç açıldığında bile liste boş kalırdı.
 *
 * `Sourced` zarfı DURUYOR: çağıranlar (poliçe sihirbazı) kaynağa göre farklı
 * yüzey çiziyor ve zarfı kaldırmak onları da değiştirmek olurdu. Artık her
 * zaman `server`.
 */
const insuranceCompanyDtoSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    title: z.string(),
  }),
)

export async function listInsuranceCompanies(
  signal?: AbortSignal,
): Promise<Sourced<InsuranceCompany[]>> {
  const dto = await requestJson(
    { method: 'GET', path: '/api/insurance-companies', signal },
    insuranceCompanyDtoSchema,
  )

  return serverData(dto.map((company) => ({ id: company.id, name: company.title })))
}

/** Seçilen sigorta şirketinin acenteleri (gereksinim 16). */
export async function listPolicyAgencies(
  insuranceCompanyId: number,
  signal?: AbortSignal,
): Promise<Sourced<PolicyAgency[]>> {
  if (isEndpointImplemented('policyAgencies')) {
    throw new Error('listPolicyAgencies: uç bağlandı ama gövdesi yazılmadı.')
  }

  await delay(MOCK_LATENCY_MS, signal)
  return mockedData(() =>
    getMockAgencies().filter((agency) => agency.insuranceCompanyId === insuranceCompanyId),
  )
}

/**
 * Poliçe numarası benzersizliği (KK-19). Sunucuda kontrol ucu YOK; denetim
 * bugün istemcide, bellekteki depoya karşı yapılıyor (K30'un deseni).
 *
 * TEK fonksiyon olması bilinçli: hem "İleri" doğrulaması hem kayıt bu kapıdan
 * geçiyor. Uç açıldığında gövdesi 409'a çevrilecek ve iki çağıran da değişmeden
 * doğru davranacak — kontrol iki yere kopyalansaydı biri güncellenmeden kalırdı.
 */
export function isPolicyNumberTaken(policyNumber: string): boolean {
  const normalized = policyNumber.trim().toLocaleUpperCase('tr-TR')

  return getMockPolicies().some(
    (policy) => policy.policyNumber.toLocaleUpperCase('tr-TR') === normalized,
  )
}

/**
 * Poliçe kaydı. Depo BELLEKTE: kayıt gerçekten proje detayının "Poliçe
 * Bilgileri" sekmesine düşüyor ama sayfa yenilenince kayboluyor. Çağıran bunu
 * kullanıcıya SÖYLER (K58'in `isPersisted: false` deseni).
 *
 * Üretim derlemesinde hiç yazılmaz (`unavailable`): gösterilmeyecek bir depoya
 * kayıt atmak, kullanıcıya yapılmamış bir işi yapılmış göstermek olurdu.
 */
export async function createProjectPolicy(
  payload: CreatePolicyPayload,
  /**
   * Proje künyesi. Uca GİTMEZ (sunucu kimliği zaten gövdede görüyor); bellekteki
   * depo poliçe listesinde proje adını gösterebilsin diye alınıyor — evrak
   * kaydındaki `ProjectSummary` deseni. Uç açılınca bu parametre düşer.
   */
  project: ProjectSummary,
  signal?: AbortSignal,
): Promise<PolicyCreateResult> {
  if (isEndpointImplemented('policyCreate')) {
    throw new Error('createProjectPolicy: uç bağlandı ama gövdesi yazılmadı.')
  }

  // Numara kontrolü gecikmeden ÖNCE: uç geldiğinde bu dal 409 yanıtına
  // dönüşecek, yani sunucuya gidip dönmüş olacak.
  if (isPolicyNumberTaken(payload.policyNumber)) {
    return { ok: false, reason: 'duplicateNumber' }
  }

  await delay(MOCK_LATENCY_MS, signal)

  const saved = mockedData(() => addMockPolicy(payload, project))
  if (saved.source === 'unavailable') return { ok: false, reason: 'unavailable' }

  return { ok: true, policyId: saved.data.id }
}
