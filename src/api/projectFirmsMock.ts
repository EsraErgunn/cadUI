import type { ProjectFirm, ProjectFirmPayload } from './projectFirmDto'

/**
 * `VITE_API_URL` tanımlı değilken listeyi besleyen gövde.
 *
 * Uçta karşılığı OLMAYAN alan (G.D. firması bağı) burada
 * da BİLEREK `null`: mock zengin, gerçek yanıt fakir olsaydı geliştirici dolu
 * bir tablo görür, ekran gerçek uca bağlanınca sütunlar boşalırdı. Mock ile
 * gerçeğin davranışı aynı kalsın diye eksiklik burada da görünür.
 */

const MOCK_CITIES = [
  'Adana', 'Adıyaman', 'Afyon', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
  'Aydın', 'Balıkesir', 'Bartın', 'Bilecik', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale',
  'Çorum', 'Denizli', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
  'Gaziantep', 'Giresun', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş',
  'Karabük', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kocaeli', 'Konya', 'Kütahya',
]

const NAME_SUFFIXES = [
  'Mühendislik Ltd. Şti.',
  'Proje ve Taahhüt A.Ş.',
  'Isı Sistemleri Ltd. Şti.',
  'Enerji Mühendislik A.Ş.',
  'Tesisat Proje Ltd. Şti.',
]

const MOCK_AUTHORIZED_PEOPLE = [
  'Ahmet Yılmaz',
  'Ayşe Demir',
  'Mehmet Kaya',
  'Fatma Şahin',
  'Mustafa Çelik',
  'Zeynep Arslan',
]

/** Her 5. kayıt yetkilisiz → "Yetkili" sütununun boş hâli de denenebilsin. */
const UNAUTHORIZED_EVERY = 5

/** Her 7. kayıt e-postasız → `mailto:` bağlantısının boş hâli görünsün. */
const EMAIL_LESS_EVERY = 7

/** Ham rakam (maskesiz) — arayüz maskeyi core/phone.ts ile kendisi kuruyor. */
const FIRST_MOCK_PHONE = 5320000000
const MOCK_PHONE_STEP = 211

function buildMockPhone(index: number): string {
  return `0${FIRST_MOCK_PHONE + index * MOCK_PHONE_STEP}`
}

/** Vergi numarası 10 hane; kayıt başına ayrı bir numara üretilir ki ekleme
    ekranının benzersizlik ön kontrolü gerçek bir çakışmaya düşebilsin. */
const FIRST_MOCK_TAX_NUMBER = 1_000_000_000

function buildMockTaxNumber(index: number): string {
  return String(FIRST_MOCK_TAX_NUMBER + index)
}

function toMockEmail(city: string, index: number): string | null {
  if (index % EMAIL_LESS_EVERY === 0) return null

  // Alan adı ASCII olmalı: şehir adındaki Türkçe harfler düşürülüyor.
  const slug = city
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')

  return `bilgi${index + 1}@${slug}muhendislik.com.tr`
}

function buildMockProjectFirms(): ProjectFirm[] {
  const firms: ProjectFirm[] = []

  for (const [suffixIndex, suffix] of NAME_SUFFIXES.entries()) {
    for (const [cityIndex, city] of MOCK_CITIES.entries()) {
      const index = suffixIndex * MOCK_CITIES.length + cityIndex
      firms.push({
        id: index + 1,
        name: `${city} ${suffix}`,
        authorizedPerson:
          index % UNAUTHORIZED_EVERY === 0
            ? null
            : MOCK_AUTHORIZED_PEOPLE[index % MOCK_AUTHORIZED_PEOPLE.length],
        email: toMockEmail(city, index),
        phone: buildMockPhone(index),
        taxNumber: buildMockTaxNumber(index),
      })
    }
  }

  return firms
}

/**
 * `let`: ekleme bu diziyi değiştirir, böylece kaydedilen firma liste ekranında
 * ve toplam kayıt adedinde görünür (KK-8). `adminFirmsMock` ile aynı desen.
 */
let mockProjectFirms = buildMockProjectFirms()

/**
 * Mock kayıtların TAMAMI. Filtre/sıralama/sayfalama burada YAPILMAZ — gerçek uç
 * da düz dizi döndürdüğü için o iş `projectFirmListQuery.ts`'te, tek yerde.
 */
export function allMockProjectFirms(): ProjectFirm[] {
  return mockProjectFirms
}

function nextMockProjectFirmId(): number {
  return mockProjectFirms.reduce((largest, firm) => Math.max(largest, firm.id), 0) + 1
}

/**
 * Yetkilendirme kayıtları. Sunucuda bunları yazan uç YOK; mock oturum boyunca
 * bellekte tutuyor ki "kaydedildi" denen şey bir yere gitmiş olsun. Bugün
 * okuyanı yok — uç açılınca bu harita silinecek.
 */
const mockAuthorizationsByFirm = new Map<number, unknown[]>()

export function recordMockProjectFirmAuthorizations(
  firmId: number,
  authorizations: readonly unknown[],
): void {
  mockAuthorizationsByFirm.set(firmId, [...authorizations])
}

/**
 * Silinen kayıt diziden düşer. Dönüş `false` ise kayıt yoktu — çağıran bunu
 * gerçek ucun 404'üne çevirir, böylece mock ile sunucu aynı hatayı üretir.
 */
export function deleteMockProjectFirm(id: number): boolean {
  const remaining = mockProjectFirms.filter((firm) => firm.id !== id)
  if (remaining.length === mockProjectFirms.length) return false

  mockProjectFirms = remaining
  return true
}

export function createMockProjectFirm(payload: ProjectFirmPayload): ProjectFirm {
  const created: ProjectFirm = {
    id: nextMockProjectFirmId(),
    name: payload.name,
    authorizedPerson: payload.authorizedPerson,
    email: payload.email,
    phone: payload.phone,
    taxNumber: payload.taxNumber,
  }

  mockProjectFirms = [...mockProjectFirms, created]
  return created
}
