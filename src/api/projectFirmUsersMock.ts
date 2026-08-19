import type { PagedResult } from './listQuery'
import {
  AUTHORITY_TYPES,
  type FirmReference,
  type ProjectFirmUserCompetency,
  type ProjectFirmUserDetail,
  type ProjectFirmUserPayload,
  type ProjectFirmUserQuery,
  type ProjectFirmUserRow,
} from './projectFirmUserDto'
import { buildUsernameFromFullName, includesTr } from './turkishText'

/**
 * Kullanıcı SATIRLARINI üreten gövde — uç açılana kadar. Sunucunun YAPACAĞI işi
 * yapar: süzme, sıralama ve dilimleme burada, dışarıya `{ items, totalCount }`
 * çıkar (docs/kararlar.md K46).
 *
 * FİRMALAR UYDURULMAZ: gaz dağıtım firmaları ve proje firmaları GERÇEK uçlardan
 * geliyor ve satırlar onlardan tohumlanıyor (`seedProjectFirmUsers`). Uydurma
 * firma listesi tutulsaydı formdaki seçenekler gerçek, listedeki kayıtlar sahte
 * olurdu; güncelleme ekranında kullanıcının kayıtlı firması seçenekler arasında
 * bulunmaz, kutu boş açılırdı.
 *
 * Sahte olan tek şey kullanıcının kendisi; bağlandığı her firma gerçek.
 */

const MOCK_FULL_NAMES = [
  'Neriman Maraş', 'Tolga Ertek', 'Burcu Hamza', 'Mesut Çakır', 'Selin Arslan',
  'Bülent Sarıoğlu', 'Ahmet Yılmaz', 'Ayşe Demir', 'Mehmet Kaya', 'Fatma Şahin',
  'Mustafa Çelik', 'Zeynep Arslan', 'İbrahim Öztürk', 'Elif Güneş', 'Serkan Doğan',
  'Gülşah Aydın', 'Onur Kılıç', 'Pınar Yıldız', 'Cem Erdoğan', 'Şeyma Koç',
  'Hakan Aslan', 'Derya Polat', 'Uğur Şimşek', 'Nazlı Tekin', 'Emre Bulut',
  'Sibel Korkmaz', 'Barış Yalçın', 'Melis Aksoy', 'Kaan Özdemir', 'Tuğçe Ergün',
]

/**
 * Telefonlar BİLEREK karışık biçimde: gereksinim KK-9 "kayıtta hangi biçimde
 * durursa dursun listede 0xxx xxx xx xx görünür" diyor. Normalize edilemeyen
 * kayıt da var (dahili hat) — ham gösterimin denenebilmesi için.
 */
const MOCK_PHONE_FORMATS = [
  '5312753592', '0545 473 36 88', '+90 532 118 08 80', '02164021000',
  '0(533) 210-4477', '5051234567', null, '1180', '0 534 908 71 22',
]

const MOCK_REGISTRATION_NUMBERS = ['1', '3333', '512', '1280', '118', null, null, '77']

/** Her 6. kullanıcı pasif, her 5. yetki satırı pasif → KK-4 iki koşulu da denenebilsin. */
const INACTIVE_USER_EVERY = 6
const INACTIVE_COMPETENCY_EVERY = 5

/** Kullanıcı başına yetki sayısı 1..3 arasında dönüyor (KK-11 çoklu satır). */
const COMPETENCY_COUNT_CYCLE = [1, 2, 1, 3, 1, 2]

type MockUser = ProjectFirmUserDetail

const FIRST_USER_ID = 1001
const FIRST_COMPETENCY_ID = 5001

/** Oturum boyunca yaşayan gövde: eklenen kullanıcı listede görünsün. Gerçek
    firma listeleri gelene kadar BOŞ — uydurma firmayla doldurulmuyor. */
let mockUsers: MockUser[] = []
let areUsersSeeded = false

let nextUserId = FIRST_USER_ID + MOCK_FULL_NAMES.length

function buildMockUsers(gasFirms: FirmReference[], projectFirms: FirmReference[]): MockUser[] {
  let competencyId = FIRST_COMPETENCY_ID

  return MOCK_FULL_NAMES.map((fullName, index) => {
    const username = buildUsernameFromFullName(fullName)
    const competencyCount = COMPETENCY_COUNT_CYCLE[index % COMPETENCY_COUNT_CYCLE.length]

    const competencies = Array.from({ length: competencyCount }, (_, slot) => {
      const id = competencyId++

      return {
        id,
        gasFirm: gasFirms[(index + slot) % gasFirms.length],
        projectFirm: projectFirms[(index + slot * 3) % projectFirms.length],
        authorityType: AUTHORITY_TYPES[(index + slot) % AUTHORITY_TYPES.length],
        gdfRegistrationNumber:
          MOCK_REGISTRATION_NUMBERS[(index + slot) % MOCK_REGISTRATION_NUMBERS.length],
        isActive: id % INACTIVE_COMPETENCY_EVERY !== 0,
      }
    })

    return {
      id: FIRST_USER_ID + index,
      fullName,
      username,
      email: `${username}@${index % 2 === 0 ? 'tekhnelogos.com' : 'firma.com.tr'}`,
      phone: MOCK_PHONE_FORMATS[index % MOCK_PHONE_FORMATS.length],
      isActive: index % INACTIVE_USER_EVERY !== 0,
      competencies,
    }
  })
}

/**
 * Satırları GERÇEK firma listelerinden tohumlar. Bir kez çalışır: ikinci
 * çağrıda yeniden kurulsaydı oturum içinde eklenen kullanıcılar silinirdi.
 *
 * Firma listelerinden biri boşsa hiç tohumlanmaz — kullanıcıyı var olmayan bir
 * firmaya bağlamaktansa liste boş görünsün.
 */
export function seedProjectFirmUsers(
  gasFirms: readonly FirmReference[],
  projectFirms: readonly FirmReference[],
): void {
  if (areUsersSeeded) return
  if (gasFirms.length === 0 || projectFirms.length === 0) return

  areUsersSeeded = true
  mockUsers = buildMockUsers([...gasFirms], [...projectFirms])
}

function toRows(user: MockUser): ProjectFirmUserRow[] {
  return user.competencies.map((competency) => ({
    competencyId: competency.id,
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    authorityType: competency.authorityType,
    gasFirm: competency.gasFirm,
    projectFirm: competency.projectFirm,
    gdfRegistrationNumber: competency.gdfRegistrationNumber,
  }))
}

function matchesUser(user: MockUser, query: ProjectFirmUserQuery): boolean {
  if (query.onlyActive && !user.isActive) return false
  if (query.nameQuery === '') return true

  // Arama üç alan üzerinde, içerik bazlı (KK-5).
  return (
    includesTr(user.username, query.nameQuery) ||
    includesTr(user.fullName, query.nameQuery) ||
    includesTr(user.email, query.nameQuery)
  )
}

function matchesCompetency(
  competency: ProjectFirmUserCompetency,
  query: ProjectFirmUserQuery,
): boolean {
  if (query.onlyActive && !competency.isActive) return false
  // Kapsam yetki satırının G.D. firmasına bakıyor: kullanıcı birden çok
  // firmada yetkiliyse yalnız kapsamdaki satırları görünsün.
  if (query.gasFirmIds !== null && !query.gasFirmIds.includes(competency.gasFirm.id)) {
    return false
  }

  return query.authorityType === null || competency.authorityType === query.authorityType
}

/**
 * Satırlar ada göre sıralı: aynı kullanıcının satırları ART ARDA gelsin (KK-11).
 * Sıralanabilir başlık YOK — gereksinim istemiyor, sıra sabit.
 */
export function queryMockProjectFirmUsers(
  query: ProjectFirmUserQuery,
): PagedResult<ProjectFirmUserRow> {
  const rows = [...mockUsers]
    .filter((user) => matchesUser(user, query))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, 'tr'))
    .flatMap((user) =>
      toRows({
        ...user,
        competencies: user.competencies.filter((item) => matchesCompetency(item, query)),
      }),
    )

  const offset = (query.page - 1) * query.pageSize

  return {
    items: rows.slice(offset, offset + query.pageSize),
    totalCount: rows.length,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export function findMockProjectFirmUser(userId: number): ProjectFirmUserDetail | null {
  return mockUsers.find((user) => user.id === userId) ?? null
}

export interface MockTakenFields {
  isEmailTaken: boolean
  isUsernameTaken: boolean
}

/** Benzersizlik denetimi sunucuda çalışacak (KK-16); mock onu taklit ediyor. */
export function findMockTakenFields(
  email: string,
  username: string,
  excludedUserId: number | null,
): MockTakenFields {
  const others = mockUsers.filter((user) => user.id !== excludedUserId)

  return {
    isEmailTaken: others.some((user) => user.email.toLowerCase() === email.toLowerCase()),
    isUsernameTaken: others.some((user) => user.username === username),
  }
}

export function createMockProjectFirmUser(payload: ProjectFirmUserPayload): number {
  const id = nextUserId++
  mockUsers.push({
    id,
    fullName: payload.fullName,
    username: payload.username,
    email: payload.email,
    phone: payload.phone,
    // Gövde artık kullanıcı düzeyinde aktiflik taşımıyor; yeni kayıt aktif açılır.
    isActive: true,
    // Yetki satırı formdan kalktı: yeni kayıt yetkisiz açılır. Liste bir SATIRI
    // yetki kaydı olarak gösterdiği için bu kullanıcı listede görünmez —
    // uydurma bir yetki satırı üretmek yerine eksiklik olduğu gibi duruyor.
    competencies: [],
  })

  return id
}

export function updateMockProjectFirmUser(userId: number, payload: ProjectFirmUserPayload): void {
  const user = mockUsers.find((item) => item.id === userId)
  if (user === undefined) return

  user.fullName = payload.fullName
  user.email = payload.email
  user.phone = payload.phone
  // `isActive` ve yetki satırları gövdeden kalktı: güncelleme ikisine de
  // DOKUNMAZ.
}
