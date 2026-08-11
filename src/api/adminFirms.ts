import { z } from 'zod'

import { MOCK_FIRM_GROUPS, allMockFirms } from './adminFirmsMock'
import {
  firmGroupListDtoSchema,
  firmListDtoSchema,
  toFirmListItem,
  toSortedFirmGroups,
  type FirmGroup,
} from './gasFirmDto'
import { queryFirmList } from './gasFirmListQuery'
import { hasApiBaseUrl, requestJson } from './http'
import { pagedResultSchema, type PagedResult, type SortDirection } from './listQuery'

export type { FirmGroup } from './gasFirmDto'

// Sıralama yönü artık ortak liste sözleşmesinde; firma ekranının mevcut import
// yolları kırılmasın diye buradan da dışa aktarılıyor.
export { SORT_DIRECTIONS, type SortDirection } from './listQuery'

/**
 * API SÖZLEŞMESİ — Gaz dağıtım firmaları listesi.
 *
 * GET /api/gasdistributionfirms → FirmListItemDto[]
 * - Filtresiz, sayfalamasız DÜZ DİZİ. `q`/`page`/`pageSize`/`sort` YOK.
 * - Arama, sıralama ve sayfalama bu yüzden İSTEMCİDE (`gasFirmListQuery.ts`).
 *   Geçici: backend sayfalı uç açınca kaldırılacak (docs/kararlar.md K27).
 * - `groupName` null ise arayüz "-" gösterir.
 * - `dfirmNo` olduğu gibi gösterilir, yeniden numaralandırılmaz.
 *
 * GET /api/gasdistributiongroups → [{ id, name }]
 *
 * Bölge alanı ve bölge listesi ucu KALDIRILDI: sunucu satırda bölge taşımıyordu,
 * onu okuyan tek yüzey de üst bardaki kapsam seçicisiydi (docs/kararlar.md K31).
 *
 * Ekle/güncelle ekranının uçları ayrı dosyada: `adminFirmForm.ts`.
 * `VITE_API_URL` tanımlı değilse liste de mock gövdeye düşer.
 */

export const GAS_FIRM_PAGE_SIZE = 30

export const GAS_FIRM_SORT_KEYS = ['dfirmNo', 'groupName', 'name'] as const
export type GasFirmSortKey = (typeof GAS_FIRM_SORT_KEYS)[number]

/** Liste satırı. */
export const gasDistributionFirmSchema = z.object({
  id: z.number().int().positive(),
  dfirmNo: z.number().int(),
  groupId: z.number().int().nullable(),
  groupName: z.string().nullable(),
  name: z.string(),
})

const gasDistributionFirmPageSchema = pagedResultSchema(gasDistributionFirmSchema)

export type GasDistributionFirm = z.infer<typeof gasDistributionFirmSchema>
export type GasDistributionFirmPage = PagedResult<GasDistributionFirm>

export interface GasDistributionFirmQuery {
  nameQuery: string
  /** Grup artık ADLA değil KİMLİKLE süzülüyor — gerçek veri kimlik taşıyor. */
  groupId: number | null
  sortKey: GasFirmSortKey
  sortDir: SortDirection
  page: number
  pageSize: number
}

/** Mock gecikmesi. Gerçek uçlar bağlanınca bu sabit de `delay` de silinecek;
    ekle/güncelle dosyası (`adminFirmForm.ts`) aynı gecikmeyi paylaşsın diye dışa açık. */
export const MOCK_LATENCY_MS = 320

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
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
  const firms = await fetchAllFirms(signal)
  const { items, totalCount } = queryFirmList(firms, query)

  // Şemadan geçiyor: sözleşme kayması bileşenin içinde değil sınırda patlasın.
  return gasDistributionFirmPageSchema.parse({
    items,
    totalCount,
    page: query.page,
    pageSize: query.pageSize,
  })
}

/**
 * TÜM listeyi tek seferde çeker. Uçta `q`/`page`/`pageSize`/`sort` yok, bu
 * yüzden arama, sıralama ve sayfalama istemcide yapılıyor — CLAUDE.md
 * "sayfalama sunucu taraflı" kuralının bilinçli, GEÇİCİ istisnası (K27).
 */
async function fetchAllFirms(signal?: AbortSignal): Promise<GasDistributionFirm[]> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    return allMockFirms()
  }

  const dtos = await requestJson(
    { method: 'GET', path: '/api/gasdistributionfirms', signal },
    firmListDtoSchema,
  )

  return dtos.map(toFirmListItem)
}

/**
 * Bir grup firmasına bağlı gaz dağıtım firmaları ("AKSA-GEMLİK" gibi).
 *
 * Proje firması ekleme ekranındaki "G.D Firması Bölgeleri" listesinin kaynağı:
 * gereksinim bölgeleri "seçilen gruba bağlı gaz dağıtım firmaları" olarak
 * tanımlıyor. Uçta grup süzgeci YOK, bu yüzden liste tümüyle çekilip burada
 * süzülüyor — sayfalı liste ekranıyla aynı geçici çözüm (K27).
 *
 * Sıralama İSTEMCİDE ve Türkçe: sunucu 'Ç'yi 'D'den sonra veriyor.
 */
export async function getGasDistributionFirmsByGroup(
  groupId: number,
  signal?: AbortSignal,
): Promise<GasDistributionFirm[]> {
  const firms = await fetchAllFirms(signal)

  return firms
    .filter((firm) => firm.groupId === groupId)
    .sort((left, right) => left.name.localeCompare(right.name, 'tr'))
}

/**
 * `GET /api/gasdistributiongroups` → `[{ id, name }]` (kısa adlar: AKSA, ENERYA…).
 *
 * Sıralama İSTEMCİDE: sunucu Türkçe sıralamıyor, ÇEDAŞ'ı DOĞUGAZ'dan önce
 * veriyor. Sıralama `toSortedFirmGroups` içinde tek yerde, böylece form seçim
 * kutusu ile liste filtresi aynı sırayı görür.
 */
export async function getFirmGroups(signal?: AbortSignal): Promise<FirmGroup[]> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    return toSortedFirmGroups(MOCK_FIRM_GROUPS)
  }

  const dtos = await requestJson(
    { method: 'GET', path: '/api/gasdistributiongroups', signal },
    firmGroupListDtoSchema,
  )

  return toSortedFirmGroups(dtos)
}

