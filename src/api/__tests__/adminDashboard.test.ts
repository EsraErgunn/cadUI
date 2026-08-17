import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ANNOUNCEMENT_PAGE_SIZE,
  ANNOUNCEMENT_SUMMARY_MAX_LENGTH,
  GLOBAL_SCOPE,
  MANAGEMENT_ANNOUNCEMENT_SOURCE,
  MAX_ANNOUNCEMENTS,
  MAX_DENSITY_ROWS,
  SYSTEM_ANNOUNCEMENT_SOURCE,
  getAnnouncements,
  getDashboardSummary,
  publishAnnouncement,
  truncateAnnouncementSummary,
  type AdminScope,
} from '../adminDashboard'
import {
  MOCK_SCOPE_NAMES,
  allMockScopeFacts,
  queryMockDayActivity,
} from '../adminDashboardMock'
import { clearStoredAnnouncements } from '../announcementStore'
import { toDayKey } from '../dayKey'
import { ApiError, NetworkError } from '../http'

const LONG_BODY = `${'kelime '.repeat(40)}son`

/** Mock hareketler uygulamanın açıldığı güne yazılıyor; testler de o günü sorar. */
const TODAY_KEY = toDayKey(new Date())

/** Mock'ta karşılığı olmayan bir gün: sayaçların sıfırlandığı hâli görmek için. */
const OTHER_DAY_KEY = '2020-01-01'

/**
 * GERÇEK ucun (`GET /api/admin/dashboard`) gövdesi. Alan adları arayüzünkilerle
 * bilerek FARKLI — eşlemenin gerçekten yapıldığı böyle görülür. Yoğunluk sırasız
 * veriliyor: sıralama ve üst sınır istemcinin garantisi.
 *
 * Duyuru YOK: sunucu duyuru döndürmüyor, kartın verisi yerel depodan geliyor.
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

beforeEach(() => {
  clearStoredAnnouncements()
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearStoredAnnouncements()
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

  // KK-6: en fazla iki duyuru, yeniden eskiye.
  it('duyuruları yeniden eskiye sıralar ve ikiye indirir', async () => {
    stubFetch(RAW_SUMMARY)

    const { announcements } = await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    expect(announcements).toHaveLength(MAX_ANNOUNCEMENTS)
    expect(announcements.map((item) => item.id)).toEqual([2, 1])
  })

  /**
   * Duyurular sunucudan DEĞİL yerel depodan geliyor (K48); tohum duyurular kısa
   * olduğu için kısaltma ancak uzun metinli bir yayınla sınanabiliyor.
   */
  it('duyuru özetlerini kısaltır', async () => {
    // Duyuru ucu sunucuda yok: yayınlama 404 alıp yerel depoya düşüyor (K48).
    stubStatus(404)
    await publishAnnouncement({
      title: 'Uzun duyuru',
      body: LONG_BODY,
      scopeName: null,
      isSystem: false,
    })

    stubFetch(RAW_SUMMARY)
    const { announcements } = await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    expect(announcements[0].summary.length).toBeLessThanOrEqual(
      ANNOUNCEMENT_SUMMARY_MAX_LENGTH + 1,
    )
    expect(announcements[0].summary.endsWith('…')).toBe(true)
  })

  it('sistem kaynağını olduğu gibi taşır — amber kenarlık buna bağlı', async () => {
    stubFetch(RAW_SUMMARY)

    const { announcements } = await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

    expect(announcements[0].source).toBe(SYSTEM_ANNOUNCEMENT_SOURCE)
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

/**
 * Duyuru yayınlama ucu da yok. Uç açılınca mock'a düşen dallar kalkacak; şimdilik
 * form gerçekten çalışıyor ve yayınlanan duyuru özet yanıtında görünüyor.
 */
describe('publishAnnouncement', () => {
  const DRAFT = {
    title: 'Test Duyurusu',
    body: 'Duyuru gövdesi.',
    scopeName: null,
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

  it('uç yokken yerel depoya düşer ve duyuru özet yanıtında görünür', async () => {
    stubStatus(404)
    const title = `Yeni Duyuru ${Date.now()}`

    const published = await publishAnnouncement({ ...DRAFT, title })

    // Özet ucu GERÇEK: 404 artık yutulmuyor, gövde yeniden kurulmalı.
    vi.unstubAllGlobals()
    stubFetch(RAW_SUMMARY)
    const summary = await getDashboardSummary(TODAY_KEY, GLOBAL_SCOPE)

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
  const QUERY = {
    textQuery: '',
    scope: GLOBAL_SCOPE,
    page: 1,
    pageSize: ANNOUNCEMENT_PAGE_SIZE,
  }

  it('liste ucuna sayfa parametreleriyle gider', async () => {
    const fetchMock = stubFetch({ items: [], totalCount: 0, page: 1, pageSize: 10 })

    await getAnnouncements(QUERY)

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/api/dashboard/announcements')
    expect(url).toContain('page=1')
    expect(url).toContain('pageSize=10')
  })

  it('arama ve kapsam yalnız doluyken sorguya girer', async () => {
    const withFilters = stubFetch({ items: [], totalCount: 0, page: 1, pageSize: 10 })
    await getAnnouncements({
      ...QUERY,
      textQuery: 'bakım',
      scope: { type: 'group', groupId: 2 },
    })
    expect(String(withFilters.mock.calls[0][0])).toContain('q=bak')
    expect(String(withFilters.mock.calls[0][0])).toContain('gdGroupId=2')

    vi.unstubAllGlobals()
    const withoutFilters = stubFetch({ items: [], totalCount: 0, page: 1, pageSize: 10 })
    await getAnnouncements(QUERY)
    expect(String(withoutFilters.mock.calls[0][0])).not.toContain('q=')
    expect(String(withoutFilters.mock.calls[0][0])).not.toContain('gdGroupId')
  })

  // Sunucu sırasız dönerse liste sessizce karışmasın (özet ucuyla aynı gerekçe).
  it('sunucu sırasız dönse de yeniden eskiye sıralar', async () => {
    stubFetch({
      items: [
        { id: 1, title: 'Eski', body: 'a', publishedAt: '2026-05-02T10:30:00.000Z', source: 'X', scopeName: null },
        { id: 2, title: 'Yeni', body: 'b', publishedAt: '2026-07-11T06:00:00.000Z', source: 'X', scopeName: null },
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

  // Duyurunun KENDİ kapsamı duruyor: kartta rozet olarak görünüyor, listede
  // hepsi bir arada.
  it('kapsamlı ve kapsamsız duyuruların hepsi listelenir', async () => {
    stubStatus(404)

    const page = await getAnnouncements(QUERY)

    expect(page.items.some((item) => item.scopeName === null)).toBe(true)
    expect(page.items.some((item) => item.scopeName !== null)).toBe(true)
  })

  it('500 mock’a YUTULMAZ', async () => {
    stubStatus(500)

    await expect(getAnnouncements(QUERY)).rejects.toBeInstanceOf(ApiError)
  })
})
