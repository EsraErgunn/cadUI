import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getAuthorizedGasFirms,
  getAuthorizedProjectFirms,
  getProjectFirmAuthorizations,
  NO_AUTHORIZATION_MESSAGE,
  pickEffectiveAuthorization,
  ProjectFirmAuthorizationError,
  resolveProjectFirmAuthorizationId,
  type ProjectFirmAuthorizationRef,
} from '../projectFirmAuthorizations'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const NOW = Date.parse('2026-08-16T12:00:00Z')

function row(overrides: Partial<ProjectFirmAuthorizationRef> = {}): ProjectFirmAuthorizationRef {
  return {
    id: 1,
    projectFirmId: 11,
    projectFirmName: 'Anadolu Mühendislik',
    gasDistributionFirmId: 101,
    gasDistributionFirmName: 'Başkentgaz',
    validFrom: '2026-01-01T00:00:00Z',
    validTo: null,
    ...overrides,
  }
}

describe('pickEffectiveAuthorization', () => {
  it('yürürlükteki tek kaydı seçer', () => {
    expect(pickEffectiveAuthorization([row({ id: 7 })], NOW)?.id).toBe(7)
  })

  it('bitiş tarihi boş kaydı süresiz sayar', () => {
    expect(pickEffectiveAuthorization([row({ validTo: null })], NOW)).not.toBeNull()
  })

  it('süresi geçmiş kaydı seçmez', () => {
    const expired = row({ validTo: '2026-06-30T00:00:00Z' })

    expect(pickEffectiveAuthorization([expired], NOW)).toBeNull()
  })

  it('henüz başlamamış kaydı seçmez', () => {
    const future = row({ validFrom: '2026-12-01T00:00:00Z' })

    expect(pickEffectiveAuthorization([future], NOW)).toBeNull()
  })

  /**
   * SINIR KURALI (karar): geçerlilik GÜN bazlı ve iki uçta da DAHİL.
   * `validTo` bugünse yetki bugün hâlâ geçerli — gerçek veride bu alan gece
   * yarısına kurulu oluyor ve anlık karşılaştırma son günü kullanıcıdan alırdı.
   */
  it('validTo BUGÜN ise geçerli sayar — günün başında bile', () => {
    const endsToday = row({ validTo: '2026-08-16T00:00:00Z' })

    expect(pickEffectiveAuthorization([endsToday], NOW)).not.toBeNull()
  })

  it('validTo bugünse günün SONUNA kadar geçerli', () => {
    const endsToday = row({ validTo: '2026-08-16T00:00:00Z' })
    const lastMs = Date.parse('2026-08-16T23:59:59.999Z')

    expect(pickEffectiveAuthorization([endsToday], lastMs)).not.toBeNull()
  })

  it('validTo DÜN ise geçersiz', () => {
    const endedYesterday = row({ validTo: '2026-08-15T23:59:59Z' })

    expect(pickEffectiveAuthorization([endedYesterday], NOW)).toBeNull()
  })

  it('validFrom BUGÜN ise geçerli — günün başından itibaren', () => {
    const startsToday = row({ validFrom: '2026-08-16T23:00:00Z' })
    const dayStart = Date.parse('2026-08-16T00:00:00Z')

    expect(pickEffectiveAuthorization([startsToday], dayStart)).not.toBeNull()
  })

  /**
   * Uç dilim eki YAZMIYOR (`2026-08-16T13:47:30.3281981`); yerel kabul
   * edilseydi UTC+3'te gün sınırı üç saat kayardı (`serverTimestamp.ts`).
   */
  it('dilim eksiz damgayı UTC sayar', () => {
    const endsToday = row({ validTo: '2026-08-16T00:00:00' })

    expect(pickEffectiveAuthorization([endsToday], NOW)).not.toBeNull()
  })

  /**
   * Yenilenen belge: aynı firma çifti için iki satır. Eskisine proje bağlanırsa
   * kayıt yürürlükten kalkmış bir yetkiye asılı kalır.
   */
  it('birden fazla yürürlükteki kayıttan `validFrom` en yenisini seçer', () => {
    const rows = [
      row({ id: 1, validFrom: '2025-01-01T00:00:00Z' }),
      row({ id: 2, validFrom: '2026-07-01T00:00:00Z' }),
      row({ id: 3, validFrom: '2026-03-01T00:00:00Z' }),
    ]

    expect(pickEffectiveAuthorization(rows, NOW)?.id).toBe(2)
  })

  it('süresi geçmişleri atlayıp yürürlükteki eski kaydı seçer', () => {
    const rows = [
      row({ id: 1, validFrom: '2026-07-01T00:00:00Z', validTo: '2026-08-01T00:00:00Z' }),
      row({ id: 2, validFrom: '2026-02-01T00:00:00Z' }),
    ]

    expect(pickEffectiveAuthorization(rows, NOW)?.id).toBe(2)
  })

  it('boş listede null döner', () => {
    expect(pickEffectiveAuthorization([], NOW)).toBeNull()
  })

  /** Sunucu biçim değiştirirse yetki sessizce kaybolmasın. */
  it('okunamayan bitiş tarihini süresiz sayar', () => {
    expect(pickEffectiveAuthorization([row({ validTo: 'bozuk' })], NOW)).not.toBeNull()
  })
})

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Tek sayfaya sığan yanıt: `totalCount` öğe sayısına eşit. */
function stubAuthorizationFetch(items: unknown[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(() =>
    Promise.resolve(jsonResponse({ items, totalCount: items.length, page: 1, pageSize: 100 })),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Sunucuyu sayfalayarak taklit eder — uçta varsayılan `pageSize` 30. */
function stubPagedAuthorizationFetch(all: unknown[], serverPageSize = 30) {
  const fetchMock = vi.fn((url: unknown) => {
    const page = Number(new URL(String(url), 'http://x').searchParams.get('Page') ?? '1')
    const start = (page - 1) * serverPageSize

    return Promise.resolve(
      jsonResponse({
        items: all.slice(start, start + serverPageSize),
        totalCount: all.length,
        page,
        pageSize: serverPageSize,
      }),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('resolveProjectFirmAuthorizationId', () => {
  it('firma çiftini sorgu parametresi olarak gönderir', async () => {
    const fetchMock = stubAuthorizationFetch([row()])

    await resolveProjectFirmAuthorizationId({ projectFirmId: 11, gasDistributionFirmId: 101 })

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('ProjectFirmId=11')
    expect(url).toContain('GasDistributionFirmId=101')
  })

  it('yürürlükteki kaydın kimliğini döndürür', async () => {
    stubAuthorizationFetch([row({ id: 42 })])

    const id = await resolveProjectFirmAuthorizationId({
      projectFirmId: 11,
      gasDistributionFirmId: 101,
    })

    expect(id).toBe(42)
  })

  /**
   * Sabit kimliğin (`= 1`) yerine sessiz bir varsayılan KONULMADI: yetki yoksa
   * proje hiç açılmamalı, yanlış bağla açılmamalı.
   */
  it('yetki kaydı yoksa anlaşılır hata fırlatır', async () => {
    stubAuthorizationFetch([])

    await expect(
      resolveProjectFirmAuthorizationId({ projectFirmId: 11, gasDistributionFirmId: 101 }),
    ).rejects.toThrow(ProjectFirmAuthorizationError)
  })

  it('hata mesajı kullanıcıya gösterilebilir metni taşır', async () => {
    stubAuthorizationFetch([row({ validTo: '2026-01-02T00:00:00Z' })])

    await expect(
      resolveProjectFirmAuthorizationId({ projectFirmId: 11, gasDistributionFirmId: 101 }),
    ).rejects.toThrow(NO_AUTHORIZATION_MESSAGE)
  })

  /**
   * Gerçek uçta `totalCount: 39` iken 30 satır dönüyordu; süzgeçli çağrı bugün
   * küçük diye tek sayfaya güvenilmiyor.
   */
  it('süzgeçli çağrıda da tüm sayfaları toplar', async () => {
    const all = Array.from({ length: 39 }, (_, index) => row({ id: index + 1 }))
    const fetchMock = stubPagedAuthorizationFetch(all)

    const rows = await getProjectFirmAuthorizations({ projectFirmId: 11 })

    expect(rows).toHaveLength(39)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('sayfa isteğinde süzgeci HER sayfada tekrar gönderir', async () => {
    const all = Array.from({ length: 39 }, (_, index) => row({ id: index + 1 }))
    const fetchMock = stubPagedAuthorizationFetch(all)

    await getProjectFirmAuthorizations({ projectFirmId: 11 })

    for (const [url] of fetchMock.mock.calls) {
      expect(String(url)).toContain('ProjectFirmId=11')
    }
  })
})

describe('getAuthorizedGasFirms', () => {
  it('süresi dolmuş yetkinin firmasını ÖNERMEZ', async () => {
    stubAuthorizationFetch([
      row({ id: 1, gasDistributionFirmId: 1, gasDistributionFirmName: 'Aksa', validTo: null }),
      row({
        id: 2,
        gasDistributionFirmId: 2,
        gasDistributionFirmName: 'Torosgaz',
        validTo: '2026-05-16T13:47:30',
      }),
    ])

    const firms = await getAuthorizedGasFirms(11)

    expect(firms.map((firm) => firm.name)).toEqual(['Aksa'])
  })

  it('aynı firmanın iki yetkisini tek satıra indirir', async () => {
    stubAuthorizationFetch([
      row({ id: 1, gasDistributionFirmId: 5, gasDistributionFirmName: 'Enerya' }),
      row({ id: 2, gasDistributionFirmId: 5, gasDistributionFirmName: 'Enerya' }),
    ])

    expect(await getAuthorizedGasFirms(11)).toHaveLength(1)
  })

  /** Sunucu 'Ç'yi 'D'den sonra veriyor; sıralama istemcide ve Türkçe (K85). */
  it('Türkçe sıralar', async () => {
    stubAuthorizationFetch([
      row({ id: 1, gasDistributionFirmId: 1, gasDistributionFirmName: 'Doğugaz' }),
      row({ id: 2, gasDistributionFirmId: 2, gasDistributionFirmName: 'Çorumgaz' }),
      row({ id: 3, gasDistributionFirmId: 3, gasDistributionFirmName: 'Aksa' }),
    ])

    expect((await getAuthorizedGasFirms(11)).map((firm) => firm.name)).toEqual([
      'Aksa',
      'Çorumgaz',
      'Doğugaz',
    ])
  })

  it('yalnız o proje firmasının yetkilerini ister', async () => {
    const fetchMock = stubAuthorizationFetch([row()])

    await getAuthorizedGasFirms(11)

    expect(String(fetchMock.mock.calls[0][0])).toContain('ProjectFirmId=11')
  })
})

/**
 * KK-20 daraltması. `getAuthorizedGasFirms`'in aynası olduğu için aynı kurallar
 * sınanıyor: daraltma sunucuda, süre kuralı ve tekilleştirme istemcide.
 */
describe('getAuthorizedProjectFirms', () => {
  it('yalnız o gaz dağıtım firmasının yetkilerini ister', async () => {
    const fetchMock = stubAuthorizationFetch([row()])

    await getAuthorizedProjectFirms(101)

    expect(String(fetchMock.mock.calls[0][0])).toContain('GasDistributionFirmId=101')
  })

  it('süresi dolmuş yetkinin proje firmasını ÖNERMEZ', async () => {
    stubAuthorizationFetch([
      row({ id: 1, projectFirmId: 11, projectFirmName: 'Anadolu', validTo: null }),
      row({
        id: 2,
        projectFirmId: 12,
        projectFirmName: 'Beyaz Tesisat',
        validTo: '2020-05-16T13:47:30',
      }),
    ])

    expect((await getAuthorizedProjectFirms(101)).map((firm) => firm.name)).toEqual(['Anadolu'])
  })

  it('aynı firmanın iki yetkisini tek satıra indirir', async () => {
    stubAuthorizationFetch([
      row({ id: 1, projectFirmId: 11, projectFirmName: 'Anadolu' }),
      row({ id: 2, projectFirmId: 11, projectFirmName: 'Anadolu' }),
    ])

    expect(await getAuthorizedProjectFirms(101)).toHaveLength(1)
  })

  it('Türkçe sıralar', async () => {
    stubAuthorizationFetch([
      row({ id: 1, projectFirmId: 11, projectFirmName: 'Doğu Mühendislik' }),
      row({ id: 2, projectFirmId: 12, projectFirmName: 'Çorum Proje' }),
    ])

    expect((await getAuthorizedProjectFirms(101)).map((firm) => firm.name)).toEqual([
      'Çorum Proje',
      'Doğu Mühendislik',
    ])
  })

  it('tüm sayfaları toplar', async () => {
    const all = Array.from({ length: 39 }, (_, index) =>
      row({ id: index + 1, projectFirmId: index + 1, projectFirmName: `Firma ${index + 1}` }),
    )
    stubPagedAuthorizationFetch(all)

    expect(await getAuthorizedProjectFirms(101)).toHaveLength(39)
  })
})
