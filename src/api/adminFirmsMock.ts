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

function buildMockFirms(): GasDistributionFirm[] {
  const firms: GasDistributionFirm[] = []
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
      })
      dfirmNo += DFIRM_NO_GAPS[index % DFIRM_NO_GAPS.length]
    }
  }

  return firms
}

const MOCK_FIRMS = buildMockFirms()

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
  const matched = MOCK_FIRMS.filter((firm) => matchesQuery(firm, query))
  const sorted = [...matched].sort((left, right) => compareFirms(left, right, query))
  const offset = (query.page - 1) * query.pageSize

  return {
    items: sorted.slice(offset, offset + query.pageSize),
    totalCount: matched.length,
  }
}
