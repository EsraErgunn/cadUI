import { z } from 'zod'

import { MOCK_FIRM_GROUPS, MOCK_REGIONS, queryMockFirms } from './adminFirmsMock'
import { pagedResultSchema, type PagedResult, type SortDirection } from './listQuery'

// Sıralama yönü artık ortak liste sözleşmesinde; firma ekranının mevcut import
// yolları kırılmasın diye buradan da dışa aktarılıyor.
export { SORT_DIRECTIONS, type SortDirection } from './listQuery'

/**
 * API SÖZLEŞMESİ - Gaz dağıtım firmaları listesi.
 *
 * GET /api/admin/gas-distribution-firms
 * - q: Firma adı (içerik bazlı, büyük/küçük harf ve Türkçe karakter duyarsız)
 * - group: Grup adı (tam eşleşme)
 * - region: Bölge (tam eşleşme)
 * - sort: dfirmNo | groupName | name (varsayılan: dfirmNo)
 * - dir: asc | desc (varsayılan: asc)
 * - page: 1 tabanlı
 * - pageSize: 30
 *
 * 200 → { items, totalCount, page, pageSize }
 * - items: Yalnızca istenen sayfanın kayıtları (sayfalama sunucuda yapılır).
 * - totalCount: Filtre uygulanmış toplam kayıt sayısı.
 * - dfirmNo: Olduğu gibi gösterilir, yeniden numaralandırılmaz.
 * - groupName: null ise arayüz "-" gösterir.
 *
 * GET /api/admin/firm-groups → string[]
 * GET /api/admin/regions → string[]
 */

export const GAS_FIRM_PAGE_SIZE = 30

export const GAS_FIRM_SORT_KEYS = ['dfirmNo', 'groupName', 'name'] as const
export type GasFirmSortKey = (typeof GAS_FIRM_SORT_KEYS)[number]

const gasDistributionFirmSchema = z.object({
  id: z.number().int().positive(),
  dfirmNo: z.number().int().positive(),
  groupName: z.string().nullable(),
  name: z.string(),
  region: z.string(),
})

const gasDistributionFirmPageSchema = pagedResultSchema(gasDistributionFirmSchema)

const nameListSchema = z.array(z.string())

export type GasDistributionFirm = z.infer<typeof gasDistributionFirmSchema>
export type GasDistributionFirmPage = PagedResult<GasDistributionFirm>

export interface GasDistributionFirmQuery {
  nameQuery: string
  groupName: string | null
  region: string | null
  sortKey: GasFirmSortKey
  sortDir: SortDirection
  page: number
  pageSize: number
}

const MOCK_LATENCY_MS = 320

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

/**
 *  gerçek `GET /api/admin/gas-distribution-firms` bağlanınca bu gövde
 * fetch + `gasDistributionFirmPageSchema.parse(await response.json())` olacak;
 * imza ve dönüş tipi aynı kalacağı için çağıran taraf değişmez.
 */
export async function getGasDistributionFirms(
  query: GasDistributionFirmQuery,
  signal?: AbortSignal,
): Promise<GasDistributionFirmPage> {
  await delay(MOCK_LATENCY_MS, signal)
  const { items, totalCount } = queryMockFirms(query)

  // Mock da olsa şemadan geçiyor: sözleşme bozulursa gerçek endpoint'ten önce burada patlar.
  return gasDistributionFirmPageSchema.parse({
    items,
    totalCount,
    page: query.page,
    pageSize: query.pageSize,
  })
}

/**  gerçek `GET /api/admin/firm-groups`. */
export async function getFirmGroups(signal?: AbortSignal): Promise<string[]> {
  await delay(MOCK_LATENCY_MS, signal)
  return nameListSchema.parse(MOCK_FIRM_GROUPS)
}

/**  gerçek `GET /api/admin/regions`. */
export async function getRegions(signal?: AbortSignal): Promise<string[]> {
  await delay(MOCK_LATENCY_MS, signal)
  return nameListSchema.parse(MOCK_REGIONS)
}
