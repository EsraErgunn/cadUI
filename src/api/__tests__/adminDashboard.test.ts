import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ANNOUNCEMENT_PAGE_SIZE,
  ANNOUNCEMENT_SUMMARY_MAX_LENGTH,
  MANAGEMENT_ANNOUNCEMENT_SOURCE,
  MAX_ANNOUNCEMENTS,
  MAX_REGION_ROWS,
  SYSTEM_ANNOUNCEMENT_SOURCE,
  getAnnouncements,
  getDashboardSummary,
  publishAnnouncement,
  truncateAnnouncementSummary,
} from '../adminDashboard'
import { MOCK_REGIONS } from '../adminFirmsMock'
import { toDayKey } from '../dayKey'
import { ApiError } from '../http'

const LONG_BODY = `${'kelime '.repeat(40)}son`

/** Mock hareketler uygulamanın açıldığı güne yazılıyor; testler de o günü sorar. */
const TODAY_KEY = toDayKey(new Date())

/** Mock'ta karşılığı olmayan bir gün: sayaçların sıfırlandığı hâli görmek için. */
const OTHER_DAY_KEY = '2020-01-01'

/** Sunucu bilerek SIRASIZ, LİMİTSİZ ve KISALTILMAMIŞ veriyle taklit ediliyor:
    kabul kriterlerini istemcinin garanti ettiği böyle görülür. */
const RAW_SUMMARY = {
  counts: { gasDistributionUsers: 2926, projectFirms: 11838, projectFirmUsers: 24804 },
  today: { newProjects: 11, approved: 3, rejected: 0 },
  regionDensity: [
    { region: 'Ege', count: 8 },
    { region: 'Marmara', count: 28 },
    { region: 'Akdeniz', count: 22 },
    { region: 'İç Anadolu', count: 12 },
    { region: 'Karadeniz', count: 16 },
    { region: 'Doğu Anadolu', count: 4 },
    { region: 'Güneydoğu Anadolu', count: 2 },
  ],
  announcements: [
    {
      id: 3,
      title: 'Eski duyuru',
      summary: 'Kısa metin',
      publishedAt: '2026-05-02T10:30:00.000Z',
      source: 'Teknhelogos',
    },
    {
      id: 2,
      title: 'Planlı Bakım Bildirimi',
      summary: LONG_BODY,
      publishedAt: '2026-07-11T06:00:00.000Z',
      source: SYSTEM_ANNOUNCEMENT_SOURCE,
    },
    {
      id: 1,
      title: 'Orta duyuru',
      summary: 'Orta metin',
      publishedAt: '2026-06-19T09:00:00.000Z',
      source: 'Teknhelogos',
    },
  ],
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

/**
 * Kısaltma CSS ile değil VERİ katmanında yapılıyor; satır sayısı yazı tipine ve
 * kart genişliğine bağlı olduğu için test edilemezdi, karakter sınırı deterministik.
 */
describe('truncateAnnouncementSummary', () => {
  it('sınırın altındaki metne dokunmaz', () => {
    expect(truncateAnnouncementSummary('Kısa duyuru')).toBe('Kısa duyuru')
  })

  it('sınırdaki metne kısaltma göstergesi eklemez', () => {
    const exact = 'a'.repeat(ANNOUNCEMENT_SUMMARY_MAX_LENGTH)

    expect(truncateAnnouncementSummary(exact)).toBe(exact)
  })

  it('uzun metni sınıra indirir ve üç nokta ekler', () => {
    const result = truncateAnnouncementSummary(LONG_BODY)

    expect(result.length).toBeLessThanOrEqual(ANNOUNCEMENT_SUMMARY_MAX_LENGTH + 1)
    expect(result.endsWith('…')).toBe(true)
  })

  it('kelime ortasında kesmez', () => {
    expect(truncateAnnouncementSummary(LONG_BODY)).not.toMatch(/kelim…$/)
  })

  it('boşluksuz uzun metni yine de keser', () => {
    expect(truncateAnnouncementSummary('x'.repeat(300), 10)).toBe(`${'x'.repeat(10)}…`)
  })
})

describe('getDashboardSummary', () => {
  it('özet ucuna gider', async () => {
    const fetchMock = stubFetch(RAW_SUMMARY)

    await getDashboardSummary(null, TODAY_KEY)

    // Sunucuda `/api/admin/` öneki hiç yok; yol buna göre düzeltildi.
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/dashboard/summary')
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('/api/admin/')
  })

  // "Bugün" sayaçları güne bağlı: hangi gün sorulduğu sunucuya YAZILI gider.
  it('gün anahtarını sorguya ekler', async () => {
    const fetchMock = stubFetch(RAW_SUMMARY)

    await getDashboardSummary(null, TODAY_KEY)

    expect(String(fetchMock.mock.calls[0][0])).toContain(`date=${TODAY_KEY}`)
  })

  // KK-2: bölge seçimi sunucuya taşınır, tüm değerler ona göre hesaplanır.
  it('seçili bölgeyi sorguya ekler, "Hepsi" seçiliyken eklemez', async () => {
    const withRegion = stubFetch(RAW_SUMMARY)
    await getDashboardSummary('İç Anadolu', TODAY_KEY)
    expect(String(withRegion.mock.calls[0][0])).toContain('region=')

    vi.unstubAllGlobals()
    const withoutRegion = stubFetch(RAW_SUMMARY)
    await getDashboardSummary(null, TODAY_KEY)
    expect(String(withoutRegion.mock.calls[0][0])).not.toContain('region=')
  })

  // KK-5: en fazla beş bölge, büyükten küçüğe. Sunucu sırasız dönse de garanti.
  it('yoğunluğu büyükten küçüğe sıralar ve beş satıra indirir', async () => {
    stubFetch(RAW_SUMMARY)

    const { regionDensity } = await getDashboardSummary(null, TODAY_KEY)
    const counts = regionDensity.map((row) => row.count)

    expect(regionDensity).toHaveLength(MAX_REGION_ROWS)
    expect(counts).toEqual([28, 22, 16, 12, 8])
  })

  // KK-6: en fazla iki duyuru, yeniden eskiye.
  it('duyuruları yeniden eskiye sıralar ve ikiye indirir', async () => {
    stubFetch(RAW_SUMMARY)

    const { announcements } = await getDashboardSummary(null, TODAY_KEY)

    expect(announcements).toHaveLength(MAX_ANNOUNCEMENTS)
    expect(announcements.map((item) => item.id)).toEqual([2, 1])
  })

  it('duyuru özetlerini kısaltır', async () => {
    stubFetch(RAW_SUMMARY)

    const { announcements } = await getDashboardSummary(null, TODAY_KEY)

    expect(announcements[0].summary.length).toBeLessThanOrEqual(
      ANNOUNCEMENT_SUMMARY_MAX_LENGTH + 1,
    )
    expect(announcements[0].summary.endsWith('…')).toBe(true)
  })

  it('sistem kaynağını olduğu gibi taşır — amber kenarlık buna bağlı', async () => {
    stubFetch(RAW_SUMMARY)

    const { announcements } = await getDashboardSummary(null, TODAY_KEY)

    expect(announcements[0].source).toBe(SYSTEM_ANNOUNCEMENT_SOURCE)
  })

  // KK-4: sıfır değer gizlenmez, veri katmanı da düşürmez.
  it('sıfır sayacı düşürmez', async () => {
    stubFetch(RAW_SUMMARY)

    expect((await getDashboardSummary(null, TODAY_KEY)).today.rejected).toBe(0)
  })

  it('sözleşme bozulursa sınırda patlar', async () => {
    stubFetch({ counts: { gasDistributionUsers: 1 } })

    await expect(getDashboardSummary(null, TODAY_KEY)).rejects.toThrow()
  })
})

/**
 * Uç henüz açılmadı. 404 gelince ekran ölmesin diye mock'a düşülüyor; ama
 * 401/403 ve 5xx GEÇİRİLİYOR — süresi dolmuş oturumda sahte veriyle dolu
 * çalışan bir ekran, hata ekranından çok daha kötü olurdu.
 */
describe('uç yokken mock’a düşme', () => {
  it('404 dönerse mock veriyle çözülür, hata fırlatmaz', async () => {
    stubStatus(404)

    const summary = await getDashboardSummary(null, TODAY_KEY)

    expect(summary.regionDensity.length).toBeGreaterThan(0)
    expect(summary.counts.projectFirms).toBeGreaterThan(0)
  })

  it('501 dönerse de mock veriyle çözülür', async () => {
    stubStatus(501)

    await expect(getDashboardSummary(null, TODAY_KEY)).resolves.toHaveProperty('counts')
  })

  it('API’ye hiç ulaşılamazsa mock veriyle çözülür', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(getDashboardSummary(null, TODAY_KEY)).resolves.toHaveProperty('counts')
  })

  it('mock’a düşerken de bölge süzgeci çalışır', async () => {
    stubStatus(404)

    const summary = await getDashboardSummary(MOCK_REGIONS[1], TODAY_KEY)

    expect(summary.regionDensity).toHaveLength(1)
    expect(summary.regionDensity[0].region).toBe(MOCK_REGIONS[1])
  })

  /**
   * "Bugün" sayaçları yalnız İSTENEN GÜNE ait kayıtları sayar. Mock hareketleri
   * uygulamanın açıldığı güne yazılı olduğu için başka bir gün sorulduğunda üç
   * sayaç da sıfır döner — gece yarısı ekranda görülecek davranış budur.
   */
  it('başka bir gün sorulduğunda bugün sayaçları sıfırlanır', async () => {
    stubStatus(404)

    const summary = await getDashboardSummary(null, OTHER_DAY_KEY)

    expect(summary.today).toEqual({ newProjects: 0, approved: 0, rejected: 0 })
    expect(summary.regionDensity).toHaveLength(0)
  })

  it('gün değişse de birikimli sayılar sıfırlanmaz', async () => {
    stubStatus(404)

    const summary = await getDashboardSummary(null, OTHER_DAY_KEY)

    // Kullanıcı/firma adetleri devreden toplamlar; güne bağlı değiller.
    expect(summary.counts.projectFirms).toBeGreaterThan(0)
  })

  it('401 mock’a YUTULMAZ — oturum düşmüşken sahte veri gösterilmez', async () => {
    stubStatus(401)

    await expect(getDashboardSummary(null, TODAY_KEY)).rejects.toBeInstanceOf(ApiError)
  })

  it('403 mock’a YUTULMAZ', async () => {
    stubStatus(403)

    await expect(getDashboardSummary(null, TODAY_KEY)).rejects.toBeInstanceOf(ApiError)
  })

  it('500 mock’a YUTULMAZ — gerçek hata ekranı görünmeli', async () => {
    stubStatus(500)

    await expect(getDashboardSummary(null, TODAY_KEY)).rejects.toBeInstanceOf(ApiError)
  })
})

/**
 * Duyuru yayınlama ucu da yok. Uç açılınca mock'a düşen dallar kalkacak; şimdilik
 * form gerçekten çalışıyor ve yayınlanan duyuru özet yanıtında görünüyor.
 */
describe('publishAnnouncement', () => {
  const DRAFT = {
    title: 'Test Duyurusu',
    body: 'Duyuru gövdesi.',
    region: null,
    isSystem: false,
  }

  it('duyuru ucuna POST atar', async () => {
    const fetchMock = stubFetch({
      id: 9,
      title: DRAFT.title,
      summary: DRAFT.body,
      publishedAt: '2026-08-09T09:00:00.000Z',
      source: MANAGEMENT_ANNOUNCEMENT_SOURCE,
    })

    await publishAnnouncement(DRAFT)

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/dashboard/announcements')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('uç yokken mock’a düşer ve duyuru özet yanıtında görünür', async () => {
    stubStatus(404)
    const title = `Yeni Duyuru ${Date.now()}`

    const published = await publishAnnouncement({ ...DRAFT, title })
    const summary = await getDashboardSummary(null, TODAY_KEY)

    expect(published.title).toBe(title)
    // En yeni duyuru listenin başında: sıralama yeniden eskiye (KK-6).
    expect(summary.announcements[0].title).toBe(title)
  })

  it('sistem duyurusu işareti kaynağa yansır — amber kenarlık buna bağlı', async () => {
    stubStatus(404)

    const published = await publishAnnouncement({ ...DRAFT, isSystem: true })

    expect(published.source).toBe(SYSTEM_ANNOUNCEMENT_SOURCE)
  })

  it('işaretlenmemiş duyuru sistem kaynağı almaz', async () => {
    stubStatus(404)

    const published = await publishAnnouncement(DRAFT)

    expect(published.source).toBe(MANAGEMENT_ANNOUNCEMENT_SOURCE)
  })

  it('uzun metin kartta görünecek hâliyle kısaltılır', async () => {
    stubStatus(404)

    const published = await publishAnnouncement({ ...DRAFT, body: LONG_BODY })

    expect(published.summary.endsWith('…')).toBe(true)
  })

  it('500 mock’a YUTULMAZ — kullanıcı yayınlandı sanmamalı', async () => {
    stubStatus(500)

    await expect(publishAnnouncement(DRAFT)).rejects.toBeInstanceOf(ApiError)
  })
})

/** Duyuru listesi ucu da yok; mock'a düşen yol aynı sözleşmeyi sağlamalı. */
describe('getAnnouncements', () => {
  const QUERY = { textQuery: '', region: null, page: 1, pageSize: ANNOUNCEMENT_PAGE_SIZE }

  it('liste ucuna sayfa parametreleriyle gider', async () => {
    const fetchMock = stubFetch({ items: [], totalCount: 0, page: 1, pageSize: 10 })

    await getAnnouncements(QUERY)

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/api/dashboard/announcements')
    expect(url).toContain('page=1')
    expect(url).toContain('pageSize=10')
  })

  it('arama ve bölge yalnız doluyken sorguya girer', async () => {
    const withFilters = stubFetch({ items: [], totalCount: 0, page: 1, pageSize: 10 })
    await getAnnouncements({ ...QUERY, textQuery: 'bakım', region: MOCK_REGIONS[0] })
    expect(String(withFilters.mock.calls[0][0])).toContain('q=bak')
    expect(String(withFilters.mock.calls[0][0])).toContain('region=')

    vi.unstubAllGlobals()
    const withoutFilters = stubFetch({ items: [], totalCount: 0, page: 1, pageSize: 10 })
    await getAnnouncements(QUERY)
    expect(String(withoutFilters.mock.calls[0][0])).not.toContain('q=')
    expect(String(withoutFilters.mock.calls[0][0])).not.toContain('region=')
  })

  // Sunucu sırasız dönerse liste sessizce karışmasın (özet ucuyla aynı gerekçe).
  it('sunucu sırasız dönse de yeniden eskiye sıralar', async () => {
    stubFetch({
      items: [
        { id: 1, title: 'Eski', body: 'a', publishedAt: '2026-05-02T10:30:00.000Z', source: 'X', region: null },
        { id: 2, title: 'Yeni', body: 'b', publishedAt: '2026-07-11T06:00:00.000Z', source: 'X', region: null },
      ],
      totalCount: 2,
      page: 1,
      pageSize: 10,
    })

    const page = await getAnnouncements(QUERY)

    expect(page.items.map((item) => item.title)).toEqual(['Yeni', 'Eski'])
  })

  it('uç yokken mock listeye düşer ve metni KISALTMAZ', async () => {
    stubStatus(404)

    const page = await getAnnouncements(QUERY)

    expect(page.totalCount).toBeGreaterThan(0)
    // Liste ekranının işi duyuruyu tam göstermek; kısaltma yalnız anasayfa kartında.
    expect(page.items.every((item) => !item.body.endsWith('…'))).toBe(true)
  })

  it('mock’ta arama başlıkta ve metinde Türkçe duyarsız çalışır', async () => {
    stubStatus(404)

    const page = await getAnnouncements({ ...QUERY, textQuery: 'BAKIM' })

    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items.every((item) => /bakım/i.test(`${item.title} ${item.body}`))).toBe(true)
  })

  it('mock’ta sayfa boyutu aşılmaz', async () => {
    stubStatus(404)

    const page = await getAnnouncements({ ...QUERY, pageSize: 1 })

    expect(page.items).toHaveLength(1)
    expect(page.totalCount).toBeGreaterThan(1)
  })

  it('bölgesiz duyuru her kapsamda görünür', async () => {
    stubStatus(404)

    const page = await getAnnouncements({ ...QUERY, region: MOCK_REGIONS[1] })

    expect(page.items.some((item) => item.region === null)).toBe(true)
    expect(page.items.every((item) => item.region === null || item.region === MOCK_REGIONS[1])).toBe(
      true,
    )
  })

  it('500 mock’a YUTULMAZ', async () => {
    stubStatus(500)

    await expect(getAnnouncements(QUERY)).rejects.toBeInstanceOf(ApiError)
  })
})
