import { z } from 'zod'

import {
  allMockAnnouncements,
  allMockScopeFacts,
  mockScopeIdOf,
  mockScopeNameOf,
  publishMockAnnouncement,
  queryMockDayActivity,
  type MockAnnouncement,
  type ScopeDayActivity,
  type ScopeFacts,
} from './adminDashboardMock'
import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { ApiError, NetworkError, hasApiBaseUrl, requestJson } from './http'
import { pagedResultSchema, type PagedResult } from './listQuery'
import { includesTr } from './turkishText'

/**
 * API SÖZLEŞMESİ — Yönetici anasayfası (Genel Bakış).
 *
 * Ekran İKİ kaynaktan besleniyor ve bu bilinçli (docs/kararlar.md K48):
 *
 * - **Sayaçlar, bugün, yoğunluk → GERÇEK uç** `GET /api/admin/dashboard`
 * - **Duyurular → YEREL depo** (`announcementStore.ts`); duyuru varlığı
 *   sunucuda hiç yazılmadı (entity, tablo, controller, migration yok)
 *
 * Özet TEK uçtan gelir: ekranın tüm sayıları (özet sayaçlar, bugün, yoğunluk,
 * duyuru önizlemeleri) aynı yanıtta. Liste uçlarının toplamı ALINMAZ — sayfalı
 * bir uçtan toplam çıkarmak yanlış sonuç verir.
 *
 * Kapsam sorguya `gdGroupId` VEYA `gdFirmId` olarak gider, ikisi birden ASLA.
 * Coğrafi bölge kavramı sunucudan kalktı; `regionId` yok.
 *
 * `dayKey` YEREL takvim günüdür (`YYYY-MM-DD`, bkz. `dayKey.ts`) ama UCA
 * GİTMEZ: "bugün" sayaçlarını sunucu kendi gününe göre hesaplıyor. Anahtar
 * istemcide yalnız sorgu anahtarı olarak yaşıyor — gün dönünce veri tazelensin.
 *
 * Özet ucu ARTIK VAR ve mock'a düşmüyor; hata gerçek hata olarak görünür.
 * Duyuru ucu hâlâ yok, yalnız o yol 404'te yerel depoya düşüyor (K48).
 */

const ADMIN_DASHBOARD_PATH = '/api/admin/dashboard'

/** TODO(esra): duyuru varlığı sunucuda yok; yol uç açılınca doğrulanacak. */
const ANNOUNCEMENTS_PATH = '/api/dashboard/announcements'

/**
 * Bu ucun KAPSAM parametresi. Uç `gdGroupId` ve `gdFirmId`'yi opsiyonel alıyor
 * ama İKİSİNİ BİRDEN kabul etmiyor; ayrık birleşim tam olarak bunu anlatıyor.
 *
 * `{ groupId?: number; firmId?: number }` biçimi geçersiz hâli (ikisi de dolu)
 * tipte MÜMKÜN kılardı ve hata ancak sunucuda görünürdü. Yeni bir kavram değil,
 * sunucunun sorgu sözleşmesinin arayüzdeki karşılığı — bu yüzden ucun kendi
 * dosyasında duruyor.
 */
export type AdminScope =
  | { type: 'global' }
  | { type: 'group'; groupId: number }
  | { type: 'firm'; firmId: number }

/** Kapsam seçilmemiş hâl; sorguya hiçbir parametre yazılmaz. */
export const GLOBAL_SCOPE: AdminScope = { type: 'global' }

/**
 * Kapsamı sorgu dizesine çevirir. Kapsam yoksa parametre HİÇ yazılmaz: boş
 * `gdGroupId=` sunucuda ayrı bir anlam taşıyabilir, "tümü" demek için
 * parametrenin YOKLUĞU kullanılır.
 */
function withScopeQuery(scope: AdminScope): string {
  if (scope.type === 'global') return ADMIN_DASHBOARD_PATH

  const search = new URLSearchParams(
    scope.type === 'group'
      ? { gdGroupId: String(scope.groupId) }
      : { gdFirmId: String(scope.firmId) },
  )

  return `${ADMIN_DASHBOARD_PATH}?${search.toString()}`
}

/** Duyuru başlığı tek satırda kalmalı; kart başlığı iki satıra taşarsa liste bozulur. */
export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 80

/** Duyuru metni. Kartta zaten kısaltılıyor; sınır formda da uygulanır. */
export const ANNOUNCEMENT_BODY_MAX_LENGTH = 500

/** Kartta gösterilecek en fazla yoğunluk satırı (belge: "en fazla 5"). */
export const MAX_DENSITY_ROWS = 5

/** Kartta gösterilecek en fazla duyuru önizlemesi (belge: "en fazla 2 duyuru"). */
export const MAX_ANNOUNCEMENTS = 2

/**
 * Duyuru özetinin kısaltma sınırı. Kısaltma CSS ile (`line-clamp`) değil VERİ
 * katmanında yapılıyor: satır sayısı yazı tipine ve kart genişliğine göre
 * değiştiği için test edilemezdi, karakter sınırı deterministik.
 */
export const ANNOUNCEMENT_SUMMARY_MAX_LENGTH = 120

export { MANAGEMENT_ANNOUNCEMENT_SOURCE, SYSTEM_ANNOUNCEMENT_SOURCE } from './adminDashboardMock'

const announcementSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  /** Kısaltılmış özet; ham metin arayüze hiç gelmez. */
  summary: z.string(),
  publishedAt: z.string(),
  /** 'Sistem' ise arayüz amber sol kenarlık gösterir. */
  source: z.string(),
})

/**
 * Duyuru LİSTESİ satırı. Kart satırından farkı: metin KISALTILMAMIŞ (`body`) ve
 * kapsam (`scopeName`) taşıyor. Liste ekranının işi duyuruyu tam göstermek;
 * özet alanı yalnız anasayfa kartının sınırlı yeri için var, ikisi aynı değil.
 */
const announcementDetailSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  body: z.string(),
  publishedAt: z.string(),
  source: z.string(),
  /** null = tüm kapsamlar. */
  scopeName: z.string().nullable(),
})

const announcementPageSchema = pagedResultSchema(announcementDetailSchema)

/**
 * Yoğunluğun hangi boyutta kırıldığı. Sunucu grup kapsamında grupları, firma
 * kapsamında firmaları döndürüyor; kart başlığı buna göre değişiyor.
 */
const densityBySchema = z.enum(['group', 'firm'])

const densityRowSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  projectCount: z.number().int().nonnegative(),
})

const dashboardSummarySchema = z.object({
  counts: z.object({
    gasDistributionUsers: z.number().int().nonnegative(),
    projectFirms: z.number().int().nonnegative(),
    projectFirmUsers: z.number().int().nonnegative(),
  }),
  today: z.object({
    newProjects: z.number().int().nonnegative(),
    approved: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
  }),
  densityBy: densityBySchema,
  density: z.array(densityRowSchema),
  announcements: z.array(announcementSchema),
})

export type Announcement = z.infer<typeof announcementSchema>
export type AnnouncementDetail = z.infer<typeof announcementDetailSchema>
export type AnnouncementPage = PagedResult<AnnouncementDetail>
export type DensityBy = z.infer<typeof densityBySchema>
export type DensityRow = z.infer<typeof densityRowSchema>
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>

/** Duyuru listesinin sayfa boyutu. Kartlar uzun olduğu için tablo kadar sık değil. */
export const ANNOUNCEMENT_PAGE_SIZE = 10

export interface AnnouncementQuery {
  /** Başlıkta ve metinde aranan metin; boş dize = arama yok. */
  textQuery: string
  /** Üst bardaki kapsam; duyuru ucu olmadığı için yalnız mock süzgecini besler. */
  scope: AdminScope
  page: number
  pageSize: number
}

/**
 * Uzun özeti sınırda keser ve üç nokta ekler. Sınırdaki metin OLDUĞU GİBİ kalır
 * (kısaltma göstergesi eklenmez), yoksa hiç kırpılmayan metinlere de "…" düşerdi.
 * Kelime ortasında kesmemek için son boşluğa kadar geri sarılır.
 */
export function truncateAnnouncementSummary(
  text: string,
  maxLength = ANNOUNCEMENT_SUMMARY_MAX_LENGTH,
): string {
  if (text.length <= maxLength) return text

  const cut = text.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = lastSpace > 0 ? cut.slice(0, lastSpace) : cut

  return `${trimmed.trimEnd()}…`
}

/** Liste satırı: metin KISALTILMAZ, kapsam da taşınır. */
function toAnnouncementDetail(mock: MockAnnouncement): AnnouncementDetail {
  return {
    id: mock.id,
    title: mock.title,
    body: mock.body,
    publishedAt: mock.publishedAt,
    source: mock.source,
    scopeName: mock.scopeName,
  }
}

/** Ham gövdeyi taşır; kısaltma `normalizeSummary` içinde, tek yerde yapılır. */
function toAnnouncement(mock: MockAnnouncement): Announcement {
  return {
    id: mock.id,
    title: mock.title,
    summary: mock.body,
    publishedAt: mock.publishedAt,
    source: mock.source,
  }
}

function sumFacts(facts: ScopeFacts[]): DashboardSummary['counts'] {
  return {
    gasDistributionUsers: facts.reduce((total, row) => total + row.gasDistributionUsers, 0),
    projectFirms: facts.reduce((total, row) => total + row.projectFirms, 0),
    projectFirmUsers: facts.reduce((total, row) => total + row.projectFirmUsers, 0),
  }
}

/** Yalnız istenen güne ait hareketlerin toplamı; gün boşsa üç sayaç da sıfır. */
function sumDayActivity(activity: ScopeDayActivity[]): DashboardSummary['today'] {
  return {
    newProjects: activity.reduce((total, row) => total + row.newProjects, 0),
    approved: activity.reduce((total, row) => total + row.approved, 0),
    rejected: activity.reduce((total, row) => total + row.rejected, 0),
  }
}

/**
 * Ekranın sözleşmesini KAYNAKTAN BAĞIMSIZ garanti eder: sıralama ve üst
 * sınırlar (KK-5, KK-6) ile duyuru kısaltması burada uygulanır.
 *
 * Yalnız mock yolunda yapılsaydı, sunucu bir gün sırasız veya 10 satır
 * döndürdüğünde kabul kriteri sessizce ihlal olurdu.
 */
function normalizeSummary(raw: DashboardSummary): DashboardSummary {
  return {
    counts: raw.counts,
    today: raw.today,
    densityBy: raw.densityBy,
    density: [...raw.density]
      .sort((left, right) => right.projectCount - left.projectCount)
      .slice(0, MAX_DENSITY_ROWS),
    announcements: [...raw.announcements]
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
      .slice(0, MAX_ANNOUNCEMENTS)
      .map((announcement) => ({
        ...announcement,
        summary: truncateAnnouncementSummary(announcement.summary),
      })),
  }
}

/**
 * Sunucunun gövdesi. Sayaç alanları arayüzünkilerle aynı DEĞİL
 * (`gasDistributionUserCount` ↔ `gasDistributionUsers`); dönüşüm tek yerde,
 * `toDashboardSummary`'de. Yoğunluk satırları ise sunucunun alan adlarıyla
 * (`id`/`name`/`projectCount`) OLDUĞU GİBİ taşınıyor.
 *
 * `densityBy` artık ZORUNLU: kart başlığını o belirliyor, gösterilmeyen bir
 * alan değil. `generatedAt` arayüzde kullanılmadığı için hâlâ opsiyonel —
 * sunucu onu kaldırırsa ekranın sınırda patlaması gereksiz bir bedel olurdu.
 */
const adminDashboardDtoSchema = z.object({
  summary: z.object({
    gasDistributionUserCount: z.number().int().nonnegative(),
    projectFirmCount: z.number().int().nonnegative(),
    projectFirmUserCount: z.number().int().nonnegative(),
  }),
  today: z.object({
    newProjectCount: z.number().int().nonnegative(),
    approvedCount: z.number().int().nonnegative(),
    rejectedCount: z.number().int().nonnegative(),
  }),
  /**
   * Yoğunluğun hangi boyutta kırıldığı; kart başlığı buna göre değişir.
   *
   * Beklenmeyen değer 'group'a düşer, şemayı PATLATMAZ: bu alan yalnız başlık
   * metnini seçiyor ve sunucu bir gün başka bir kırılım eklerse (ya da değeri
   * farklı yazarsa) bütün gösterge panelinin hata ekranına dönmesi orantısız
   * bir bedel olurdu. Sayılar yine doğru gösterilir, yalnız başlık genel kalır.
   */
  densityBy: densityBySchema.catch('group'),
  /** Kırılım başına PROJE adedi; kartın üç sayacı değil. */
  density: z.array(densityRowSchema),
  generatedAt: z.string().optional(),
})

/**
 * Sunucu gövdesi → ekranın sözleşmesi. Duyurular yanıtta olmadığı için AYRI
 * kaynaktan geçiliyor: tek bir `DashboardSummary` üretmek, kartların iki ayrı
 * yükleme durumu yönetmesine gerek bırakmıyor.
 */
function toDashboardSummary(
  dto: z.infer<typeof adminDashboardDtoSchema>,
  announcements: Announcement[],
): DashboardSummary {
  return {
    counts: {
      gasDistributionUsers: dto.summary.gasDistributionUserCount,
      projectFirms: dto.summary.projectFirmCount,
      projectFirmUsers: dto.summary.projectFirmUserCount,
    },
    today: {
      newProjects: dto.today.newProjectCount,
      approved: dto.today.approvedCount,
      rejected: dto.today.rejectedCount,
    },
    densityBy: dto.densityBy,
    density: dto.density,
    announcements,
  }
}

/** Mock ham veriyi üretir; sıralama/limit/kısaltma `normalizeSummary`'de. */
function buildMockSummary(dayKey: string, scope: AdminScope): DashboardSummary {
  const scopeName = mockScopeNameOf(scope)
  const facts = allMockScopeFacts(scopeName)
  // Birikimli sayılar günden bağımsız; "bugün" ve yoğunluk YALNIZ o günün
  // hareketlerinden geliyor, gün dönünce ikisi de sıfırlanıyor.
  const activity = queryMockDayActivity(dayKey, scopeName)

  return {
    counts: sumFacts(facts),
    today: sumDayActivity(activity),
    densityBy: scope.type === 'firm' ? 'firm' : 'group',
    density: activity.map((row) => ({
      id: mockScopeIdOf(row.name),
      name: row.name,
      projectCount: row.newProjects,
    })),
    announcements: allMockAnnouncements().map(toAnnouncement),
  }
}

function buildNormalizedMock(dayKey: string, scope: AdminScope): DashboardSummary {
  return normalizeSummary(dashboardSummarySchema.parse(buildMockSummary(dayKey, scope)))
}

const NOT_FOUND = 404
const NOT_IMPLEMENTED = 501

/**
 * Uyarı bir KEZ yazılır: liste her sayfalandığında istek yeniden gittiği için
 * bayrak olmadan konsol aynı satırla dolardı.
 */
let hasWarnedAboutMissingEndpoint = false

function warnOnceAboutMissingEndpoint(): void {
  if (hasWarnedAboutMissingEndpoint) return
  hasWarnedAboutMissingEndpoint = true

  // BİLİNÇLİ teşhis çıktısı — unutulmuş log DEĞİL, silinmemeli (docs/kararlar.md
  // K28). Ekran sessizce örnek veri gösteriyor; bunu söylemezsek geliştirici
  // sahte kayıtları gerçek sanır. Uç açılınca bu blok tümüyle kalkacak.
  // eslint-disable-next-line no-console -- yukarıdaki gerekçe
  console.warn('duyuru endpointi yok, yerel depo kullanılıyor')
}

/**
 * YALNIZ DUYURU yolları için: uç henüz yokken (404/501) veya API'ye hiç
 * ulaşılamazken yerel depoya düşülür. Özet ucu artık gerçek, o yol bu kontrolü
 * KULLANMIYOR — hatası hata olarak görünüyor.
 *
 * 401/403 ve 5xx burada da BİLEREK dışarıda: `http.ts` 401'de oturumu düşürüyor
 * ve `RequireAuth` girişe yönlendiriyor. Bunları yutsaydık, süresi dolmuş
 * oturumda kullanıcı sahte veriyle dolu çalışan bir ekran görürdü — hata
 * ekranından çok daha kötü bir sonuç.
 */
function isMissingEndpoint(error: unknown): boolean {
  if (error instanceof NetworkError) return true

  return (
    error instanceof ApiError &&
    (error.status === NOT_FOUND || error.status === NOT_IMPLEMENTED)
  )
}

/**
 * Kapsam üst bardaki seçiciden geliyor ve UCA GİDİYOR: grup seçilirse
 * `gdGroupId`, firma seçilirse `gdFirmId`, hiçbiri seçilmezse parametresiz
 * (sistem geneli). İkisi BİRLİKTE gitmez — kural `AdminScope` tipinin kendisiyle
 * garanti altında. Süzme sunucuda; istemci gelen diziyi daraltmıyor.
 *
 * Ekranın hiçbir yerinde ikinci bir sayı kaynağı yok, tüm kartlar bu tek
 * çağrıdan besleniyor — kapsam değişince hepsi birlikte döner.
 *
 * `dayKey` zorunlu ve YEREL takvim günü (`dayKey.ts`) ama sorguya girmez;
 * çağıran gün dönünce anahtarı değiştirir, veri o gün için yeniden istenir.
 */
export async function getDashboardSummary(
  dayKey: string,
  scope: AdminScope,
  signal?: AbortSignal,
): Promise<DashboardSummary> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    return buildNormalizedMock(dayKey, scope)
  }

  const dto = await requestJson(
    { method: 'GET', path: withScopeQuery(scope), signal },
    adminDashboardDtoSchema,
  )

  // Duyurular yanıtta yok; kartın verisi yerel depodan geliyor (K48).
  const announcements = buildMockSummary(dayKey, scope).announcements
  return normalizeSummary(toDashboardSummary(dto, announcements))
}

/** Formun gönderdiği duyuru. `scopeName` null = tüm kapsamlar. */
export interface AnnouncementDraft {
  title: string
  body: string
  scopeName: string | null
  /** Bakım/kesinti duyurusu mu — kartta amber sol kenarlığı bu belirler. */
  isSystem: boolean
}

/**
 * Duyuruyu yayınlar ve kartta görünecek HÂLİNİ döndürür (özet burada da
 * kısaltılır; kart ile form önizlemesi aynı metni gösterir).
 *
 * Görünen `source` alanını SUNUCU belirler — istemci yalnız "sistem duyurusu
 * mu" bilgisini gönderir; kaynak adını istemcide üretmek, iki ekranın farklı
 * etiket yazması demek olurdu. Uç yokken mock aynı ayrımı taklit eder.
 */
export async function publishAnnouncement(
  draft: AnnouncementDraft,
  signal?: AbortSignal,
): Promise<Announcement> {
  const toPublished = (mock: MockAnnouncement): Announcement => ({
    ...toAnnouncement(mock),
    summary: truncateAnnouncementSummary(mock.body),
  })

  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    return toPublished(publishMockAnnouncement(draft))
  }

  try {
    const raw = await requestJson(
      {
        method: 'POST',
        path: ANNOUNCEMENTS_PATH,
        rawJsonBody: JSON.stringify(draft),
        signal,
      },
      announcementSchema,
    )
    return { ...raw, summary: truncateAnnouncementSummary(raw.summary) }
  } catch (error) {
    if (!isMissingEndpoint(error)) throw error

    warnOnceAboutMissingEndpoint()
    return toPublished(publishMockAnnouncement(draft))
  }
}

/** Mock listeyi süzer, sıralar ve sayfalar. Sıralama/sayfalama gerçek uçta
    SUNUCUDA yapılacak; burada yalnız uç yokken aynı davranış taklit ediliyor. */
function buildMockAnnouncementPage(query: AnnouncementQuery): AnnouncementPage {
  const scopedName = mockScopeNameOf(query.scope)

  const matching = allMockAnnouncements()
    .filter(
      (announcement) =>
        query.textQuery === '' ||
        includesTr(announcement.title, query.textQuery) ||
        includesTr(announcement.body, query.textQuery),
    )
    // Kapsamı null olan duyuru TÜM kapsamları ilgilendiriyor; seçim yapılınca da
    // görünür kalır — elenseydi sistem duyuruları kapsamlı görünümde kaybolurdu.
    .filter(
      (announcement) =>
        scopedName === null ||
        announcement.scopeName === null ||
        announcement.scopeName === scopedName,
    )
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    .map(toAnnouncementDetail)

  const start = (query.page - 1) * query.pageSize

  return {
    items: matching.slice(start, start + query.pageSize),
    totalCount: matching.length,
    page: query.page,
    pageSize: query.pageSize,
  }
}

/**
 * Duyuru listesi. Anasayfa kartı en yeni İKİ duyuruyu gösteriyor; bu uç
 * yayınlanmış duyuruların TAMAMINI sayfalı veriyor.
 *
 * Sıralama yeniden eskiye ve bu KAYNAKTAN BAĞIMSIZ garanti ediliyor: sunucu bir
 * gün sırasız dönerse liste sessizce karışmasın (özet ucundaki `normalizeSummary`
 * ile aynı gerekçe).
 */
export async function getAnnouncements(
  query: AnnouncementQuery,
  signal?: AbortSignal,
): Promise<AnnouncementPage> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    return buildMockAnnouncementPage(query)
  }

  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.textQuery !== '') search.set('q', query.textQuery)
  if (query.scope.type === 'group') search.set('gdGroupId', String(query.scope.groupId))
  if (query.scope.type === 'firm') search.set('gdFirmId', String(query.scope.firmId))

  try {
    const raw = await requestJson(
      { method: 'GET', path: `${ANNOUNCEMENTS_PATH}?${search.toString()}`, signal },
      announcementPageSchema,
    )
    return {
      ...raw,
      items: [...raw.items].sort((left, right) =>
        right.publishedAt.localeCompare(left.publishedAt),
      ),
    }
  } catch (error) {
    if (!isMissingEndpoint(error)) throw error

    warnOnceAboutMissingEndpoint()
    return buildMockAnnouncementPage(query)
  }
}
