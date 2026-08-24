import { afterEach, describe, expect, it, vi } from 'vitest'

import { GLOBAL_SCOPE } from '../adminDashboard'
import { ProjectFirmAuthorizationError } from '../projectFirmAuthorizations'
import {
  createProject,
  getProjectFirms,
  getProjectStatusCounts,
  listProjects,
  PROJECT_PAGE_SIZE,
  type CreateProjectPayload,
  type ProjectListQuery,
  type ProjectStatusCountsQuery,
} from '../projects'

const TASLAK_QUERY: ProjectListQuery = {
  status: 'taslak',
  dateFrom: null,
  dateTo: null,
  cityId: null,
  districtId: null,
  projectFirmId: null,
  scope: GLOBAL_SCOPE,
  search: '',
  page: 1,
  pageSize: PROJECT_PAGE_SIZE,
  sortBy: 'updatedAt',
  sortDir: 'desc',
}

/** Rozet sorgusu sekmeyi ve sayfalamayı taşımaz, yalnız filtre kriterlerini. */
const COUNTS_QUERY: ProjectStatusCountsQuery = {
  dateFrom: null,
  dateTo: null,
  cityId: null,
  districtId: null,
  projectFirmId: null,
  scope: GLOBAL_SCOPE,
  search: '',
}

const VALID_PAYLOAD: CreateProjectPayload = {
  name: 'Test Apartmanı Doğalgaz Tesisatı',
  projectFirmId: 11,
  gasDistributionFirmId: 101,
  connectionObject: null,
  cityId: 6,
  districtId: 64,
  address: 'Test Mahallesi 1. Sokak No 2',
  apartmentCount: 4,
  workplaceCount: 0,
  areaSquareMeters: 120,
  parcelInfo: null,
  projectTypeCodeId: 3,
  isPermitProject: false,
  heatingTypeCodeId: 8,
  buildingUsageTypeCodeId: 12,
  capacityCubicMeterPerHour: 12,
  serviceBoxPressureMbar: 21,
  coverNote: null,
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Artık YALNIZ evrak süzgecini besleyen mock; yeni proje formu gerçek uçta. */
describe('getProjectFirms (mock — evrak süzgeci)', () => {
  it('tüm firmaları döndürür', async () => {
    const firms = await getProjectFirms()

    expect(firms.length).toBeGreaterThan(1)
  })
})

/**
 * Gövde biçimleri 2026-08-04'te çalışan cadapi'den birebir alındı; uydurma
 * değil. Sözleşme kayarsa bu sabitler de güncellenmeli.
 */
function apiCreatedResponse(id: number, name: string, buildingCode: string | null = null) {
  return {
    id,
    name,
    description: null,
    buildingCode,
    projectFirmAuthorizationId: 1,
    gasDistributionFirmId: 1,
    cityId: 6,
    cityName: 'Ankara',
    districtId: 64,
    districtName: 'Çankaya',
    addressLine: null,
    blockLotParcel: null,
    createdAt: '2026-08-04T06:32:11.8372008Z',
    updatedAt: '2026-08-04T06:32:11.8372008Z',
  }
}

function apiListItem(
  id: number,
  name: string,
  updatedAt: string,
  code: string | null = null,
  status: string | null = null,
) {
  return { id, name, code, status, createdAt: updatedAt, updatedAt }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** `createProject`'in çözdüğü yetki kaydı; kimliği sabit 1 DEĞİL (K49 kalktı). */
const AUTHORIZATION_ROW = {
  id: 42,
  projectFirmId: 11,
  projectFirmName: 'Anadolu Mühendislik',
  gasDistributionFirmId: 101,
  gasDistributionFirmName: 'Başkentgaz',
  validFrom: '2026-01-01T00:00:00Z',
  validTo: null,
}

/** Firma alanlarını görmeyen kullanıcının oturumu (`GET /api/auth/me`). */
const CURRENT_USER = {
  id: 5,
  fullName: 'Test Kullanıcı',
  username: 'test',
  email: 'test@example.com',
  roleCode: 'proje',
  roleName: 'Proje Firması',
  projectFirmId: 11,
  gasDistributionFirmId: 101,
}

/**
 * `createProject` artık yetki kimliğini ÇÖZÜYOR: admin'de formdaki firma
 * çiftinden, proje firması kullanıcısında `GET /api/auth/me`'den. Stub bu
 * yüzden yola göre ayrışıyor — tek gövde döndürseydi yetki sorgusu proje
 * yanıtını okuyup şemada patlardı.
 */
function stubFetch(
  body: unknown,
  options: { authorizationRows?: unknown[]; currentUser?: unknown } = {},
): ReturnType<typeof vi.fn> {
  const { authorizationRows = [AUTHORIZATION_ROW], currentUser = CURRENT_USER } = options

  const fetchMock = vi.fn((url: unknown) => {
    const path = String(url)
    if (path.includes('/api/project-firm-authorizations')) {
      return Promise.resolve(
        // Zarf TAM: sayfa sayısı `totalCount`/`pageSize`'dan çıkıyor.
        jsonResponse({
          items: authorizationRows,
          totalCount: authorizationRows.length,
          page: 1,
          pageSize: 100,
        }),
      )
    }
    if (path.includes('/api/auth/me')) return Promise.resolve(jsonResponse(currentUser))

    return Promise.resolve(jsonResponse(body))
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Proje POST'unun gövdesi — yetki sorgusu araya girdiği için indeksle alınmaz. */
function sentBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
  if (!call) throw new Error('POST isteği yapılmadı.')

  return JSON.parse(call[1].body)
}

describe('createProject', () => {
  it('projeyi taslak durumunda oluşturur ve P_ID üretir', async () => {
    stubFetch(apiCreatedResponse(7, VALID_PAYLOAD.name))

    const created = await createProject(VALID_PAYLOAD)

    expect(created.status).toBe('taslak')
    expect(created.id).toBe(7)
    // Uçta P_ID alanı yok; boş kalsaydı yeni kayıt vurgusu tüm satırları yakalardı.
    expect(created.pId).toBe('7')
  })

  it('uç `buildingCode` döndürürse P_ID olarak onu kullanır', async () => {
    stubFetch(apiCreatedResponse(7, VALID_PAYLOAD.name, 'PRJ-2026-007'))

    expect((await createProject(VALID_PAYLOAD)).pId).toBe('PRJ-2026-007')
  })

  /**
   * Sözleşme 2026-08'de DEĞİŞTİ: uç eski bölge bağı yerine
   * `projectFirmAuthorizationId` istiyor ve il/ilçe/adres alıyor. Eski gövde 400
   * alıyordu, proje ekleme hiç çalışmıyordu.
   */
  it('ucun beklediği alanların TAMAMINI gönderir', async () => {
    const fetchMock = stubFetch(apiCreatedResponse(7, VALID_PAYLOAD.name))

    await createProject(VALID_PAYLOAD)

    expect(sentBody(fetchMock)).toEqual({
      name: VALID_PAYLOAD.name,
      projectFirmAuthorizationId: AUTHORIZATION_ROW.id,
      cityId: 6,
      districtId: 64,
      addressLine: VALID_PAYLOAD.address,
      blockLotParcel: VALID_PAYLOAD.parcelInfo,
      buildingCode: null,
      projectTypeCodeId: 3,
      heatingTypeCodeId: 8,
      buildingUsageTypeCodeId: 12,
      isPermitProject: false,
      apartmentCount: 4,
      workplaceCount: 0,
      areaSquareMeters: 120,
      capacity: 12,
      serviceBoxPressureMbar: 21,
      description: null,
    })
  })

  /**
   * Sunucuda `connectionObject`/`coverNote` diye alan YOK (backend 91baf4c):
   * "Bağlantı Nesnesi" bina kodunun kendisi, kapak açıklaması da
   * `description`. Eski adlarla gönderilirse gövde sessizce düşerdi.
   */
  it('bağlantı nesnesini buildingCode, kapak açıklamasını description olarak gönderir', async () => {
    const fetchMock = stubFetch(apiCreatedResponse(7, VALID_PAYLOAD.name))

    await createProject({
      ...VALID_PAYLOAD,
      connectionObject: 'BN-4471',
      coverNote: 'Kapak açıklaması',
    })

    const body = sentBody(fetchMock)
    expect(body.buildingCode).toBe('BN-4471')
    expect(body.description).toBe('Kapak açıklaması')
    expect(body).not.toHaveProperty('connectionObject')
    expect(body).not.toHaveProperty('coverNote')
  })

  /** Üç tip alanı kod METNİYLE değil KİMLİKLE gidiyor (bkz. api/codes.ts). */
  it('tip alanlarını kod kimliği olarak gönderir, kod metni göndermez', async () => {
    const fetchMock = stubFetch(apiCreatedResponse(7, VALID_PAYLOAD.name))

    await createProject(VALID_PAYLOAD)

    const body = sentBody(fetchMock)
    expect(body.projectTypeCodeId).toBe(3)
    expect(body.heatingTypeCodeId).toBe(8)
    expect(body.buildingUsageTypeCodeId).toBe(12)
    for (const field of ['projectType', 'heatingType', 'buildingUsageType']) {
      expect(body).not.toHaveProperty(field)
    }
  })

  /** Kapasitenin uçtaki adı birimsiz; birim yalnız istemci tarafında yaşıyor. */
  it('kapasiteyi `capacity` adıyla gönderir', async () => {
    const fetchMock = stubFetch(apiCreatedResponse(7, VALID_PAYLOAD.name))

    await createProject({ ...VALID_PAYLOAD, capacityCubicMeterPerHour: 45 })

    const body = sentBody(fetchMock)
    expect(body.capacity).toBe(45)
    expect(body).not.toHaveProperty('capacityCubicMeterPerHour')
  })

  it('formda karşılığı olmayan alanları GÖNDERMEZ', async () => {
    const fetchMock = stubFetch(apiCreatedResponse(7, VALID_PAYLOAD.name))

    await createProject(VALID_PAYLOAD)

    // `code`, iş başlama tarihi ve yetkili mühendis formdan KALKTI (K74);
    // uydurma değerle doldurulmuyorlar.
    const body = sentBody(fetchMock)
    for (const field of ['code', 'startDate', 'engineerUserId']) {
      expect(body).not.toHaveProperty(field)
    }
  })

  it('firma kimliği gövdeye hiç konmaz — uç YETKİ bağı istiyor', async () => {
    const fetchMock = stubFetch(apiCreatedResponse(8, VALID_PAYLOAD.name))

    await createProject(VALID_PAYLOAD)

    const body = sentBody(fetchMock)
    expect(body).not.toHaveProperty('projectFirmId')
    expect(body).not.toHaveProperty('gasDistributionFirmId')
    expect(body.projectFirmAuthorizationId).toBe(AUTHORIZATION_ROW.id)
  })

  /** Admin'de çift formdan geliyor; oturum sorgulanmamalı. */
  it('formda firma seçiliyse yetkiyi o çiftten çözer, /auth/me çağırmaz', async () => {
    const fetchMock = stubFetch(apiCreatedResponse(8, VALID_PAYLOAD.name))

    await createProject(VALID_PAYLOAD)

    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(urls.some((url) => url.includes('ProjectFirmId=11'))).toBe(true)
    expect(urls.some((url) => url.includes('/api/auth/me'))).toBe(false)
  })

  /**
   * Proje firması kullanıcısında firma alanları hiç render edilmiyor
   * (`newProjectSchema`), çift bu yüzden oturumdan okunuyor.
   */
  it('formda firma yoksa çifti oturumdaki kullanıcıdan okur', async () => {
    const payload: CreateProjectPayload = { ...VALID_PAYLOAD }
    delete payload.projectFirmId
    delete payload.gasDistributionFirmId
    const fetchMock = stubFetch(apiCreatedResponse(8, payload.name))

    await createProject(payload)

    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(urls.some((url) => url.includes('/api/auth/me'))).toBe(true)
    expect(sentBody(fetchMock).projectFirmAuthorizationId).toBe(AUTHORIZATION_ROW.id)
  })

  it('oturumda firma bağı yoksa projeyi göndermez', async () => {
    const payload: CreateProjectPayload = { ...VALID_PAYLOAD }
    delete payload.projectFirmId
    delete payload.gasDistributionFirmId
    const fetchMock = stubFetch(apiCreatedResponse(8, payload.name), {
      currentUser: { ...CURRENT_USER, projectFirmId: null, gasDistributionFirmId: null },
    })

    await expect(createProject(payload)).rejects.toThrow(ProjectFirmAuthorizationError)

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  /** Yetki çözülemezse kayıt HİÇ gitmemeli — yanlış bağla proje açılmasın. */
  it('yetki kaydı yoksa projeyi göndermez', async () => {
    const fetchMock = stubFetch(apiCreatedResponse(8, VALID_PAYLOAD.name), {
      authorizationRows: [],
    })

    await expect(createProject(VALID_PAYLOAD)).rejects.toThrow(ProjectFirmAuthorizationError)

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })
})

/** Uç artık SAYFALI ZARF döndürüyor (Swagger 2026-08-14). */
function apiPage(items: ReturnType<typeof apiListItem>[], totalCount = items.length) {
  return { items, totalCount, page: 1, pageSize: PROJECT_PAGE_SIZE }
}

function sentUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
  return new URL(String(fetchMock.mock.calls[0][0]))
}

describe('listProjects — sunucu taraflı süzme ve sayfalama', () => {
  it('süzgeçleri sözleşmedeki PascalCase adlarla gönderir', async () => {
    const fetchMock = stubFetch(apiPage([apiListItem(1, 'Demo', '2026-08-03T18:20:47')]))

    await listProjects({
      ...TASLAK_QUERY,
      cityId: 6,
      districtId: 64,
      projectFirmId: 11,
      page: 2,
      sortBy: 'name',
      sortDir: 'asc',
    })

    const { pathname, searchParams } = sentUrl(fetchMock)
    expect(pathname).toBe('/api/projects')
    expect(searchParams.get('CityId')).toBe('6')
    expect(searchParams.get('DistrictId')).toBe('64')
    expect(searchParams.get('ProjectFirmId')).toBe('11')
    expect(searchParams.get('SortBy')).toBe('name')
    expect(searchParams.get('SortDir')).toBe('asc')
    expect(searchParams.get('Page')).toBe('2')
    expect(searchParams.get('PageSize')).toBe(String(PROJECT_PAGE_SIZE))
  })

  /** Üst bardaki kapsam grup firmasıysa yalnız `gdGroupId` gider. */
  it('grup kapsamını gdGroupId olarak gönderir', async () => {
    const fetchMock = stubFetch(apiPage([]))

    await listProjects({ ...TASLAK_QUERY, scope: { type: 'group', groupId: 7 } })

    const { searchParams } = sentUrl(fetchMock)
    expect(searchParams.get('gdGroupId')).toBe('7')
    expect(searchParams.has('gdFirmId')).toBe(false)
  })

  /** Firma daha DAR kapsam; grup parametresi yanına eklenmez (uç ikisini almıyor). */
  it('firma kapsamını gdFirmId olarak gönderir, grubu göndermez', async () => {
    const fetchMock = stubFetch(apiPage([]))

    await listProjects({ ...TASLAK_QUERY, scope: { type: 'firm', firmId: 101 } })

    const { searchParams } = sentUrl(fetchMock)
    expect(searchParams.get('gdFirmId')).toBe('101')
    expect(searchParams.has('gdGroupId')).toBe(false)
  })

  /** Kapsam seçilmemişse "tümü" demek için parametrenin YOKLUĞU kullanılır. */
  it('kapsam yokken kapsam parametresi yazmaz', async () => {
    const fetchMock = stubFetch(apiPage([]))

    await listProjects(TASLAK_QUERY)

    const { searchParams } = sentUrl(fetchMock)
    expect(searchParams.has('gdGroupId')).toBe(false)
    expect(searchParams.has('gdFirmId')).toBe(false)
  })

  /** Sekme kodu arayüze özel; uca sunucunun durum kodu gider. */
  it('sekmeyi sunucunun durum koduna çevirir', async () => {
    const fetchMock = stubFetch(apiPage([]))

    await listProjects({ ...TASLAK_QUERY, status: 'onayBekleyen' })

    expect(sentUrl(fetchMock).searchParams.get('Status')).toBe('PendingApproval')
  })

  /** Uç `date-time` istiyor, URL'de gün duruyor; aralık gün sonuna kadar KAPSAYICI. */
  it('tarih aralığını RFC 3339 damgasına çevirir', async () => {
    const fetchMock = stubFetch(apiPage([]))

    await listProjects({ ...TASLAK_QUERY, dateFrom: '2026-08-01', dateTo: '2026-08-31' })

    const { searchParams } = sentUrl(fetchMock)
    expect(Date.parse(searchParams.get('DateFrom') ?? '')).toBe(
      new Date(2026, 7, 1, 0, 0, 0, 0).getTime(),
    )
    expect(Date.parse(searchParams.get('DateTo') ?? '')).toBe(
      new Date(2026, 7, 31, 23, 59, 59, 999).getTime(),
    )
  })

  it('boş süzgeç anahtarını hiç yazmaz', async () => {
    const fetchMock = stubFetch(apiPage([]))

    await listProjects(TASLAK_QUERY)

    const { searchParams } = sentUrl(fetchMock)
    for (const key of ['CityId', 'DistrictId', 'ProjectFirmId', 'DateFrom', 'DateTo']) {
      expect(searchParams.has(key)).toBe(false)
    }
  })

  it('sunucunun sayfa zarfını olduğu gibi taşır — istemci dilimlemez', async () => {
    stubFetch(apiPage([apiListItem(1, 'Demo', '2026-08-03T18:20:47')], 48))

    const page = await listProjects(TASLAK_QUERY)

    expect(page.items).toHaveLength(1)
    expect(page.totalCount).toBe(48)
    expect(page.pageSize).toBe(PROJECT_PAGE_SIZE)
  })

  /**
   * Arama artık SUNUCUDA (`Search`). İstemcide süzülürken yalnız görünen
   * sayfayı kapsıyordu ve `totalCount` süzülmemiş adedi gösteriyordu; gelen
   * sayfa artık olduğu gibi çiziliyor.
   */
  it('aramayı uca `Search` olarak gönderir, gelen sayfayı süzmez', async () => {
    const fetchMock = stubFetch(
      apiPage([
        apiListItem(1, 'Gülbahar Apartmanı', '2026-08-03T18:20:47'),
        apiListItem(2, 'Çınar Sitesi', '2026-08-02T18:20:47'),
      ]),
    )

    const page = await listProjects({ ...TASLAK_QUERY, search: 'gulbahar' })

    expect(sentUrl(fetchMock).searchParams.get('Search')).toBe('gulbahar')
    expect(page.items.map((project) => project.id)).toEqual([1, 2])
  })

  /** Boş arama parametre olarak HİÇ yazılmaz; adres temiz kalır. */
  it('boş aramada Search parametresi yazılmaz', async () => {
    const fetchMock = stubFetch(apiPage([]))

    await listProjects({ ...TASLAK_QUERY, search: '' })

    expect(sentUrl(fetchMock).searchParams.has('Search')).toBe(false)
  })

  it('proje ve ısınma tipini uçtan gelen ADLA doldurur', async () => {
    stubFetch({
      items: [
        {
          ...apiListItem(1, 'Demo', '2026-08-03T18:20:47'),
          projectTypeName: 'İlave Tadilat',
          heatingTypeName: 'Merkezi',
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: PROJECT_PAGE_SIZE,
    })

    const [project] = (await listProjects(TASLAK_QUERY)).items

    expect(project.projectType).toBe('İlave Tadilat')
    expect(project.heatingType).toBe('Merkezi')
  })

  /**
   * Yokluk `null` ile taşınıyor, "—" METNİYLE değil: tire bir GÖSTERİM kararı ve
   * tabloya ait (`EmptyValue`). Veri katmanına gömülüyken tip de yalan söylüyordu.
   */
  it('uçtan gelmeyen sütunlar null gelir', async () => {
    stubFetch(apiPage([apiListItem(1, 'Demo', '2026-08-03T18:20:47')]))

    const [project] = (await listProjects(TASLAK_QUERY)).items

    expect(project.firmName).toBeNull()
    expect(project.projectType).toBeNull()
    expect(project.heatingType).toBeNull()
    expect(project.gasFirm).toBeNull()
    expect(project.buildingCode).toBeNull()
    expect(project.hasDocuments).toBe(false)
  })

  /** Durum satırın KENDİ verisi: "Onaya Gönder" düğmesi buna bakıyor. */
  it('sunucunun durum kodunu arayüz koduna çevirir', async () => {
    stubFetch(
      apiPage([
        apiListItem(1, 'Taslak', '2026-08-03T18:20:47', null, 'Draft'),
        apiListItem(2, 'Onaylı', '2026-08-03T18:20:47', null, 'Approved'),
      ]),
    )

    const page = await listProjects(TASLAK_QUERY)

    expect(page.items.map((project) => project.status)).toEqual(['taslak', 'onaylanan'])
  })

  /** Tanınmayan/eksik kod "taslak" SAYILMAZ: uydurma durum satır aksiyonunu yanıltır. */
  it('bilinmeyen veya eksik durum kodunu null bırakır', async () => {
    stubFetch(
      apiPage([
        apiListItem(1, 'Bilinmeyen', '2026-08-03T18:20:47', null, 'OnHold'),
        // Durum hiç gelmeyen satır: `null` ile aynı kapıya çıkar.
        apiListItem(2, 'Durumsuz', '2026-08-03T18:20:47'),
      ]),
    )

    const page = await listProjects(TASLAK_QUERY)

    expect(page.items.map((project) => project.status)).toEqual([null, null])
  })
})

describe('getProjectStatusCounts', () => {
  const countsBody = { draft: 3, pendingApproval: 2, approved: 1, rejected: 0 }

  /** Sunucunun anahtarları İngilizce; arayüzün kodları Türkçe. */
  it('sunucu anahtarlarını arayüzün durum kodlarına çevirir', async () => {
    stubFetch(countsBody)

    const counts = await getProjectStatusCounts(COUNTS_QUERY)

    expect(counts).toEqual({ taslak: 3, onayBekleyen: 2, onaylanan: 1, reddedilen: 0 })
  })

  /** Rozetler durumdan bağımsız: `Status` parametresi GİTMEZ. */
  it('listeyle aynı süzgeçleri gönderir ama Status göndermez', async () => {
    const fetchMock = stubFetch(countsBody)

    await getProjectStatusCounts({ ...COUNTS_QUERY, cityId: 6, districtId: 64 })

    const { pathname, searchParams } = sentUrl(fetchMock)
    expect(pathname).toBe('/api/projects/status-counts')
    expect(searchParams.get('CityId')).toBe('6')
    expect(searchParams.get('DistrictId')).toBe('64')
    expect(searchParams.has('Status')).toBe(false)
  })

  /** Rozetler listeyle AYNI kapsamı saymalı; kapsam parametresi buraya da gider. */
  it('kapsamı rozet sorgusuna da yazar', async () => {
    const fetchMock = stubFetch(countsBody)

    await getProjectStatusCounts({ ...COUNTS_QUERY, scope: { type: 'firm', firmId: 101 } })

    expect(sentUrl(fetchMock).searchParams.get('gdFirmId')).toBe('101')
  })
})
