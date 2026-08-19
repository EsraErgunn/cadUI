import type {
  CreatePolicyPayload,
  InsuranceCompany,
  PolicyAgency,
  PolicyMethod,
  PolicyRow,
} from './policies'
import type { ProjectSummary } from './projectDetailTypes'
import { getMockProjectSeeds, type MockProjectSeed } from './projectsMock'

/**
 * Poliçe verisinin BELLEKTEKİ kaynağı. Sunucu tarafı yazılana kadar tek depo
 * burası: oluşturulan poliçe hem Poliçeler listesine hem proje detayının
 * "Poliçe Bilgileri" sekmesine gerçekten düşüyor ama SAYFA YENİLENİNCE
 * KAYBOLUYOR.
 *
 * Depo artık TOHUMLANIYOR (K69): poliçe listesi ekranı geldi ve boş depoyla o
 * ekranın filtresi/sıralaması/sayfalaması hiç denenemezdi. Tohumlar evrak
 * mock'uyla aynı kaynaktan (`getMockProjectSeeds`) geliyor ki satırdaki "Proje
 * Adı" bağlantısı proje listesinde bulunmayan bir kimliğe gitmesin.
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

/**
 * Kaydedilen poliçe. Şirket/acente ADI da saklanıyor: listeleyen ekranın
 * seçenek listesini yeniden çekmesi gerekmesin (evrak satırındaki desen).
 *
 * Proje künyesi de burada: poliçe listesi "Proje Adı" sütununu gösteriyor ve
 * kimlikten ada inen tek yol mock tohumlarıydı — sunucudaki bir projenin
 * poliçesi o yolla uydurma bir projenin adıyla listelenirdi (K63).
 */
export interface StoredPolicy {
  id: number
  projectId: number
  projectName: string | null
  projectPId: string | null
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

/** Tohum poliçe numarası: gerçek bir numara biçimi taklit edilmiyor, örnek
    olduğu önekinden okunuyor. */
const SEED_NUMBER_PREFIX = 'ORNEK-POL'

/** Projeye kaç poliçe düştüğü. Sıfır DA var: poliçesiz projede detay sekmesinin
    boş hâli de görünsün (evrak mock'undaki `DOCUMENT_COUNTS` deseni). */
const POLICY_COUNTS = [1, 0, 2, 1, 0, 1, 2, 0]

/** Teminat tutarları; hepsi aynı olsaydı "Tutar" sütunu biçimlendirmeyi hiç
    sınamazdı. */
const SEED_AMOUNTS = [125_000, 250_000, 480_000, 750_000, 1_200_000, 2_400_000]

const DAY_MS = 24 * 60 * 60 * 1000
const MOCK_BUILT_AT = Date.now()

/** Poliçe başlangıçları son yarım yıla dağılıyor; bitiş bir yıl sonrası. */
const START_DAY_OFFSETS = [4, 19, 38, 61, 95, 130, 166]
const POLICY_TERM_DAYS = 365

/** `yyyy-aa-gg` — poliçe tarihleri saat taşımıyor (`CreatePolicyPayload`). */
function toPlainDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function buildSeedPolicy(project: MockProjectSeed, index: number, id: number): StoredPolicy {
  const company = MOCK_INSURANCE_COMPANIES[index % MOCK_INSURANCE_COMPANIES.length]
  const agency = MOCK_AGENCIES.filter((item) => item.insuranceCompanyId === company.id)[
    index % AGENCIES_PER_COMPANY
  ]
  const startedAt = MOCK_BUILT_AT - START_DAY_OFFSETS[index % START_DAY_OFFSETS.length] * DAY_MS

  return {
    id,
    projectId: project.id,
    projectName: project.name,
    projectPId: project.pId,
    method: 'manual',
    insuranceCompanyId: company.id,
    insuranceCompanyName: company.name,
    agencyId: agency.id,
    agencyName: agency.name,
    policyNumber: `${SEED_NUMBER_PREFIX}-${String(id).padStart(4, '0')}`,
    amount: SEED_AMOUNTS[index % SEED_AMOUNTS.length],
    startDate: toPlainDate(startedAt),
    endDate: toPlainDate(startedAt + POLICY_TERM_DAYS * DAY_MS),
  }
}

function buildMockPolicies(): StoredPolicy[] {
  const policies: StoredPolicy[] = []
  let id = 1

  getMockProjectSeeds().forEach((project, projectIndex) => {
    const count = POLICY_COUNTS[projectIndex % POLICY_COUNTS.length]

    for (let offset = 0; offset < count; offset += 1) {
      policies.push(buildSeedPolicy(project, projectIndex + offset, id))
      id += 1
    }
  })

  return policies
}

/** Tembel kurulum: modül yüklenirken değil ilk istendiğinde — testler
    `resetMockPolicies` ile temiz bir depoyla başlayabilsin. */
let mockPolicies: StoredPolicy[] | null = null

export function getMockPolicies(): StoredPolicy[] {
  mockPolicies ??= buildMockPolicies()
  return mockPolicies
}

/** Testler arasında paylaşılan depo sızmasın; bir testin oluşturduğu poliçe
    öbüründe "bu numara kayıtlı" hatası doğururdu. */
export function resetMockPolicies(): void {
  mockPolicies = null
}

function nextPolicyId(policies: StoredPolicy[]): number {
  return policies.reduce((highest, policy) => Math.max(highest, policy.id), 0) + 1
}

function nameOf<TItem extends { id: number; name: string }>(items: TItem[], id: number): string {
  return items.find((item) => item.id === id)?.name ?? ''
}

/**
 * Proje künyesi GERÇEK uçtan geliyor (`ProjectSummary`); kimliğe denk gelen
 * tohumdan doldurulsaydı sunucudaki bir projenin poliçesi uydurma bir projenin
 * adıyla listelenirdi — evrak tarafında düzeltilen tuzağın aynısı (K63).
 */
export function addMockPolicy(
  payload: CreatePolicyPayload,
  project?: ProjectSummary,
): StoredPolicy {
  const policies = getMockPolicies()
  const policy: StoredPolicy = {
    id: nextPolicyId(policies),
    projectId: payload.projectId,
    projectName: project?.name ?? null,
    projectPId: project?.pId ?? null,
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
  policies.unshift(policy)
  return policy
}

/** Poliçeyi depodan düşürür; kayıt yoksa sessizce geçer (silinen bir şeyi
    tekrar silmek hata değil). */
export function removeMockPolicy(policyId: number): void {
  const policies = getMockPolicies()
  const index = policies.findIndex((policy) => policy.id === policyId)
  if (index !== -1) policies.splice(index, 1)
}

/** Listenin satır şekli. Depo alanlarının hepsi ekranda görünmüyor (şirket ve
    acente KİMLİĞİ satırda işe yaramıyor), o yüzden dönüşüm burada. */
export function getMockPolicyRows(): PolicyRow[] {
  return getMockPolicies().map((policy) => ({
    id: policy.id,
    policyNumber: policy.policyNumber,
    insuranceCompanyId: policy.insuranceCompanyId,
    insuranceCompanyName: policy.insuranceCompanyName,
    agencyName: policy.agencyName,
    method: policy.method,
    amount: policy.amount,
    startDate: policy.startDate,
    endDate: policy.endDate,
    projectId: policy.projectId,
    projectName: policy.projectName,
    projectPId: policy.projectPId,
  }))
}
