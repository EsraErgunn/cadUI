import { MOCK_REGIONS } from './adminFirmsMock'
import { toDayKey } from './dayKey'

/**
 * Gösterge panelinin mock kaynağı. Bölge filtresi GERÇEKTEN çalışsın diye her
 * kayıt bölge taşıyor: üst bardan seçim değişince sayılar yeniden hesaplanır
 * (KK-2). Gerçek uç gelince yalnız `adminDashboard.ts` değişir, bileşenler değil.
 *
 * Bölge adları `MOCK_REGIONS`'tan geliyor — üst bardaki seçim kutusu da o listeyi
 * kullanıyor, ayrı bir liste tutulsaydı seçilen bölge hiçbir kayıtla eşleşmezdi.
 */

/** Bölge başına BİRİKİMLİ sayılar (kullanıcı/firma adedi). Güne bağlı değil:
    dünden bugüne devreden toplamlar, gün dönünce sıfırlanmazlar. */
interface RegionFacts {
  region: string
  gasDistributionUsers: number
  projectFirms: number
  projectFirmUsers: number
}

/** Sayılar sabit ve bölgeye göre farklı; toplamları mockup'taki büyüklüklere yakın. */
const REGION_FACTS: RegionFacts[] = [
  { region: MOCK_REGIONS[0], gasDistributionUsers: 612, projectFirms: 2480, projectFirmUsers: 5210 },
  { region: MOCK_REGIONS[1], gasDistributionUsers: 240, projectFirms: 980, projectFirmUsers: 2040 },
  { region: MOCK_REGIONS[2], gasDistributionUsers: 498, projectFirms: 2015, projectFirmUsers: 4260 },
  { region: MOCK_REGIONS[3], gasDistributionUsers: 305, projectFirms: 1190, projectFirmUsers: 2480 },
  { region: MOCK_REGIONS[4], gasDistributionUsers: 520, projectFirms: 2130, projectFirmUsers: 4490 },
  { region: MOCK_REGIONS[5], gasDistributionUsers: 356, projectFirms: 1420, projectFirmUsers: 2980 },
  { region: MOCK_REGIONS[6], gasDistributionUsers: 395, projectFirms: 1623, projectFirmUsers: 3344 },
]

/** Bir GÜNE ait hareketler. "Bugün" kartı ve bölge yoğunluğu bunlardan sayılır. */
interface RegionDayActivity {
  dayKey: string
  region: string
  newProjects: number
  approved: number
  rejected: number
}

/**
 * Örnek hareketler uygulamanın AÇILDIĞI güne yazılıyor. Sabit bir tarih
 * yazılsaydı mock veri ertesi gün "bugün" olmaktan çıkar, ekran hep boş
 * görünürdü.
 *
 * Sekme gece yarısını geçerse yeni günün hiç kaydı olmaz ve sayaçlar sıfıra
 * döner — kabul kriterinin istediği davranış tam olarak budur, mock bunu
 * gizlemiyor.
 */
const MOCK_ACTIVITY_DAY_KEY = toDayKey(new Date())

const TODAY_ACTIVITY: RegionDayActivity[] = [
  { dayKey: MOCK_ACTIVITY_DAY_KEY, region: MOCK_REGIONS[0], newProjects: 28, approved: 9, rejected: 2 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, region: MOCK_REGIONS[1], newProjects: 6, approved: 1, rejected: 0 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, region: MOCK_REGIONS[2], newProjects: 22, approved: 7, rejected: 1 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, region: MOCK_REGIONS[3], newProjects: 12, approved: 3, rejected: 0 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, region: MOCK_REGIONS[4], newProjects: 16, approved: 5, rejected: 1 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, region: MOCK_REGIONS[5], newProjects: 8, approved: 2, rejected: 1 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, region: MOCK_REGIONS[6], newProjects: 4, approved: 0, rejected: 0 },
]

/** `source` alanı amber sol kenarlığı belirler; 'Sistem' dışındakiler düz görünür. */
export const SYSTEM_ANNOUNCEMENT_SOURCE = 'Sistem'

/**
 * Sistem duyurusu olarak işaretlenmeyen yayınların kaynağı. Gerçek uçta kaynağı
 * SUNUCU belirler (yayınlayan kurum); mock bir ad uydurmak zorunda olduğu için
 * nötr bir etiket kullanıyor.
 */
export const MANAGEMENT_ANNOUNCEMENT_SOURCE = 'Yönetim'

interface MockAnnouncement {
  id: number
  title: string
  /** KISALTILMAMIŞ ham metin; kısaltma `adminDashboard.ts` içinde yapılır. */
  body: string
  publishedAt: string
  source: string
  /** Duyuru tüm bölgeleri ilgilendiriyorsa null. */
  region: string | null
}

const SEED_ANNOUNCEMENTS: MockAnnouncement[] = [
  {
    id: 1,
    title: 'ZetaCAD 3.0 Versiyon 3469 Yayında',
    body:
      '10.06.2026 Çarşamba 14:30 itibarıyla yeni versiyon yayında. Lidar ile mimari tarama, ' +
      'mouse ile çizim ve 300 mbar servis kutusu desteği bu sürümle birlikte kullanıma açıldı.',
    publishedAt: '2026-06-19T09:00:00.000Z',
    source: 'Teknhelogos',
    region: null,
  },
  {
    id: 2,
    title: 'Planlı Bakım Bildirimi',
    body: '19 Temmuz Pazar 02:00–06:00 arasında sistem bakımda olacaktır.',
    publishedAt: '2026-07-11T06:00:00.000Z',
    source: SYSTEM_ANNOUNCEMENT_SOURCE,
    region: null,
  },
  {
    id: 3,
    title: 'Yeterlilik Belgesi Yenileme Dönemi',
    body:
      'Proje firmalarının yeterlilik belgelerini 30 Haziran tarihine kadar yenilemesi ' +
      'gerekmektedir. Yenilenmeyen belgeler pasife alınacaktır.',
    publishedAt: '2026-05-02T10:30:00.000Z',
    source: 'Teknhelogos',
    region: MOCK_REGIONS[0],
  },
]

/**
 * Yayınlanan duyurular oturum boyunca burada birikir — sekme yenilenince gider.
 * Uç açılınca bu dizi de `publishMockAnnouncement` de silinecek; formun gerçekten
 * çalıştığını göstermenin uç olmadan tek yolu bu.
 */
const announcements: MockAnnouncement[] = [...SEED_ANNOUNCEMENTS]

function nextAnnouncementId(): number {
  return announcements.reduce((largest, item) => Math.max(largest, item.id), 0) + 1
}

export interface MockAnnouncementInput {
  title: string
  body: string
  /** null = tüm bölgeler. */
  region: string | null
  /** Bakım/kesinti duyurusu mu — amber sol kenarlık buna bağlı. */
  isSystem: boolean
}

export function publishMockAnnouncement(input: MockAnnouncementInput): MockAnnouncement {
  const created: MockAnnouncement = {
    id: nextAnnouncementId(),
    title: input.title,
    body: input.body,
    publishedAt: new Date().toISOString(),
    source: input.isSystem ? SYSTEM_ANNOUNCEMENT_SOURCE : MANAGEMENT_ANNOUNCEMENT_SOURCE,
    region: input.region,
  }

  announcements.push(created)
  return created
}

function selectFacts(region: string | null): RegionFacts[] {
  if (region === null) return REGION_FACTS
  return REGION_FACTS.filter((facts) => facts.region === region)
}

export function queryMockRegionFacts(region: string | null): RegionFacts[] {
  return selectFacts(region)
}

/**
 * YALNIZ istenen güne ait hareketler. Gün eşleşmiyorsa boş dizi döner: gün
 * değişince "Bugün" sayaçları ve bölge yoğunluğu sıfırdan başlar.
 */
export function queryMockDayActivity(region: string | null, dayKey: string): RegionDayActivity[] {
  const ofDay = TODAY_ACTIVITY.filter((activity) => activity.dayKey === dayKey)

  if (region === null) return ofDay
  return ofDay.filter((activity) => activity.region === region)
}

/** Bölgesi olmayan duyuru her kapsamda görünür; bölgeli olan yalnız o bölgede. */
export function queryMockAnnouncements(region: string | null): MockAnnouncement[] {
  if (region === null) return announcements
  return announcements.filter(
    (announcement) => announcement.region === null || announcement.region === region,
  )
}

export type { RegionDayActivity, RegionFacts, MockAnnouncement }
