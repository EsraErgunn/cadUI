import { MOCK_LATENCY_MS, delay } from './adminFirms'
import type { PagedResult, SortDirection } from './listQuery'
import { mockedData, type Sourced } from './mockGate'
import {
  addMockPolicy,
  getMockAgencies,
  getMockInsuranceCompanies,
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

export type PolicyDeleteResult = { ok: true } | { ok: false; reason: 'unavailable' }

/**
 * Poliçe silme. Depo BELLEKTE: satır gerçekten listeden düşer ama sayfa
 * yenilenince tohum listesine dönülür — çağıran bunu kullanıcıya SÖYLER.
 *
 * Üretim derlemesinde hiç silinmez (`unavailable`): gösterilmeyecek bir depodan
 * kayıt düşürmek, kullanıcıya yapılmamış bir işi yapılmış göstermek olurdu.
 */
export async function deletePolicy(
  policyId: number,
  signal?: AbortSignal,
): Promise<PolicyDeleteResult> {
  if (isEndpointImplemented('policyDelete')) {
    throw new Error('deletePolicy: uç bağlandı ama gövdesi yazılmadı.')
  }

  await delay(MOCK_LATENCY_MS, signal)

  const removed = mockedData(() => removeMockPolicy(policyId))
  return removed.source === 'unavailable' ? { ok: false, reason: 'unavailable' } : { ok: true }
}

/**
 * Sigorta şirketleri. `Sourced` zarfı ŞART (K51): sahte liste yalnız geliştirme
 * derlemesinde üretilir — üretimde uydurma şirket adları seçilseydi kullanıcı
 * var olmayan bir şirketle poliçe açardı.
 */
export async function listInsuranceCompanies(
  signal?: AbortSignal,
): Promise<Sourced<InsuranceCompany[]>> {
  if (isEndpointImplemented('insuranceCompanies')) {
    throw new Error('listInsuranceCompanies: uç bağlandı ama gövdesi yazılmadı.')
  }

  await delay(MOCK_LATENCY_MS, signal)
  return mockedData(getMockInsuranceCompanies)
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
