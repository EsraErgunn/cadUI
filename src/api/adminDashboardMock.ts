import type { AdminScope } from './adminDashboard'
import { allMockFirms, MOCK_FIRM_GROUPS } from './adminFirmsMock'
import { appendStoredAnnouncement, readStoredAnnouncements } from './announcementStore'
import { toDayKey } from './dayKey'

/**
 * Gösterge panelinin mock kaynağı. Kapsam süzgeci GERÇEKTEN çalışsın diye her
 * kayıt bir kapsam adı taşıyor: üst bardan seçim değişince sayılar yeniden
 * hesaplanır (KK-2). Gerçek uç gelince yalnız `adminDashboard.ts` değişir.
 *
 * Kapsam adları gaz dağıtım GRUP firmalarından TÜRETİLİYOR: iki kopya olsaydı
 * üst bardaki seçenekler ile yoğunluk satırları birbirini tutmaz, kullanıcı
 * seçtiği kapsamı kartta bulamazdı. Duyuru yayınlama kutusu da bunu kullanıyor.
 *
 * Mock'un kırılımı GRUP düzeyinde: tek bir firma seçildiğinde o firmanın
 * grubunun satırları veriliyor, çünkü firma başına örnek veri üretmek mock'u
 * gerçek veriden daha ayrıntılı gösterirdi.
 */

export const MOCK_SCOPE_NAMES = MOCK_FIRM_GROUPS.map((group) => group.name)

/** Kapsam başına BİRİKİMLİ sayılar (kullanıcı/firma adedi). Güne bağlı değil:
    dünden bugüne devreden toplamlar, gün dönünce sıfırlanmazlar. */
interface ScopeFacts {
  name: string
  gasDistributionUsers: number
  projectFirms: number
  projectFirmUsers: number
}

/** Sayılar sabit ve kapsama göre farklı; toplamları mockup'taki büyüklüklere yakın. */
const SCOPE_FACTS: ScopeFacts[] = [
  { name: MOCK_SCOPE_NAMES[0], gasDistributionUsers: 612, projectFirms: 2480, projectFirmUsers: 5210 },
  { name: MOCK_SCOPE_NAMES[1], gasDistributionUsers: 240, projectFirms: 980, projectFirmUsers: 2040 },
  { name: MOCK_SCOPE_NAMES[2], gasDistributionUsers: 498, projectFirms: 2015, projectFirmUsers: 4260 },
  { name: MOCK_SCOPE_NAMES[3], gasDistributionUsers: 305, projectFirms: 1190, projectFirmUsers: 2480 },
  { name: MOCK_SCOPE_NAMES[4], gasDistributionUsers: 520, projectFirms: 2130, projectFirmUsers: 4490 },
  { name: MOCK_SCOPE_NAMES[5], gasDistributionUsers: 356, projectFirms: 1420, projectFirmUsers: 2980 },
  { name: MOCK_SCOPE_NAMES[6], gasDistributionUsers: 395, projectFirms: 1623, projectFirmUsers: 3344 },
]

/** Bir GÜNE ait hareketler. "Bugün" kartı ve yoğunluk bunlardan sayılır. */
interface ScopeDayActivity {
  dayKey: string
  name: string
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

const TODAY_ACTIVITY: ScopeDayActivity[] = [
  { dayKey: MOCK_ACTIVITY_DAY_KEY, name: MOCK_SCOPE_NAMES[0], newProjects: 28, approved: 9, rejected: 2 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, name: MOCK_SCOPE_NAMES[1], newProjects: 6, approved: 1, rejected: 0 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, name: MOCK_SCOPE_NAMES[2], newProjects: 22, approved: 7, rejected: 1 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, name: MOCK_SCOPE_NAMES[3], newProjects: 12, approved: 3, rejected: 0 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, name: MOCK_SCOPE_NAMES[4], newProjects: 16, approved: 5, rejected: 1 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, name: MOCK_SCOPE_NAMES[5], newProjects: 8, approved: 2, rejected: 1 },
  { dayKey: MOCK_ACTIVITY_DAY_KEY, name: MOCK_SCOPE_NAMES[6], newProjects: 4, approved: 0, rejected: 0 },
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
  /** Duyuru tüm kapsamları ilgilendiriyorsa null. */
  scopeName: string | null
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
    scopeName: null,
  },
  {
    id: 2,
    title: 'Planlı Bakım Bildirimi',
    body: '19 Temmuz Pazar 02:00–06:00 arasında sistem bakımda olacaktır.',
    publishedAt: '2026-07-11T06:00:00.000Z',
    source: SYSTEM_ANNOUNCEMENT_SOURCE,
    scopeName: null,
  },
  {
    id: 3,
    title: 'Yeterlilik Belgesi Yenileme Dönemi',
    body:
      'Proje firmalarının yeterlilik belgelerini 30 Haziran tarihine kadar yenilemesi ' +
      'gerekmektedir. Yenilenmeyen belgeler pasife alınacaktır.',
    publishedAt: '2026-05-02T10:30:00.000Z',
    source: 'Teknhelogos',
    scopeName: MOCK_SCOPE_NAMES[0],
  },
]

/**
 * Tohum duyurular + kullanıcının YAYINLADIKLARI. Yayınlananlar `localStorage`'da
 * duruyor (`announcementStore.ts`), yani sekme yenilenince kaybolmuyor — duyuru
 * ucu sunucuda hiç yazılmadığı için tek kalıcılık yolu bu (docs/kararlar.md K48).
 * Depo her okumada taranıyor: aynı tarayıcının başka sekmesinde yayınlanan
 * duyuru burada da görünsün.
 */
function allAnnouncements(): MockAnnouncement[] {
  return [...SEED_ANNOUNCEMENTS, ...readStoredAnnouncements()]
}

function nextAnnouncementId(): number {
  return allAnnouncements().reduce((largest, item) => Math.max(largest, item.id), 0) + 1
}

export interface MockAnnouncementInput {
  title: string
  body: string
  /** null = tüm kapsamlar. */
  scopeName: string | null
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
    scopeName: input.scopeName,
  }

  appendStoredAnnouncement(created)
  return created
}

/**
 * Kapsam → mock kayıtlarının taşıdığı AD. Üst bar kimlik yazıyor, mock kayıtlar
 * ad taşıyor; çeviri tek yerde durur ki her çağıran kendi eşlemesini kurmasın.
 *
 * Firma kapsamında firmanın GRUBUNUN adı dönüyor: mock'un kırılımı grup
 * düzeyinde. Bilinmeyen kimlik null döner = kapsam yok sayılır (kart boşalmaz).
 */
export function mockScopeNameOf(scope: AdminScope): string | null {
  if (scope.type === 'global') return null

  const groupId =
    scope.type === 'group'
      ? scope.groupId
      : (allMockFirms().find((firm) => firm.id === scope.firmId)?.groupId ?? null)

  if (groupId === null) return null
  return MOCK_FIRM_GROUPS.find((group) => group.id === groupId)?.name ?? null
}

/** Kapsam adı → grup kimliği. Yoğunluk satırı kimlik taşımak zorunda (gerçek
    uç `density[].id` veriyor); mock kayıtlar yalnız ad tuttuğu için çeviri
    burada. Bilinmeyen ad 0 döner — mock veri, çakışacak bir kimlik yok. */
export function mockScopeIdOf(scopeName: string): number {
  return MOCK_FIRM_GROUPS.find((group) => group.name === scopeName)?.id ?? 0
}

/** Kapsam seçiliyse yalnız onun birikimli sayıları; değilse sistem geneli. */
export function allMockScopeFacts(scopeName: string | null = null): ScopeFacts[] {
  if (scopeName === null) return SCOPE_FACTS
  return SCOPE_FACTS.filter((facts) => facts.name === scopeName)
}

/**
 * YALNIZ istenen güne ait hareketler. Gün eşleşmiyorsa boş dizi döner: gün
 * değişince "Bugün" sayaçları ve yoğunluk sıfırdan başlar.
 */
export function queryMockDayActivity(
  dayKey: string,
  scopeName: string | null = null,
): ScopeDayActivity[] {
  return TODAY_ACTIVITY.filter(
    (activity) =>
      activity.dayKey === dayKey && (scopeName === null || activity.name === scopeName),
  )
}

export function allMockAnnouncements(): MockAnnouncement[] {
  return allAnnouncements()
}

export type { ScopeDayActivity, ScopeFacts, MockAnnouncement }
