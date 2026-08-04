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
  region: null,
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
  it('bölge verilmezse tüm firmaları döndürür', async () => {
    const firms = await getProjectFirms()

    expect(firms.length).toBeGreaterThan(1)
  })

  it('bölge verilirse listeyi o bölgeyle sınırlar', async () => {
    const all = await getProjectFirms()
    const scoped = await getProjectFirms('Akdeniz')

    expect(scoped.length).toBeGreaterThan(0)
    expect(scoped.length).toBeLessThan(all.length)
  })
})

describe('getGasFirmsForProjectFirm', () => {
  it('yalnız seçili proje firmasının çalıştığı GD firmalarını döndürür', async () => {
    const forFirst = await getGasFirmsForProjectFirm({ projectFirmId: 12, region: null })
    const forSecond = await getGasFirmsForProjectFirm({ projectFirmId: 13, region: null })

    expect(forFirst.map((firm) => firm.id)).toEqual([101])
    expect(forSecond.map((firm) => firm.id)).toEqual([102, 103])
  })

  it('bağlı GD firması olmayan proje firmasında boş liste döner', async () => {
    const firms = await getGasFirmsForProjectFirm({ projectFirmId: 999, region: null })

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

describe('createProject', () => {
  it('projeyi taslak durumunda oluşturur ve P_ID üretir', async () => {
    const created = await createProject(VALID_PAYLOAD)

    expect(created.status).toBe('taslak')
    expect(created.pId).not.toBe('')
    expect(created.id).toBeGreaterThan(0)
  })

  it('oluşan kayıt taslak listesinde seçilen firmalarla görünür', async () => {
    const created = await createProject({ ...VALID_PAYLOAD, name: 'Listede Görünen Proje' })
    const page = await listProjects(TASLAK_QUERY)
    const listed = page.items.find((project) => project.id === created.id)

    expect(listed).toBeDefined()
    expect(listed?.name).toBe('Listede Görünen Proje')
    expect(listed?.gasFirm?.id).toBe(101)
    expect(listed?.firmName).not.toBe('')
  })

  it('firma kimliği gönderilmezse kayıt yine oluşur (sunucu token’dan türetir)', async () => {
    const payload: CreateProjectPayload = { ...VALID_PAYLOAD }
    delete payload.projectFirmId
    delete payload.gasDistributionFirmId

    const created = await createProject(payload)
    const page = await listProjects(TASLAK_QUERY)

    expect(page.items.find((project) => project.id === created.id)?.firmName).not.toBe('')
  })
})
