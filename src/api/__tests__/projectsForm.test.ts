import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createProject,
  getFirmEngineers,
  getGasFirmsForProjectFirm,
  getHeatingTypes,
  getProjectFirms,
  getProjectTypes,
  listProjects,
  mapFirmEngineer,
  mapHeatingTypeOptions,
  PROJECT_PAGE_SIZE,
  type CreateProjectPayload,
  type ProjectListQuery,
} from '../projects'

const TASLAK_QUERY: ProjectListQuery = {
  status: 'taslak',
  dateFrom: null,
  dateTo: null,
  districtId: null,
  projectFirmId: null,
  search: '',
  page: 1,
  pageSize: PROJECT_PAGE_SIZE,
  sortBy: 'updatedAt',
  sortDir: 'desc',
}

const VALID_PAYLOAD: CreateProjectPayload = {
  name: 'Test Apartmanı Doğalgaz Tesisatı',
  projectFirmId: 11,
  gasDistributionFirmId: 101,
  startDate: '2026-08-04',
  endDate: '2026-10-04',
  engineerUserId: 501,
  connectionObject: null,
  address: 'Test Mahallesi 1. Sokak No 2',
  apartmentCount: 4,
  workplaceCount: 0,
  areaSquareMeters: 120,
  parcelInfo: null,
  projectType: 'ILAVE',
  isPermitProject: false,
  heatingType: 'bireysel',
  buildingUsageType: 'coklu',
  capacityCubicMeterPerHour: 12,
  serviceBoxPressureMbar: 21,
  coverNote: null,
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('mapFirmEngineer', () => {
  it('ad ve soyadı tek alana birleştirir', () => {
    const engineer = mapFirmEngineer({
      id: 7,
      firstName: 'Ayşe',
      lastName: 'Yıldırım',
      isActive: true,
    })

    expect(engineer).toEqual({ id: 7, fullName: 'Ayşe Yıldırım' })
  })
})

describe('mapHeatingTypeOptions', () => {
  it('bilinen kodları etiketiyle birlikte geçirir', () => {
    const options = mapHeatingTypeOptions([
      { code: 'bireysel', label: 'Bireysel' },
      { code: 'merkezi', label: 'Merkezi' },
    ])

    expect(options).toEqual([
      { code: 'bireysel', label: 'Bireysel' },
      { code: 'merkezi', label: 'Merkezi' },
    ])
  })

  it('enum dışı kod gelirse formu kırmaz: seçeneği süzer ve bir kez uyarır', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const options = mapHeatingTypeOptions([
      { code: 'bireysel', label: 'Bireysel' },
      { code: 'jeotermal', label: 'Jeotermal' },
      { code: 'gunes', label: 'Güneş' },
    ])

    expect(options).toEqual([{ code: 'bireysel', label: 'Bireysel' }])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('jeotermal')
    expect(warn.mock.calls[0][0]).toContain('gunes')
  })

  it('hepsi bilinen kodsa uyarı düşmez', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mapHeatingTypeOptions([{ code: 'merkezi', label: 'Merkezi' }])

    expect(warn).not.toHaveBeenCalled()
  })
})

describe('getProjectTypes', () => {
  it('seçenekleri servisten alır — arayüzün tanımadığı kod da listede kalır', async () => {
    const options = await getProjectTypes()
    const codes = options.map((option) => option.code)

    expect(codes).toContain('ILAVE')
    // Sabit dizi gömülseydi Ayarlar'dan eklenen bu tip listede olmazdı.
    expect(codes).toContain('DONUSUM')
  })
})

describe('getHeatingTypes', () => {
  it('yalnız enum içindeki kodları döndürür', async () => {
    const options = await getHeatingTypes()

    expect(options.map((option) => option.code)).toEqual(['bireysel', 'merkezi'])
  })
})

describe('getProjectFirms', () => {
  // Bölge kapsamı kaldırıldı (K31): uç her zaman tüm firmaları veriyor.
  it('tüm firmaları döndürür', async () => {
    const firms = await getProjectFirms()

    expect(firms.length).toBeGreaterThan(1)
  })
})

describe('getGasFirmsForProjectFirm', () => {
  it('yalnız seçili proje firmasının çalıştığı GD firmalarını döndürür', async () => {
    const forFirst = await getGasFirmsForProjectFirm(12)
    const forSecond = await getGasFirmsForProjectFirm(13)

    expect(forFirst.map((firm) => firm.id)).toEqual([101])
    expect(forSecond.map((firm) => firm.id)).toEqual([102, 103])
  })

  it('bağlı GD firması olmayan proje firmasında boş liste döner', async () => {
    const firms = await getGasFirmsForProjectFirm(999)

    expect(firms).toEqual([])
  })
})

describe('getFirmEngineers', () => {
  it('yalnız aktif kullanıcıları döndürür', async () => {
    const engineers = await getFirmEngineers(11)

    expect(engineers.length).toBeGreaterThan(0)
    expect(engineers.every((engineer) => engineer.fullName.trim() !== '')).toBe(true)
  })

  it('farklı firmalar farklı mühendis listesi verir', async () => {
    const first = await getFirmEngineers(11)
    const second = await getFirmEngineers(12)

    expect(first.map((engineer) => engineer.id)).not.toEqual(
      second.map((engineer) => engineer.id),
    )
  })

  it('kimlik verilmezse sunucunun token firmasına düşer (proje firması kullanıcısı)', async () => {
    const withoutId = await getFirmEngineers()

    expect(withoutId.length).toBeGreaterThan(0)
  })
})

/**
 * Gövde biçimleri 2026-08-04'te çalışan cadapi'den birebir alındı; uydurma
 * değil. Sözleşme kayarsa bu sabitler de güncellenmeli.
 */
function apiCreatedResponse(id: number, name: string, code: string | null = null) {
  return {
    id,
    name,
    description: null,
    code,
    projectFirmRegionId: 1,
    gasDistributionFirmRegionId: 1,
    createdAt: '2026-08-04T06:32:11.8372008Z',
    updatedAt: '2026-08-04T06:32:11.8372008Z',
  }
}

function apiListItem(id: number, name: string, updatedAt: string, code: string | null = null) {
  return { id, name, code, createdAt: updatedAt, updatedAt }
}

function stubFetch(body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return JSON.parse(fetchMock.mock.calls[0][1].body)
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

  it('uç `code` döndürürse P_ID olarak onu kullanır', async () => {
    stubFetch(apiCreatedResponse(7, VALID_PAYLOAD.name, 'PRJ-2026-007'))

    expect((await createProject(VALID_PAYLOAD)).pId).toBe('PRJ-2026-007')
  })

  it('yalnız ucun kabul ettiği üç alanı gönderir', async () => {
    const fetchMock = stubFetch(apiCreatedResponse(7, VALID_PAYLOAD.name))

    await createProject(VALID_PAYLOAD)

    expect(sentBody(fetchMock)).toEqual({
      name: VALID_PAYLOAD.name,
      projectFirmRegionId: 1,
      gasDistributionFirmRegionId: 1,
    })
  })

  it('ucun saklayamadığı form alanlarını GÖNDERMEZ', async () => {
    const fetchMock = stubFetch(apiCreatedResponse(7, VALID_PAYLOAD.name))

    await createProject(VALID_PAYLOAD)

    // Bu alanlar description'a JSON olarak da gömülmüyor: sunucunun
    // sorgulayamadığı şemasız bir alan yaratırdı.
    const body = sentBody(fetchMock)
    for (const field of ['address', 'startDate', 'engineerUserId', 'heatingType', 'description']) {
      expect(body).not.toHaveProperty(field)
    }
  })

  it('firma kimliği gövdeye hiç konmaz — uç firma×bölge bağı istiyor', async () => {
    const payload: CreateProjectPayload = { ...VALID_PAYLOAD }
    delete payload.projectFirmId
    delete payload.gasDistributionFirmId
    const fetchMock = stubFetch(apiCreatedResponse(8, payload.name))

    await createProject(payload)

    const body = sentBody(fetchMock)
    expect(body).not.toHaveProperty('projectFirmId')
    expect(body.projectFirmRegionId).toBe(1)
  })
})

describe('listProjects — istemci tarafı süzme ve sayfalama', () => {
  it('durum taslak değilse boş döner (uç durum tutmuyor)', async () => {
    stubFetch([apiListItem(1, 'Demo', '2026-08-03T18:20:47')])

    const page = await listProjects({ ...TASLAK_QUERY, status: 'onaylanan' })

    expect(page.items).toEqual([])
    expect(page.totalCount).toBe(0)
  })

  it('ada ve P_ID’ye Türkçe duyarsız arama uygular', async () => {
    stubFetch([
      apiListItem(1, 'Gülbahar Apartmanı', '2026-08-03T18:20:47'),
      apiListItem(2, 'Çınar Sitesi', '2026-08-02T18:20:47'),
    ])

    const page = await listProjects({ ...TASLAK_QUERY, search: 'gulbahar' })

    expect(page.items.map((project) => project.id)).toEqual([1])
  })

  it('tarih aralığı dışındaki kaydı eler', async () => {
    stubFetch([
      apiListItem(1, 'Yeni', '2026-08-03T18:20:47'),
      apiListItem(2, 'Eski', '2026-01-03T18:20:47'),
    ])

    const page = await listProjects({ ...TASLAK_QUERY, dateFrom: '2026-08-01', dateTo: null })

    expect(page.items.map((project) => project.id)).toEqual([1])
  })

  it('30’arlı diliyor ve toplam sayıyı süzülmüş kümeden veriyor', async () => {
    const many = Array.from({ length: 35 }, (_unused, index) =>
      apiListItem(index + 1, `Proje ${index + 1}`, '2026-08-03T18:20:47'),
    )
    stubFetch(many)

    const first = await listProjects(TASLAK_QUERY)
    expect(first.items).toHaveLength(PROJECT_PAGE_SIZE)
    expect(first.totalCount).toBe(35)

    stubFetch(many)
    const second = await listProjects({ ...TASLAK_QUERY, page: 2 })
    expect(second.items).toHaveLength(5)
  })

  it('uçtan gelmeyen sütunlar yer tutucuyla dolar', async () => {
    stubFetch([apiListItem(1, 'Demo', '2026-08-03T18:20:47')])

    const [project] = (await listProjects(TASLAK_QUERY)).items

    expect(project.firmName).toBe('—')
    expect(project.gasFirm).toBeNull()
    expect(project.buildingCode).toBeNull()
    expect(project.hasDocuments).toBe(false)
  })
})
