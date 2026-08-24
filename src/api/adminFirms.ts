import { z } from 'zod'

import { MOCK_FIRM_GROUPS, allMockFirms, createMockFirmGroup } from './adminFirmsMock'
import {
  firmGroupDtoSchema,
  firmGroupListDtoSchema,
  firmListPageSchema,
  toFirmListItem,
  toSortedFirmGroups,
  type FirmGroup,
} from './gasFirmDto'
import { queryFirmList } from './gasFirmListQuery'
import { hasApiBaseUrl, requestJson } from './http'
import { fetchAllPages } from './listQuery'
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
 * GET  /api/gasdistributiongroups → [{ id, name }]
 * POST /api/gasdistributiongroups → { name } → 200 + { id, name }
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
  /**
   * Üst bardaki kapsam TEK bir gaz dağıtım firmasıysa onun kimliği (URL'de
   * `gdfirm`). Grup zaten `groupId` ile aynı anahtarı paylaşıyordu; firma
   * kapsamı seçilince liste o tek satıra iner, yoksa üst bar "AKSA Gebze" der
   * ama tabloda bütün firmalar dururdu.
   */
  scopeFirmId: number | null
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

/** İstemcinin sıralama anahtarları ↔ sunucununkiler. */
const FIRM_SORT_KEY_PARAMS: Record<GasFirmSortKey, string> = {
  dfirmNo: 'companyNumber',
  groupName: 'groupName',
  name: 'title',
}

/**
 * `GET /api/gasdistributionfirms` — süzme, sıralama ve sayfalama SUNUCUDA.
 *
 * Liste bir süre TÜM kayıtları sayfa sayfa indirip istemcide süzüyordu (K27'nin
 * geçici istisnası): 30'ar kayıtlık N istek atılıyor, sonra çoğu atılıyordu.
 * Uç arama ve tek firma kapsamını da aldığı için o istisna kalktı.
 */
export async function getGasDistributionFirms(
  query: GasDistributionFirmQuery,
  signal?: AbortSignal,
): Promise<GasDistributionFirmPage> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    const { items, totalCount } = queryFirmList(allMockFirms(), query)
    return gasDistributionFirmPageSchema.parse({
      items,
      totalCount,
      page: query.page,
      pageSize: query.pageSize,
    })
  }

  const search = new URLSearchParams({
    SortBy: FIRM_SORT_KEY_PARAMS[query.sortKey],
    SortDir: query.sortDir,
    Page: String(query.page),
    PageSize: String(query.pageSize),
  })

  // Boş süzgeç parametre olarak HİÇ yazılmaz; "tümü" demek için yokluğu kullanılır.
  if (query.nameQuery !== '') search.set('Search', query.nameQuery)
  if (query.groupId !== null) search.set('GasDistributionGroupId', String(query.groupId))
  if (query.scopeFirmId !== null) search.set('Id', String(query.scopeFirmId))

  const page = await requestJson(
    { method: 'GET', path: `/api/gasdistributionfirms?${search.toString()}`, signal },
    firmListPageSchema,
  )

  // Şemadan geçiyor: sözleşme kayması bileşenin içinde değil sınırda patlasın.
  return gasDistributionFirmPageSchema.parse({
    items: page.items.map(toFirmListItem),
    totalCount: page.totalCount,
    page: query.page,
    pageSize: query.pageSize,
  })
}

/**
 * TÜM listeyi çeker. Arama, sıralama ve sayfalama istemcide yapılıyor —
 * CLAUDE.md "sayfalama sunucu taraflı" kuralının bilinçli, GEÇİCİ istisnası
 * (K27).
 *
 * Uç 2026-08-16'da sayfalı zarfa geçti ve parametresiz çağrıda yalnız İLK 30
 * kaydı veriyor. Fonksiyonun sözleşmesi ("hepsi") değişmesin diye sayfalar
 * `fetchAllPages` ile toplanıyor; çağıranların hiçbiri değişmedi.
 */
export async function fetchAllFirms(signal?: AbortSignal): Promise<GasDistributionFirm[]> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    return allMockFirms()
  }

  const dtos = await fetchAllPages(({ page, pageSize }) =>
    requestJson(
      {
        method: 'GET',
        path: `/api/gasdistributionfirms?Page=${page}&PageSize=${pageSize}`,
        signal,
      },
      firmListPageSchema,
    ),
  )

  return dtos.map(toFirmListItem)
}

/**
 * Bir grup firmasına bağlı gaz dağıtım firmaları ("AKSA-GEMLİK" gibi).
 *
 * Proje firması ekleme ekranındaki "G.D Firması Bölgeleri" listesinin kaynağı.
 * Süzgeç artık SUNUCUDA (`GasDistributionGroupId`): eskiden bütün firma listesi
 * sayfa sayfa indirilip istemcide süzülüyordu — tek bir grup için onlarca
 * kaydın tamamı ağdan geçiyordu.
 *
 * Sıralama İSTEMCİDE kaldı ve Türkçe: sunucu 'Ç'yi 'D'den sonra veriyor.
 */
export async function getGasDistributionFirmsByGroup(
  groupId: number,
  signal?: AbortSignal,
): Promise<GasDistributionFirm[]> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    return allMockFirms()
      .filter((firm) => firm.groupId === groupId)
      .sort((left, right) => left.name.localeCompare(right.name, 'tr'))
  }

  const dtos = await fetchAllPages(({ page, pageSize }) =>
    requestJson(
      {
        method: 'GET',
        path: `/api/gasdistributionfirms?GasDistributionGroupId=${groupId}&Page=${page}&PageSize=${pageSize}`,
        signal,
      },
      firmListPageSchema,
    ),
  )

  return dtos
    .map(toFirmListItem)
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

/**
 * `POST /api/gasdistributiongroups` → yeni grup firması. Gövde tek alan: `name`.
 *
 * Form ekranındaki "+" düğmesi buraya bağlı; kayıt sonrası çağıran `firmGroups`
 * sorgusunu tazeleyip yeni grubu seçiyor. API kökü yokken liste mock'una
 * yazılıyor — aksi hâlde eklenen grup açılır listede hiç görünmezdi.
 */
export async function createFirmGroup(name: string, signal?: AbortSignal): Promise<FirmGroup> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    return createMockFirmGroup(name)
  }

  return requestJson(
    {
      method: 'POST',
      path: '/api/gasdistributiongroups',
      rawJsonBody: JSON.stringify({ name }),
      signal,
    },
    firmGroupDtoSchema,
  )
}

