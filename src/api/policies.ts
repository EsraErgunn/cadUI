import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { mockedData, type Sourced } from './mockGate'
import { addMockPolicy, getMockAgencies, getMockInsuranceCompanies, getMockPolicies } from './policiesMock'
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

  const saved = mockedData(() => addMockPolicy(payload))
  if (saved.source === 'unavailable') return { ok: false, reason: 'unavailable' }

  return { ok: true, policyId: saved.data.id }
}
