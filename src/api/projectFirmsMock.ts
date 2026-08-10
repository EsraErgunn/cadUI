import type { ProjectFirm } from './projectFirmDto'

/**
 * `VITE_API_URL` tanımlı değilken listeyi besleyen gövde.
 *
 * Uçta karşılığı OLMAYAN alanlar (Seri No, Yeter No, Gsm, G.D. firması) burada
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
        serialNumber: null,
        qualificationNumber: null,
        name: `${city} ${suffix}`,
        gasFirm: null,
        authorizedPerson:
          index % UNAUTHORIZED_EVERY === 0
            ? null
            : MOCK_AUTHORIZED_PEOPLE[index % MOCK_AUTHORIZED_PEOPLE.length],
        email: toMockEmail(city, index),
        phone: buildMockPhone(index),
        mobilePhone: null,
      })
    }
  }

  return firms
}

const mockProjectFirms = buildMockProjectFirms()

/**
 * Mock kayıtların TAMAMI. Filtre/sıralama/sayfalama burada YAPILMAZ — gerçek uç
 * da düz dizi döndürdüğü için o iş `projectFirmListQuery.ts`'te, tek yerde.
 */
export function allMockProjectFirms(): ProjectFirm[] {
  return mockProjectFirms
}
