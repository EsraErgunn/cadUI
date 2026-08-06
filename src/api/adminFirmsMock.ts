import type {
  GasDistributionFirmDetail,
  GasDistributionFirmPayload,
} from './adminFirmForm'
import type { GasDistributionFirm, GasDistributionFirmQuery } from './adminFirms'
import { includesTr } from './turkishText'

const MOCK_CITIES = [
  'Adana', 'Adıyaman', 'Afyon', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
  'Aydın', 'Balıkesir', 'Bartın', 'Bilecik', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale',
  'Çorum', 'Denizli', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
  'Gaziantep', 'Giresun', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş',
  'Karabük', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kocaeli', 'Konya', 'Kütahya',
]

const NAME_SUFFIXES = ['Doğalgaz Dağıtım A.Ş.', 'Gaz Dağıtım A.Ş.', 'Şehiriçi Doğalgaz A.Ş.']

export const MOCK_FIRM_GROUPS = [
  'Aksa Enerji Grubu',
  'Çalık Enerji Grubu',
  'Enerya Grubu',
  'Kalyon Enerji Grubu',
  'Palen Enerji Grubu',
  'Torunlar Enerji Grubu',
]

export const MOCK_REGIONS = [
  'Akdeniz',
  'Doğu Anadolu',
  'Ege',
  'Güneydoğu Anadolu',
  'İç Anadolu',
  'Karadeniz',
  'Marmara',
]

/** Silinen kayıtları taklit eden düzensiz artışlar — DFirm No bilerek aralıklı. */
const DFIRM_NO_GAPS = [1, 2, 1, 4, 1, 3, 2, 1]
const FIRST_DFIRM_NO = 1204

/** Her 4. kayıt gruba bağlı değil → arayüzde "Grup Adı" sütunu "-" gösterir. */
const UNGROUPED_EVERY = 4

/** Her 3. kayıt açıklamasız → form güncelleme modunda boş opsiyonel alan da denenebilsin. */
const UNDESCRIBED_EVERY = 3

const MOCK_CONTACT_PEOPLE = [
  'Ahmet Yılmaz',
  'Ayşe Demir',
  'Mehmet Kaya',
  'Fatma Şahin',
  'Mustafa Çelik',
]

/** Ham rakam (maskesiz) — arayüz maskeyi core/phone.ts ile kendisi kuruyor. */
const FIRST_MOCK_PHONE = 5321000000
const MOCK_PHONE_STEP = 137

function buildMockPhone(index: number): string {
  return `0${FIRST_MOCK_PHONE + index * MOCK_PHONE_STEP}`
}

function buildMockFirms(): GasDistributionFirmDetail[] {
  const firms: GasDistributionFirmDetail[] = []
  let dfirmNo = FIRST_DFIRM_NO

  for (const [suffixIndex, suffix] of NAME_SUFFIXES.entries()) {
    for (const [cityIndex, city] of MOCK_CITIES.entries()) {
      const index = suffixIndex * MOCK_CITIES.length + cityIndex
      firms.push({
        id: index + 1,
        dfirmNo,
        groupName:
          index % UNGROUPED_EVERY === 0 ? null : MOCK_FIRM_GROUPS[index % MOCK_FIRM_GROUPS.length],
        name: `${city} ${suffix}`,
        region: MOCK_REGIONS[index % MOCK_REGIONS.length],
        description:
          index % UNDESCRIBED_EVERY === 0 ? null : `${city} bölgesi dağıtım firması.`,
        contactPerson: MOCK_CONTACT_PEOPLE[index % MOCK_CONTACT_PEOPLE.length],
        address: `${city} Organize Sanayi Bölgesi No: ${index + 1}`,
        phone: buildMockPhone(index),
      })
      dfirmNo += DFIRM_NO_GAPS[index % DFIRM_NO_GAPS.length]
    }
  }

  return firms
}

/**
 * `let`: ekleme/güncelleme bu diziyi değiştirir, böylece kaydedilen firma liste
 * ekranında ve toplam kayıt adedinde görünür (KK-10). `projectsMock` ile aynı desen.
 */
let mockFirms = buildMockFirms()

function compareFirms(
  left: GasDistributionFirm,
  right: GasDistributionFirm,
  query: GasDistributionFirmQuery,
): number {
  const direction = query.sortDir === 'asc' ? 1 : -1

  if (query.sortKey === 'dfirmNo') {
    return (left.dfirmNo - right.dfirmNo) * direction
  }

  // Grubu olmayan kayıt her iki yönde de sona düşsün — "-" satırları listeyi bölmesin.
  const leftValue = query.sortKey === 'name' ? left.name : left.groupName
  const rightValue = query.sortKey === 'name' ? right.name : right.groupName
  if (leftValue === null) return rightValue === null ? 0 : 1
  if (rightValue === null) return -1

  return leftValue.localeCompare(rightValue, 'tr') * direction
}

function matchesQuery(firm: GasDistributionFirm, query: GasDistributionFirmQuery): boolean {
  if (query.nameQuery !== '' && !includesTr(firm.name, query.nameQuery)) return false
  if (query.groupName !== null && firm.groupName !== query.groupName) return false
  if (query.region !== null && firm.region !== query.region) return false
  return true
}

/**
 * Sunucunun yapacağı işi taklit eder: filtre → sırala → SADECE istenen sayfayı dilimle.
 * Gerçek endpoint geldiğinde çağıran taraf değişmez, yalnız bu dosya silinir.
 */
export function queryMockFirms(query: GasDistributionFirmQuery): {
  items: GasDistributionFirm[]
  totalCount: number
} {
  const matched = mockFirms.filter((firm) => matchesQuery(firm, query))
  const sorted = [...matched].sort((left, right) => compareFirms(left, right, query))
  const offset = (query.page - 1) * query.pageSize

  return {
    items: sorted.slice(offset, offset + query.pageSize),
    totalCount: matched.length,
  }
}

export function findMockFirm(id: number): GasDistributionFirmDetail | null {
  return mockFirms.find((firm) => firm.id === id) ?? null
}

/**
 * Sıradaki uygun numara. Silinen kayıtlar yüzünden numaralar aralıklı olduğu
 * için boşluklar DOLDURULMAZ — en büyüğün bir fazlası verilir (belge: "numaralar
 * yeniden düzenlenmeyecektir").
 */
export function nextMockDfirmNo(): number {
  return mockFirms.reduce((largest, firm) => Math.max(largest, firm.dfirmNo), 0) + 1
}

export function isMockDfirmNoTaken(dfirmNo: number, exceptFirmId: number | null): boolean {
  return mockFirms.some((firm) => firm.dfirmNo === dfirmNo && firm.id !== exceptFirmId)
}

/**
 * Bölge alanı ARAYÜZDEN gelmiyor: form böyle bir alan taşımıyor (belge de
 * tanımlamıyor), gövdeye de konmuyor. Yeni kaydın bölgeyi nasıl alacağı açık
 * soru; mock'un liste şemasını doldurabilmesi için burada sabit bir değer var.
 * TODO(esra): sunucu bölgeyi nasıl belirliyor, backend'e sorulacak.
 */
const MOCK_CREATED_FIRM_REGION = MOCK_REGIONS[0]

function nextMockFirmId(): number {
  return mockFirms.reduce((largest, firm) => Math.max(largest, firm.id), 0) + 1
}

export function createMockFirm(payload: GasDistributionFirmPayload): GasDistributionFirmDetail {
  const created: GasDistributionFirmDetail = {
    ...payload,
    id: nextMockFirmId(),
    region: MOCK_CREATED_FIRM_REGION,
  }

  mockFirms = [...mockFirms, created]
  return created
}

/**
 * Firma No güncellemede salt okunur olduğu için gövdedeki numara mevcut kaydın
 * numarasıyla aynı olmalı; yine de sunucu tarafı kabul edilen tek doğru kaynak,
 * bu yüzden çakışma kontrolü burada da yapılır (çağıran `updateGasDistributionFirm`).
 */
export function updateMockFirm(
  id: number,
  payload: GasDistributionFirmPayload,
): GasDistributionFirmDetail | null {
  const existing = mockFirms.find((firm) => firm.id === id)
  if (existing === undefined) return null

  const updated: GasDistributionFirmDetail = { ...existing, ...payload }
  mockFirms = mockFirms.map((firm) => (firm.id === id ? updated : firm))
  return updated
}
