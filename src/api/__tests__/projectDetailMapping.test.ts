import { afterEach, describe, expect, it, vi } from 'vitest'

import { getProjectDetail } from '../projectDetail'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * `GET /api/projects/{id}` gövdesinin ilgili parçası. Alan adları sunucunun
 * `ProjectDetailDto`'sundan birebir (cadapi, `ProjectManager.GetByIdAsync`).
 */
const DETAIL_DTO = {
  id: 42,
  name: 'Test Apartmanı',
  description: null,
  status: 'Approved',
  statusName: 'Onaylanan',
  projectFirmAuthorizationId: 17,
  projectFirmId: 11,
  gasDistributionFirmId: 101,
  cityName: 'Kütahya',
  districtName: 'Merkez',
  addressLine: 'Test Mahallesi',
  blockLotParcel: null,
  buildingCode: '30006185',
  floorCount: 7,
  basementCount: 1,
  gasDistributionFirmName: 'TOROSGAZ-KÜTAHYA',
  projectTypeName: 'İLAVE',
  heatingTypeName: 'Bireysel',
  buildingUsageTypeName: 'Konut',
  isPermitProject: false,
  apartmentCount: 2,
  workplaceCount: 1,
  areaSquareMeters: 2015,
  capacity: 53,
  serviceBoxPressureMbar: 21,
  createdAt: '2026-07-01T08:00:00',
  updatedAt: '2026-07-02T08:00:00',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getProjectDetail eşlemesi', () => {
  /**
   * Firma künyesinin ANAHTARI. Uç `ProjectFirmId`yi yetki kaydından türetip
   * gövdeye yazıyor; burada bir süre sabit `null` duruyordu ve detay ekranı
   * firma isteğini hiç açmadığı için "Proje Firma Bilgileri" kartı tümüyle boş
   * görünüyordu.
   */
  it('firma kimliğini gövdeden okur', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(DETAIL_DTO))))

    const { server } = await getProjectDetail(42)

    expect(server.projectFirmId).toBe(11)
  })

  it('gövdede firma kimliği yoksa null bırakır, uydurmaz', async () => {
    const withoutFirmId = { ...DETAIL_DTO, projectFirmId: null }
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(withoutFirmId))))

    const { server } = await getProjectDetail(42)

    expect(server.projectFirmId).toBeNull()
  })

  /** "Detay Bilgileri" kartını besleyen sayısal alanlar gövdeden geliyor. */
  it('teknik değerleri gövdeden türetir', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(DETAIL_DTO))))

    const { extras } = await getProjectDetail(42)

    expect(extras?.specs).toMatchObject({
      // Kat adedi `Building.FloorCount`'tan; uç bir süre taşımıyordu ve alan
      // ekranda hep boş görünüyordu.
      floorCount: 7,
      residenceCount: 2,
      shopCount: 1,
      boxPressureMbar: 21,
      totalAreaSquareMeters: 2015,
      totalCapacity: 53,
      connectionObject: '30006185',
    })
  })

  /** Gaz dağıtım firmasının ünvanı da gövdeden; uydurulmuyor. */
  it('gaz dağıtım firmasının adını gövdeden okur', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(DETAIL_DTO))))

    const { extras } = await getProjectDetail(42)

    expect(extras?.general.gasFirmName).toBe('TOROSGAZ-KÜTAHYA')
  })
})
