import { z } from 'zod'

import {
  publishMockAnnouncement,
  queryMockAnnouncements,
  queryMockDayActivity,
  queryMockRegionFacts,
  type MockAnnouncement,
  type RegionDayActivity,
  type RegionFacts,
} from './adminDashboardMock'
import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { ApiError, NetworkError, hasApiBaseUrl, requestJson } from './http'
import { pagedResultSchema, type PagedResult } from './listQuery'
import { includesTr } from './turkishText'

/**
 * API SÖZLEŞMESİ — Yönetici anasayfası (Genel Bakış).
 *
 * GET  /api/dashboard/summary?date=&region= → DashboardSummary
 * POST /api/dashboard/announcements         → Announcement
 *
 * Özet TEK uçtan gelir: ekranın tüm sayıları (özet sayaçlar, bugün, bölge
 * yoğunluğu, duyuru önizlemeleri) aynı yanıtta. Liste uçlarının toplamı ALINMAZ
 * — sayfalı bir uçtan toplam çıkarmak yanlış sonuç verir.
 *
 * `date` YEREL takvim günüdür (`YYYY-MM-DD`, bkz. `dayKey.ts`) ve zorunludur:
 * "bugün" sayaçlarının hangi güne ait olduğuna istemci karar verir, sunucunun
 * saat dilimi değil. Gün dönünce anahtar değişir, sayaçlar yeniden istenir.
 *
 * Bu uçların İKİSİ DE HENÜZ YOK. Sunucudaki gerçek rotalarda `/api/admin/`
 * öneki hiç bulunmadığı için yollar `/api/dashboard/...` olarak yazıldı;
 * backend NİHAİ adı farklı verebilir, uç açılınca bu sabitler doğrulanacak.
 *
 * Uç 404/501 dönerse ya da API'ye ulaşılamazsa mock veriye düşülür
 * (`isMissingEndpoint`). Backend'den istenecek alanların dökümü
 * docs/kararlar.md → "Genel Bakış: backend'den istenecek uçlar ve alanlar".
 */

/** TODO(esra): nihai yolu backend doğrulayacak — sunucuda `/api/admin/` öneki yok. */
const DASHBOARD_SUMMARY_PATH = '/api/dashboard/summary'

/** TODO(esra): duyuru varlığı sunucuda yok; yol uç açılınca doğrulanacak. */
const ANNOUNCEMENTS_PATH = '/api/dashboard/announcements'

/** Duyuru başlığı tek satırda kalmalı; kart başlığı iki satıra taşarsa liste bozulur. */
export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 80

/** Duyuru metni. Kartta zaten kısaltılıyor; sınır formda da uygulanır. */
export const ANNOUNCEMENT_BODY_MAX_LENGTH = 500

/** Kartta gösterilecek en fazla bölge satırı (belge: "en fazla 5 bölge"). */
export const MAX_REGION_ROWS = 5

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
 * kapsam (`region`) taşıyor. Liste ekranının işi duyuruyu tam göstermek; özet
 * alanı yalnız anasayfa kartının sınırlı yeri için var, ikisi aynı şey değil.
 */
const announcementDetailSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  body: z.string(),
  publishedAt: z.string(),
  source: z.string(),
  /** null = tüm bölgeler. */
  region: z.string().nullable(),
})

const announcementPageSchema = pagedResultSchema(announcementDetailSchema)

const regionDensityRowSchema = z.object({
  region: z.string(),
  count: z.number().int().nonnegative(),
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
  regionDensity: z.array(regionDensityRowSchema),
  announcements: z.array(announcementSchema),
})

export type Announcement = z.infer<typeof announcementSchema>
export type AnnouncementDetail = z.infer<typeof announcementDetailSchema>
export type AnnouncementPage = PagedResult<AnnouncementDetail>
export type RegionDensityRow = z.infer<typeof regionDensityRowSchema>
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>

/** Duyuru listesinin sayfa boyutu. Kartlar uzun olduğu için tablo kadar sık değil. */
export const ANNOUNCEMENT_PAGE_SIZE = 10

export interface AnnouncementQuery {
  /** Başlıkta ve metinde aranan metin; boş dize = arama yok. */
  textQuery: string
  /** Üst bardaki kapsam. Bölgesiz (genel) duyurular HER kapsamda görünür. */
  region: string | null
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
    region: mock.region,
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

function sumFacts(facts: RegionFacts[]): DashboardSummary['counts'] {
  return {
    gasDistributionUsers: facts.reduce((total, row) => total + row.gasDistributionUsers, 0),
    projectFirms: facts.reduce((total, row) => total + row.projectFirms, 0),
    projectFirmUsers: facts.reduce((total, row) => total + row.projectFirmUsers, 0),
  }
}

/** Yalnız istenen güne ait hareketlerin toplamı; gün boşsa üç sayaç da sıfır. */
function sumDayActivity(activity: RegionDayActivity[]): DashboardSummary['today'] {
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
    regionDensity: [...raw.regionDensity]
      .sort((left, right) => right.count - left.count)
      .slice(0, MAX_REGION_ROWS),
    announcements: [...raw.announcements]
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
      .slice(0, MAX_ANNOUNCEMENTS)
      .map((announcement) => ({
        ...announcement,
        summary: truncateAnnouncementSummary(announcement.summary),
      })),
  }
}

/** Mock ham veriyi üretir; sıralama/limit/kısaltma `normalizeSummary`'de. */
function buildMockSummary(region: string | null, dayKey: string): DashboardSummary {
  const facts = queryMockRegionFacts(region)
  // Birikimli sayılar günden bağımsız; "bugün" ve yoğunluk YALNIZ o günün
  // hareketlerinden geliyor, gün dönünce ikisi de sıfırlanıyor.
  const activity = queryMockDayActivity(region, dayKey)

  return {
    counts: sumFacts(facts),
    today: sumDayActivity(activity),
    regionDensity: activity.map((row) => ({ region: row.region, count: row.newProjects })),
    announcements: queryMockAnnouncements(region).map(toAnnouncement),
  }
}

function buildNormalizedMock(region: string | null, dayKey: string): DashboardSummary {
  return normalizeSummary(dashboardSummarySchema.parse(buildMockSummary(region, dayKey)))
}

const NOT_FOUND = 404
const NOT_IMPLEMENTED = 501

/**
 * Uyarı bir KEZ yazılır: bölge her değiştiğinde sorgu yeniden çalıştığı için
 * bayrak olmadan konsol aynı satırla dolardı.
 */
let hasWarnedAboutMissingEndpoint = false

function warnOnceAboutMissingEndpoint(): void {
  if (hasWarnedAboutMissingEndpoint) return
  hasWarnedAboutMissingEndpoint = true

  // BİLİNÇLİ teşhis çıktısı — unutulmuş log DEĞİL, silinmemeli (docs/kararlar.md
  // K28). Ekran sessizce örnek veri gösteriyor; bunu söylemezsek geliştirici
  // sahte sayıları gerçek sanır. Uç açılınca bu blok tümüyle kalkacak.
  // eslint-disable-next-line no-console -- yukarıdaki gerekçe
  console.warn('dashboard endpoint yok, mock veri kullanılıyor')
}

/**
 * Uç HENÜZ YOKKEN (404/501) veya API'ye hiç ulaşılamazken mock'a düşülür.
 *
 * 401/403 ve 5xx BİLEREK dışarıda: `http.ts` 401'de oturumu düşürüyor ve
 * `RequireAuth` girişe yönlendiriyor. Bunları mock'a yutsaydık, süresi dolmuş
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
 * `region` null = "Hepsi". Bölge değişince TÜM değerler yeniden hesaplanır —
 * ekranın hiçbir yerinde ikinci bir veri kaynağı yok, bu yüzden KK-2 tek
 * çağrıyla karşılanıyor.
 *
 * `dayKey` zorunlu ve YEREL takvim günü (`dayKey.ts`). Çağıran gün dönünce
 * anahtarı değiştirir; "bugün" sayaçları böyle sıfırlanır.
 */
export async function getDashboardSummary(
  region: string | null,
  dayKey: string,
  signal?: AbortSignal,
): Promise<DashboardSummary> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    return buildNormalizedMock(region, dayKey)
  }

  const query = new URLSearchParams({ date: dayKey })
  if (region !== null) query.set('region', region)

  try {
    const raw = await requestJson(
      { method: 'GET', path: `${DASHBOARD_SUMMARY_PATH}?${query.toString()}`, signal },
      dashboardSummarySchema,
    )
    return normalizeSummary(raw)
  } catch (error) {
    if (!isMissingEndpoint(error)) throw error

    warnOnceAboutMissingEndpoint()
    return buildNormalizedMock(region, dayKey)
  }
}

/** Formun gönderdiği duyuru. `region` null = tüm bölgeler. */
export interface AnnouncementDraft {
  title: string
  body: string
  region: string | null
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
  const matching = queryMockAnnouncements(query.region)
    .filter(
      (announcement) =>
        query.textQuery === '' ||
        includesTr(announcement.title, query.textQuery) ||
        includesTr(announcement.body, query.textQuery),
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
  if (query.region !== null) search.set('region', query.region)

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
