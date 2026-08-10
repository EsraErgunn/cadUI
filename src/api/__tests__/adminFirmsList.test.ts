import { afterEach, describe, expect, it, vi } from 'vitest'

import { GAS_FIRM_PAGE_SIZE, getFirmGroups, getGasDistributionFirms } from '../adminFirms'

const LIST_DTO = [
  {
    id: 1,
    title: 'Adana Doğalgaz Dağıtım A.Ş.',
    companyNumber: 1204,
    groupId: 1,
    groupName: 'AKSA',
    contactPerson: 'Ahmet Yılmaz',
  },
  {
    id: 2,
    title: 'ÇORUMGAZ',
    companyNumber: 1206,
    groupId: null,
    groupName: null,
    contactPerson: null,
  },
]

const LIST_QUERY = {
  nameQuery: '',
  groupId: null,
  region: null,
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
    const fetchMock = stubFetch(jsonResponse(LIST_DTO))

    const page = await getGasDistributionFirms(LIST_QUERY)

    expect(requestOf(fetchMock).url).toContain('/api/gasdistributionfirms')
    expect(requestOf(fetchMock).method).toBe('GET')
    expect(page.items[0].dfirmNo).toBe(1204)
    expect(page.items[0].name).toBe('Adana Doğalgaz Dağıtım A.Ş.')
    expect(page.items[0].groupId).toBe(1)
  })

  // Sunucu satırda bölge taşımıyor; alan korunuyor ama boş geliyor.
  it('bölgeyi null taşır', async () => {
    stubFetch(jsonResponse(LIST_DTO))

    expect((await getGasDistributionFirms(LIST_QUERY)).items[0].region).toBeNull()
  })

  it('sayfalamayı istemcide yapar — uca parametre GÖNDERMEZ', async () => {
    const fetchMock = stubFetch(jsonResponse(LIST_DTO))

    const page = await getGasDistributionFirms({ ...LIST_QUERY, page: 1, pageSize: 1 })

    expect(requestOf(fetchMock).url).not.toContain('page=')
    expect(requestOf(fetchMock).url).not.toContain('pageSize=')
    expect(page.items).toHaveLength(1)
    expect(page.totalCount).toBe(2)
  })

  /**
   * Benzer ad uyarısı (`useGasFirmForm.checkSimilarNames`) bu fonksiyonu
   * çağırıyor; fonksiyon gerçek uca gittiği için uyarı da gerçek veriye bakıyor.
   * Mock'a bakarken veritabanındaki mükerrer adı göremiyordu.
   */
  it('ad araması gerçek veriden süzer', async () => {
    stubFetch(jsonResponse(LIST_DTO))

    const page = await getGasDistributionFirms({ ...LIST_QUERY, nameQuery: 'çorum' })

    expect(page.items.map((firm) => firm.name)).toEqual(['ÇORUMGAZ'])
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
