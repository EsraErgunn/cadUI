import type { GasDistributionFirmDetail, GasDistributionFirmPayload } from './adminFirmForm'
import type { GasDistributionFirm } from './adminFirms'
import type { FirmGroup } from './gasFirmDto'

/**
 * Mock kayıt hem liste satırını hem tekil detayı besliyor: liste bölge taşıyor,
 * tekil yanıt taşımıyor, ikisinin birleşimi burada duruyor.
 */
type MockFirm = GasDistributionFirm & GasDistributionFirmDetail

const MOCK_CITIES = [
  'Adana', 'Adıyaman', 'Afyon', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
  'Aydın', 'Balıkesir', 'Bartın', 'Bilecik', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale',
  'Çorum', 'Denizli', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
  'Gaziantep', 'Giresun', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş',
  'Karabük', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kocaeli', 'Konya', 'Kütahya',
]

const NAME_SUFFIXES = ['Doğalgaz Dağıtım A.Ş.', 'Gaz Dağıtım A.Ş.', 'Şehiriçi Doğalgaz A.Ş.']

/** Gerçek uç `{ id, name }` döndürüyor; mock da aynı biçimi taklit ediyor. */
export const MOCK_FIRM_GROUPS: FirmGroup[] = [
  { id: 1, name: 'Aksa Enerji Grubu' },
  { id: 2, name: 'Çalık Enerji Grubu' },
  { id: 3, name: 'Enerya Grubu' },
  { id: 4, name: 'Kalyon Enerji Grubu' },
  { id: 5, name: 'Palen Enerji Grubu' },
  { id: 6, name: 'Torunlar Enerji Grubu' },
]

function findMockGroup(groupId: number | null): FirmGroup | null {
  return MOCK_FIRM_GROUPS.find((group) => group.id === groupId) ?? null
}

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

function buildMockFirms(): MockFirm[] {
  const firms: MockFirm[] = []
  let dfirmNo = FIRST_DFIRM_NO

  for (const [suffixIndex, suffix] of NAME_SUFFIXES.entries()) {
    for (const [cityIndex, city] of MOCK_CITIES.entries()) {
      const index = suffixIndex * MOCK_CITIES.length + cityIndex
      const group =
        index % UNGROUPED_EVERY === 0
          ? null
          : MOCK_FIRM_GROUPS[index % MOCK_FIRM_GROUPS.length]
      firms.push({
        id: index + 1,
        dfirmNo,
        groupId: group?.id ?? null,
        groupName: group?.name ?? null,
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

/**
 * Mock kayıtların TAMAMI. Filtre/sıralama/sayfalama burada YAPILMAZ — gerçek uç
 * da düz dizi döndürdüğü için o iş `gasFirmListQuery.ts`'te, tek yerde.
 */
export function allMockFirms(): GasDistributionFirm[] {
  return mockFirms
}

export function findMockFirm(id: number): MockFirm | null {
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
 * Bölge SUNUCUDA YOK: gerçek sözleşmede ne liste satırı ne istek gövdesi bölge
 * taşıyor. Alan yalnız mock listesinin filtresini besliyor; yeni kayda sabit
 * bir değer veriliyor ki liste şeması dolsun. Liste gerçek uca bağlanınca
 * `region` tümüyle düşecek.
 */
const MOCK_CREATED_FIRM_REGION = MOCK_REGIONS[0]

function nextMockFirmId(): number {
  return mockFirms.reduce((largest, firm) => Math.max(largest, firm.id), 0) + 1
}

/** Gövde grubu KİMLİKLE taşıyor; listede gösterilen ad kimlikten türetilir. */
function toMockGroupFields(groupId: number | null) {
  return { groupId, groupName: findMockGroup(groupId)?.name ?? null }
}

export function createMockFirm(payload: GasDistributionFirmPayload): MockFirm {
  const created: MockFirm = {
    ...payload,
    ...toMockGroupFields(payload.groupId),
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
): MockFirm | null {
  const existing = mockFirms.find((firm) => firm.id === id)
  if (existing === undefined) return null

  const updated: MockFirm = {
    ...existing,
    ...payload,
    ...toMockGroupFields(payload.groupId),
  }
  mockFirms = mockFirms.map((firm) => (firm.id === id ? updated : firm))
  return updated
}
