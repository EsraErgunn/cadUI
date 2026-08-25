import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GAS_FIRM_PAGE_SIZE,
  getFirmGroups,
  getGasDistributionFirms,
  getGasDistributionFirmsByGroup,
} from '../adminFirms'

const LIST_DTO = [
  {
    id: 1,
    title: 'Adana Doğalgaz Dağıtım A.Ş.',
    companyNumber: 1204,
    groupId: 1,
    groupName: 'AKSA',
  },
  {
    id: 2,
    title: 'ÇORUMGAZ',
    companyNumber: 1206,
    groupId: null,
    groupName: null,
  },
]

const LIST_QUERY = {
  nameQuery: '',
  groupId: null,
  scopeFirmId: null,
  sortKey: 'dfirmNo',
  sortDir: 'asc',
  page: 1,
  pageSize: GAS_FIRM_PAGE_SIZE,
} as const

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Uç 2026-08-16'da sayfalı zarfa geçti. `totalCount` öğe sayısına eşit:
 * tek sayfaya sığan yanıt, `fetchAllPages` ikinci istek atmasın.
 */
function listPage(
  items: unknown[],
  envelope: { page?: number; pageSize?: number; totalCount?: number } = {},
): Response {
  return jsonResponse({
    items,
    totalCount: envelope.totalCount ?? items.length,
    page: envelope.page ?? 1,
    pageSize: envelope.pageSize ?? 100,
  })
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestOf(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
  const [url, init] = fetchMock.mock.calls[index]
  return { url: String(url), method: init.method as string }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getGasDistributionFirms', () => {
  it('liste ucuna gider ve alan adlarını çevirir', async () => {
    const fetchMock = stubFetch(listPage(LIST_DTO))

    const page = await getGasDistributionFirms(LIST_QUERY)

    expect(requestOf(fetchMock).url).toContain('/api/gasdistributionfirms')
    expect(requestOf(fetchMock).method).toBe('GET')
    expect(page.items[0].dfirmNo).toBe(1204)
    expect(page.items[0].name).toBe('Adana Doğalgaz Dağıtım A.Ş.')
    expect(page.items[0].groupId).toBe(1)
  })

  /**
   * Sayfalama hâlâ İSTEMCİDE (K27): uç ünvan araması ve tek firma daraltması
   * almadığı için liste tümüyle çekilip burada dilimleniyor. İstenen
   * `pageSize: 1` sorguya YANSIMAZ.
   */
  it('ekranın sayfa boyutunu uca YANSITMAZ, dilimlemeyi istemcide yapar', async () => {
    const fetchMock = stubFetch(listPage(LIST_DTO))

    const page = await getGasDistributionFirms({ ...LIST_QUERY, page: 1, pageSize: 1 })

    expect(requestOf(fetchMock).url).not.toContain('PageSize=1&')
    expect(requestOf(fetchMock).url).toContain('PageSize=100')
    expect(page.items).toHaveLength(1)
    expect(page.totalCount).toBe(2)
  })

  /** Arama istemcide ve Türkçe duyarsız; uca `Search` GİTMEZ (uçta yok). */
  it('ad araması gerçek veriden süzer', async () => {
    const fetchMock = stubFetch(listPage(LIST_DTO))

    const page = await getGasDistributionFirms({ ...LIST_QUERY, nameQuery: 'çorum' })

    expect(page.items.map((firm) => firm.name)).toEqual(['ÇORUMGAZ'])
    expect(requestOf(fetchMock).url).not.toContain('Search=')
  })
})

describe('getGasDistributionFirmsByGroup', () => {
  /**
   * Grup süzgeci SUNUCUDA: `GasDistributionGroupId` uçta ZATEN vardı, eskiden
   * bütün firma listesi indirilip istemcide süzülüyordu.
   */
  it('grup süzgecini uca gönderir', async () => {
    const fetchMock = stubFetch(listPage([LIST_DTO[0]]))

    const firms = await getGasDistributionFirmsByGroup(1)

    expect(requestOf(fetchMock).url).toContain('GasDistributionGroupId=1')
    expect(firms.map((firm) => firm.name)).toEqual(['Adana Doğalgaz Dağıtım A.Ş.'])
  })

  it('gruba bağlı kayıt yoksa boş döner', async () => {
    stubFetch(listPage([]))

    expect(await getGasDistributionFirmsByGroup(99)).toEqual([])
  })
})

describe('getFirmGroups', () => {
  it('grup ucuna gider ve Türkçe sıralar', async () => {
    const fetchMock = stubFetch(
      jsonResponse([
        { id: 3, name: 'DOĞUGAZ' },
        { id: 2, name: 'ÇEDAŞ' },
        { id: 1, name: 'AKSA' },
      ]),
    )

    const groups = await getFirmGroups()

    expect(requestOf(fetchMock).url).toContain('/api/gasdistributiongroups')
    expect(groups.map((group) => group.name)).toEqual(['AKSA', 'ÇEDAŞ', 'DOĞUGAZ'])
  })
})
