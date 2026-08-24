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
   * Sayfalama artık SUNUCUDA: ekranın istediği sayfa ve boyut olduğu gibi uca
   * gidiyor. Eskiden bütün kayıtlar sayfa sayfa indirilip istemcide
   * dilimleniyordu (K27'nin geçici istisnası).
   */
  it('ekranın sayfasını ve boyutunu uca yansıtır', async () => {
    const fetchMock = stubFetch(listPage(LIST_DTO, { page: 2, pageSize: 1, totalCount: 2 }))

    const page = await getGasDistributionFirms({ ...LIST_QUERY, page: 2, pageSize: 1 })

    const url = requestOf(fetchMock).url
    expect(url).toContain('Page=2')
    expect(url).toContain('PageSize=1')
    // Gelen sayfa olduğu gibi çiziliyor; toplam sunucudan.
    expect(page.items).toHaveLength(2)
    expect(page.totalCount).toBe(2)
  })

  /** Arama uca `Search` olarak gider; gelen sayfa istemcide bir daha süzülmez. */
  it('aramayı uca Search olarak gönderir', async () => {
    const fetchMock = stubFetch(listPage(LIST_DTO))

    await getGasDistributionFirms({ ...LIST_QUERY, nameQuery: 'çorum' })

    expect(requestOf(fetchMock).url).toContain('Search=%C3%A7orum')
  })

  /** Boş süzgeç parametre olarak HİÇ yazılmaz. */
  it('boş süzgeçleri sorguya yazmaz', async () => {
    const fetchMock = stubFetch(listPage(LIST_DTO))

    await getGasDistributionFirms(LIST_QUERY)

    const url = requestOf(fetchMock).url
    expect(url).not.toContain('Search=')
    expect(url).not.toContain('GasDistributionGroupId=')
    expect(url).not.toContain('Id=')
  })

  /** Üst bardaki kapsam tek firmaysa liste o satıra iner. */
  it('kapsam firmasını Id olarak gönderir', async () => {
    const fetchMock = stubFetch(listPage(LIST_DTO))

    await getGasDistributionFirms({ ...LIST_QUERY, scopeFirmId: 7 })

    expect(requestOf(fetchMock).url).toContain('Id=7')
  })
})

describe('getGasDistributionFirmsByGroup', () => {
  /**
   * Süzgeç SUNUCUDA: eskiden bütün firma listesi indirilip istemcide
   * süzülüyordu, tek bir grup için onlarca kayıt ağdan geçiyordu.
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
