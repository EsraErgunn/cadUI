import type {
  CreatePolicyPayload,
  InsuranceCompany,
  PolicyAgency,
  PolicyMethod,
} from './policies'

/**
 * Poliçe verisinin BELLEKTEKİ kaynağı. Sunucu tarafı yazılana kadar tek depo
 * burası: oluşturulan poliçe proje detayının "Poliçe Bilgileri" sekmesine
 * gerçekten düşüyor ama SAYFA YENİLENİNCE KAYBOLUYOR.
 *
 * Poliçe listesi TOHUMLANMIYOR: depo boş başlıyor. Uydurma poliçeler
 * tohumlansaydı proje detayı, sunucuda karşılığı olmayan kayıtları gerçek
 * poliçeymiş gibi listelerdi — bugün orada dürüst bir "kayıt bulunamadı"
 * yazıyor ve bu doğru.
 */

/**
 * Sigorta şirketleri gereksinim belgesindeki dört isim. Acente adları ise
 * UYDURULMADI: gerçek acente listesi analistten alınacak, o yüzden adların
 * örnek olduğu adın kendisinden anlaşılıyor.
 */
const INSURANCE_COMPANY_NAMES = ['Anadolu Sigorta', 'Aksigorta', 'Allianz', 'Mapfre']

/** Her şirkete kaç örnek acente: liste kutusunun dolu hâli görünsün yeter. */
const AGENCIES_PER_COMPANY = 2

const MOCK_INSURANCE_COMPANIES: InsuranceCompany[] = INSURANCE_COMPANY_NAMES.map(
  (name, index) => ({ id: index + 1, name }),
)

function buildAgencies(): PolicyAgency[] {
  const agencies: PolicyAgency[] = []

  for (const company of MOCK_INSURANCE_COMPANIES) {
    for (let slot = 1; slot <= AGENCIES_PER_COMPANY; slot += 1) {
      agencies.push({
        id: agencies.length + 1,
        insuranceCompanyId: company.id,
        name: `${company.name} — Örnek Acente ${slot}`,
      })
    }
  }

  return agencies
}

const MOCK_AGENCIES = buildAgencies()

export function getMockInsuranceCompanies(): InsuranceCompany[] {
  return MOCK_INSURANCE_COMPANIES
}

export function getMockAgencies(): PolicyAgency[] {
  return MOCK_AGENCIES
}

/** Kaydedilen poliçe. Şirket/acente ADI da saklanıyor: listeleyen ekranın
    seçenek listesini yeniden çekmesi gerekmesin (evrak satırındaki desen). */
export interface StoredPolicy {
  id: number
  projectId: number
  method: PolicyMethod
  insuranceCompanyId: number
  insuranceCompanyName: string
  agencyId: number
  agencyName: string
  policyNumber: string
  amount: number
  startDate: string
  endDate: string
}

let mockPolicies: StoredPolicy[] = []

export function getMockPolicies(): StoredPolicy[] {
  return mockPolicies
}

/** Testler arasında paylaşılan depo sızmasın; bir testin oluşturduğu poliçe
    öbüründe "bu numara kayıtlı" hatası doğururdu. */
export function resetMockPolicies(): void {
  mockPolicies = []
}

function nextPolicyId(): number {
  return mockPolicies.reduce((highest, policy) => Math.max(highest, policy.id), 0) + 1
}

function nameOf<TItem extends { id: number; name: string }>(items: TItem[], id: number): string {
  return items.find((item) => item.id === id)?.name ?? ''
}

export function addMockPolicy(payload: CreatePolicyPayload): StoredPolicy {
  const policy: StoredPolicy = {
    id: nextPolicyId(),
    projectId: payload.projectId,
    method: payload.method,
    insuranceCompanyId: payload.insuranceCompanyId,
    insuranceCompanyName: nameOf(MOCK_INSURANCE_COMPANIES, payload.insuranceCompanyId),
    agencyId: payload.agencyId,
    agencyName: nameOf(MOCK_AGENCIES, payload.agencyId),
    policyNumber: payload.policyNumber,
    amount: payload.amount,
    startDate: payload.startDate,
    endDate: payload.endDate,
  }

  // En yeni kayıt üstte: proje detayına dönen kullanıcı poliçesini ilk satırda
  // görsün.
  mockPolicies = [policy, ...mockPolicies]
  return policy
}
