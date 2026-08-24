import { z } from 'zod'

import {
  allMockScopeFacts,
  mockScopeIdOf,
  mockScopeNameOf,
  queryMockDayActivity,
  type ScopeDayActivity,
  type ScopeFacts,
} from './adminDashboardMock'
import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { hasApiBaseUrl, requestJson } from './http'

/**
 * API SÖZLEŞMESİ — Yönetici anasayfası (Genel Bakış).
 *
 * Özet TEK uçtan gelir (`GET /api/admin/dashboard`): ekranın tüm sayıları
 * (sayaçlar, bugün, yoğunluk) aynı yanıtta. Liste uçlarının toplamı ALINMAZ —
 * sayfalı bir uçtan toplam çıkarmak yanlış sonuç verir.
 *
 * Kapsam sorguya `gdGroupId` VEYA `gdFirmId` olarak gider, ikisi birden ASLA.
 * Coğrafi bölge kavramı sunucudan kalktı; `regionId` yok.
 *
 * `dayKey` YEREL takvim günüdür (`YYYY-MM-DD`, bkz. `dayKey.ts`) ama UCA
 * GİTMEZ: "bugün" sayaçlarını sunucu kendi gününe göre hesaplıyor. Anahtar
 * istemcide yalnız sorgu anahtarı olarak yaşıyor — gün dönünce veri tazelensin.
 *
 * Uç GERÇEK ve mock'a DÜŞMÜYOR; hata gerçek hata olarak görünür. Mock yalnız
 * `VITE_API_BASE_URL` hiç tanımlı değilken devreye giriyor.
 */

const ADMIN_DASHBOARD_PATH = '/api/admin/dashboard'

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

/** Kartta gösterilecek en fazla yoğunluk satırı (belge: "en fazla 5"). */
export const MAX_DENSITY_ROWS = 5

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
})

export type DensityBy = z.infer<typeof densityBySchema>
export type DensityRow = z.infer<typeof densityRowSchema>
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>

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
 * Ekranın sözleşmesini KAYNAKTAN BAĞIMSIZ garanti eder: sıralama ve üst sınır
 * (KK-5) burada uygulanır.
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

/** Sunucu gövdesi → ekranın sözleşmesi. */
function toDashboardSummary(
  dto: z.infer<typeof adminDashboardDtoSchema>,
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
  }
}

function buildNormalizedMock(dayKey: string, scope: AdminScope): DashboardSummary {
  return normalizeSummary(dashboardSummarySchema.parse(buildMockSummary(dayKey, scope)))
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

  return normalizeSummary(toDashboardSummary(dto))
}
