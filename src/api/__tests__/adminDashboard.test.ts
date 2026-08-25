import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GLOBAL_SCOPE,
  MAX_DENSITY_ROWS,
  getDashboardSummary,
  type AdminScope,
} from '../adminDashboard'
import {
  MOCK_SCOPE_NAMES,
  allMockScopeFacts,
  queryMockDayActivity,
} from '../adminDashboardMock'
import { toDayKey } from '../dayKey'
import { ApiError, NetworkError } from '../http'

/** Mock hareketler uygulamanın açıldığı güne yazılıyor; testler de o günü sorar. */
const TODAY_KEY = toDayKey(new Date())

/** Mock'ta karşılığı olmayan bir gün: sayaçların sıfırlandığı hâli görmek için. */
const OTHER_DAY_KEY = '2020-01-01'

/**
 * GERÇEK ucun (`GET /api/admin/dashboard`) gövdesi. Alan adları arayüzünkilerle
 * bilerek FARKLI — eşlemenin gerçekten yapıldığı böyle görülür. Yoğunluk sırasız
 * veriliyor: sıralama ve üst sınır istemcinin garantisi.
 */
const RAW_SUMMARY = {
  summary: {
    gasDistributionUserCount: 2926,
    projectFirmCount: 11838,
    projectFirmUserCount: 24804,
  },
  today: { newProjectCount: 11, approvedCount: 3, rejectedCount: 0 },
  densityBy: 'group',
  density: [
    { id: 1, name: 'AKMERCAN', projectCount: 8 },
    { id: 2, name: 'AKSA', projectCount: 28 },
    { id: 3, name: 'ÇEDAŞ', projectCount: 22 },
    { id: 4, name: 'DOĞUGAZ', projectCount: 12 },
    { id: 5, name: 'ENERYA', projectCount: 16 },
    { id: 6, name: 'GAZDAŞ', projectCount: 4 },
    { id: 7, name: 'TOROSGAZ', projectCount: 2 },
  ],
  generatedAt: '2026-08-11T06:48:06.186985Z',
}

function stubFetch(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Gövde okunmadan hata üreten yanıt; `http.ts` bunu ApiError'a çeviriyor. */
function stubStatus(status: number) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ message: 'hata' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getDashboardSummary', () => {
  it('özet ucuna gider', async () => {
    const fetchMock = stubFetch(RAW_SUMMARY)

    await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/admin/dashboard')
  })

  /**
   * Uç `date` parametresi ALMIYOR: "bugün" sayaçlarını sunucu kendi gününe göre
   * hesaplıyor. Gün anahtarı istemcide yalnız sorgu anahtarı olarak yaşıyor.
   */
  it('gün anahtarını sorguya EKLEMEZ', async () => {
    const fetchMock = stubFetch(RAW_SUMMARY)

    await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    expect(String(fetchMock.mock.calls[0][0])).not.toContain('date=')
  })

  /** Grup kapsamı YALNIZ `gdGroupId` gönderir; `gdFirmId` ile birlikte ASLA. */
  it('grup kapsamını gdGroupId olarak gönderir', async () => {
    const fetchMock = stubFetch(RAW_SUMMARY)

    await getDashboardSummary(TODAY_KEY, { type: 'group', groupId: 2 })

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('gdGroupId=2')
    expect(url).not.toContain('gdFirmId')
  })

  /** Firma kapsamı YALNIZ `gdFirmId` gönderir; `gdGroupId` ile birlikte ASLA. */
  it('firma kapsamını gdFirmId olarak gönderir', async () => {
    const fetchMock = stubFetch(RAW_SUMMARY)

    await getDashboardSummary(TODAY_KEY, { type: 'firm', firmId: 42 })

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('gdFirmId=42')
    expect(url).not.toContain('gdGroupId')
  })

  // Kapsam yokken parametre HİÇ yazılmaz; boş `gdGroupId=` ayrı anlam taşıyabilir.
  it('sistem genelinde hiçbir kapsam parametresi yazılmaz', async () => {
    const fetchMock = stubFetch(RAW_SUMMARY)

    await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).not.toContain('gdGroupId')
    expect(url).not.toContain('gdFirmId')
    expect(url).not.toContain('?')
  })

  // Coğrafi bölge kavramı sunucudan kalktı; hiçbir kapsam onu yazmamalı.
  it('hiçbir kapsamda regionId gönderilmez', async () => {
    const scopes: AdminScope[] = [
      GLOBAL_SCOPE,
      { type: 'group', groupId: 2 },
      { type: 'firm', firmId: 42 },
    ]

    for (const scope of scopes) {
      vi.unstubAllGlobals()
      const fetchMock = stubFetch(RAW_SUMMARY)
      await getDashboardSummary(TODAY_KEY, scope)
      expect(String(fetchMock.mock.calls[0][0])).not.toContain('region')
    }
  })

  it('sunucunun alan adlarını arayüzünkilere çevirir', async () => {
    stubFetch(RAW_SUMMARY)

    const summary = await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    expect(summary.counts).toEqual({
      gasDistributionUsers: 2926,
      projectFirms: 11838,
      projectFirmUsers: 24804,
    })
    expect(summary.today).toEqual({ newProjects: 11, approved: 3, rejected: 0 })
  })

  // KK-5: en fazla beş satır, büyükten küçüğe. Sunucu sırasız dönse de garanti.
  it('yoğunluğu büyükten küçüğe sıralar ve beş satıra indirir', async () => {
    stubFetch(RAW_SUMMARY)

    const { density } = await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    expect(density).toHaveLength(MAX_DENSITY_ROWS)
    expect(density.map((row) => row.projectCount)).toEqual([28, 22, 16, 12, 8])
  })

  // Satır alanları sunucununkilerle AYNI: kimlik, ad ve proje adedi.
  it('yoğunluk satırını olduğu gibi taşır', async () => {
    stubFetch(RAW_SUMMARY)

    const { density } = await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    expect(density[0]).toEqual({ id: 2, name: 'AKSA', projectCount: 28 })
  })

  it('kırılımın boyutunu taşır — kart başlığı buna bağlı', async () => {
    stubFetch({ ...RAW_SUMMARY, densityBy: 'firm' })

    const { densityBy } = await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    expect(densityBy).toBe('firm')
  })

  /**
   * Beklenmeyen kırılım adı bütün paneli düşürmez: alan yalnız başlığı seçiyor,
   * sayılar yine doğru. Sunucu bir gün başka bir kırılım eklerse ekran çalışır.
   */
  it('tanınmayan densityBy değeri gruba düşer', async () => {
    stubFetch({ ...RAW_SUMMARY, densityBy: 'GasDistributionGroup' })

    const { densityBy } = await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    expect(densityBy).toBe('group')
  })

  // Sunucu yoğunluğu boş dönebilir; kart "veri yok" der, ekran ölmez.
  it('boş yoğunluk listesi hata değildir', async () => {
    stubFetch({ ...RAW_SUMMARY, density: [] })

    await expect(getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)).resolves.toHaveProperty(
      'density',
      [],
    )
  })

  /**
   * `generatedAt` arayüzde kullanılmıyor; sunucu onu kaldırdığında ekranın
   * sınırda patlaması gösterilmeyen bir alan uğruna alınacak bedel değil.
   */
  it('kullanılmayan generatedAt eksikse yine çözülür', async () => {
    stubFetch({
      summary: RAW_SUMMARY.summary,
      today: RAW_SUMMARY.today,
      densityBy: RAW_SUMMARY.densityBy,
      density: RAW_SUMMARY.density,
    })

    await expect(getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)).resolves.toHaveProperty('counts')
  })

  // KK-4: sıfır değer gizlenmez, veri katmanı da düşürmez.
  it('sıfır sayacı düşürmez', async () => {
    stubFetch(RAW_SUMMARY)

    expect((await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)).today.rejected).toBe(0)
  })

  it('sözleşme bozulursa sınırda patlar', async () => {
    stubFetch({ counts: { gasDistributionUsers: 1 } })

    await expect(getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)).rejects.toThrow()
  })
})

/**
 * Özet ucu ARTIK VAR: hiçbir durum kod mock'una yutulmuyor. Eskiden 404/501 ve
 * ağ hatası örnek veriye düşüyordu; uç açıldıktan sonra bu davranış sürseydi
 * gerçek bir arıza ekranda "çalışıyor" gibi görünürdü.
 */
describe('özet hatası yutulmaz', () => {
  it('404 mock’a DÜŞMEZ — yol yanlışsa görünmeli', async () => {
    stubStatus(404)

    await expect(getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)).rejects.toBeInstanceOf(ApiError)
  })

  it('501 mock’a DÜŞMEZ', async () => {
    stubStatus(501)

    await expect(getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)).rejects.toBeInstanceOf(ApiError)
  })

  it('API’ye hiç ulaşılamazsa hata ekranı görünür', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)).rejects.toBeInstanceOf(NetworkError)
  })

  it('401 yutulmaz — oturum düşmüşken sahte veri gösterilmez', async () => {
    stubStatus(401)

    await expect(getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)).rejects.toBeInstanceOf(ApiError)
  })

  it('403 yutulmaz', async () => {
    stubStatus(403)

    await expect(getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)).rejects.toBeInstanceOf(ApiError)
  })

  it('500 yutulmaz — gerçek hata ekranı görünmeli', async () => {
    stubStatus(500)

    await expect(getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)).rejects.toBeInstanceOf(ApiError)
  })
})

/**
 * Mock gövde SİLİNMEDİ: `VITE_API_URL` tanımsızken (backend'siz geliştirme)
 * ekran hâlâ ondan besleniyor. Artık `getDashboardSummary` üzerinden
 * sınanamıyor — testte API kökü tanımlı — bu yüzden kaynak doğrudan sorgulanıyor.
 */
describe('mock gövde gün kapsamı', () => {
  /**
   * "Bugün" sayaçları yalnız İSTENEN GÜNE ait kayıtları sayar. Mock hareketleri
   * uygulamanın açıldığı güne yazılı olduğu için başka bir gün sorulduğunda hiç
   * kayıt dönmez — gece yarısı ekranda görülecek davranış budur.
   */
  it('başka bir gün sorulduğunda hareket kalmaz', () => {
    expect(queryMockDayActivity(TODAY_KEY)).not.toHaveLength(0)
    expect(queryMockDayActivity(OTHER_DAY_KEY)).toHaveLength(0)
  })

  it('gün değişse de birikimli sayılar sıfırlanmaz', () => {
    // Kullanıcı/firma adetleri devreden toplamlar; güne bağlı değiller.
    expect(allMockScopeFacts()).not.toHaveLength(0)
  })

  // Kapsam seçilince yalnız o kapsamın satırları kalır (KK-2).
  it('kapsam mock kayıtları daraltır', () => {
    const scoped = allMockScopeFacts(MOCK_SCOPE_NAMES[0])

    expect(scoped).toHaveLength(1)
    expect(scoped[0].name).toBe(MOCK_SCOPE_NAMES[0])
  })
})
