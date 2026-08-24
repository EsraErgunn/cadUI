import type { CreatePolicyPayload, InsuranceCompany, PolicyMethod } from './policies'
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

/** Sigorta şirketleri gereksinim belgesindeki dört isim. */
const INSURANCE_COMPANY_NAMES = ['Anadolu Sigorta', 'Aksigorta', 'Allianz', 'Mapfre']

const MOCK_INSURANCE_COMPANIES: InsuranceCompany[] = INSURANCE_COMPANY_NAMES.map(
  (name, index) => ({ id: index + 1, name }),
)

export function getMockInsuranceCompanies(): InsuranceCompany[] {
  return MOCK_INSURANCE_COMPANIES
}

/**
 * Kaydedilen poliçe. Şirket ADI da saklanıyor: listeleyen ekranın seçenek
 * listesini yeniden çekmesi gerekmesin (evrak satırındaki desen).
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
  const startedAt = MOCK_BUILT_AT - START_DAY_OFFSETS[index % START_DAY_OFFSETS.length] * DAY_MS

  return {
    id,
    projectId: project.id,
    projectName: project.name,
    projectPId: project.pId,
    method: 'manual',
    insuranceCompanyId: company.id,
    insuranceCompanyName: company.name,
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
export function addMockPolicy(payload: CreatePolicyPayload, project: ProjectSummary): StoredPolicy {
  const policies = getMockPolicies()
  const policy: StoredPolicy = {
    id: nextPolicyId(policies),
    // Kimlik künyeden: gövde proje kimliği TAŞIMIYOR (sunucu onu birimden
    // türetiyor), bu yüzden depo da çağıranın verdiği künyeden okuyor.
    projectId: project.id,
    projectName: project.name,
    projectPId: project.pId,
    // Sunucuya gitmiyor; depo satırı listede "Yöntem" göstermediği için yalnız
    // geriye dönük uyum adına sabit.
    method: 'manual',
    insuranceCompanyId: payload.insuranceCompanyId,
    insuranceCompanyName: nameOf(MOCK_INSURANCE_COMPANIES, payload.insuranceCompanyId),
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
