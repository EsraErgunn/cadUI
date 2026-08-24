import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getProjectDetail: vi.fn(),
  getProjectHistory: vi.fn(),
  getProjectFirm: vi.fn(),
  getGasDistributionFirm: vi.fn(),
  getProjectFirmAuthorizations: vi.fn(),
}))

vi.mock('../../api/projectDetail', async () => ({
  ...(await vi.importActual<object>('../../api/projectDetail')),
  getProjectDetail: api.getProjectDetail,
  getProjectHistory: api.getProjectHistory,
}))
vi.mock('../../api/projectFirmForm', () => ({ getProjectFirm: api.getProjectFirm }))
vi.mock('../../api/projectFirmAuthorizations', () => ({
  getProjectFirmAuthorizations: api.getProjectFirmAuthorizations,
}))
vi.mock('../../api/adminFirmForm', () => ({ getGasDistributionFirm: api.getGasDistributionFirm }))

const { useProjectSummary } = await import('../useProjectSummary')

const PROJECT_ID = 42

/** Kullanıcının paylaştığı gerçek `GET /api/projects/{id}` gövdesinin şekli. */
function serverFields() {
  return {
    id: PROJECT_ID,
    pId: '30006185',
    name: 'İlave',
    description: null,
    cityName: 'Kütahya',
    districtName: 'Merkez',
    addressLine: 'Atatürk Mah. Yerli Sk. No:66 Merkez/Kütahya',
    blockLotParcel: '100/1',
    // ⚠️ Canlı uç `projectFirmId` DÖNDÜRMÜYOR; firma kimliği yetki kaydından
    // çözülüyor (ölçüldü, K159).
    projectFirmAuthorizationId: 17,
    gasDistributionFirmId: 3,
    projectTypeName: 'İLAVE',
    heatingTypeName: 'Bireysel',
    apartmentCount: 12,
    workplaceCount: 2,
    areaSquareMeters: 2016,
    createdAt: '2026-07-03T08:00:00.000Z',
    updatedAt: '2026-07-10T11:36:53.000Z',
  }
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getProjectDetail.mockResolvedValue({ server: serverFields(), extras: null })
  api.getProjectHistory.mockResolvedValue({ source: 'server', data: [] })
  api.getProjectFirmAuthorizations.mockResolvedValue([
    {
      id: 17,
      projectFirmId: 7,
      projectFirmName: 'Kütahya Test Firması',
      gasDistributionFirmId: 3,
      gasDistributionFirmName: 'TOROSGAZ-KÜTAHYA',
      validFrom: '2026-01-01T00:00:00',
      validTo: null,
    },
  ])
  api.getProjectFirm.mockResolvedValue({
    id: 7,
    companyType: 2,
    title: 'Kütahya Test Firması',
    taxNumber: '2222222222',
    nationalIdNumber: null,
    accountingCode: null,
    contactPerson: 'Mehmet Demir',
    email: null,
    phone: '2164021000',
    phone2: null,
    address: 'Altunizade Mahir İz Cad.',
  })
  api.getGasDistributionFirm.mockResolvedValue({
    id: 3,
    dfirmNo: 1,
    name: 'TOROSGAZ-KÜTAHYA',
    groupId: null,
    groupName: null,
    description: null,
    contactPerson: 'Dağıtım Yetkilisi',
    address: null,
    phone: null,
  })
})

describe('useProjectSummary', () => {
  it('firma künyesini PROJEDEN gelen kimlikle çözer', async () => {
    const { result } = renderHook(() => useProjectSummary(PROJECT_ID), { wrapper })

    await waitFor(() => expect(result.current.firm.title).not.toBe(''))

    // Zincir ÜÇ halkalı: proje → yetki kaydı → firma. Kullanıcı bildirimi
    // (2026-08): kapakta firma satırları boş çıkıyordu, çünkü canlı proje
    // yanıtında `projectFirmId` yok ve firma sorgusu hiç tetiklenmiyordu.
    expect(api.getProjectFirm).toHaveBeenCalledWith(7, expect.anything())
    expect(result.current.firm).toEqual({
      title: 'Kütahya Test Firması',
      taxNumber: '2222222222',
      address: 'Altunizade Mahir İz Cad.',
      phone: '2164021000',
    })
  })

  it('gaz dağıtım firmasının adını ve yetkilisini getirir', async () => {
    const { result } = renderHook(() => useProjectSummary(PROJECT_ID), { wrapper })

    await waitFor(() => expect(result.current.approval.gasFirmName).not.toBe(''))

    expect(api.getGasDistributionFirm).toHaveBeenCalledWith(3, expect.anything())
    expect(result.current.approval.gasFirmName).toBe('TOROSGAZ-KÜTAHYA')
    expect(result.current.approval.gasFirmContactPerson).toBe('Dağıtım Yetkilisi')
  })

  it('ADMIN oluşturmuşsa tasarımcı firma yetkilisine düşer', async () => {
    api.getProjectHistory.mockResolvedValue({
      source: 'server',
      data: [
        {
          id: 'a',
          fileType: null,
          createdAt: '2026-07-03T08:00:00.000Z',
          userName: 'Sistem Yöneticisi',
          roleSnapshot: 'Yönetici',
          operation: 'projeKayit',
          operationName: 'Proje Kayıt',
          description: null,
        },
      ],
    })

    const { result } = renderHook(() => useProjectSummary(PROJECT_ID), { wrapper })

    await waitFor(() => expect(result.current.designer.name).not.toBe(''))
    expect(result.current.designer.name).toBe('Mehmet Demir')
  })

  it('proje firması kullanıcısı oluşturmuşsa ONUN adı yazılır', async () => {
    api.getProjectHistory.mockResolvedValue({
      source: 'server',
      data: [
        {
          id: 'a',
          fileType: null,
          createdAt: '2026-07-03T08:00:00.000Z',
          userName: 'Ahmet Yılmaz',
          roleSnapshot: 'Proje Firması Kullanıcısı',
          operation: 'projeKayit',
          operationName: 'Proje Kayıt',
          description: null,
        },
      ],
    })

    const { result } = renderHook(() => useProjectSummary(PROJECT_ID), { wrapper })

    await waitFor(() => expect(result.current.designer.name).not.toBe(''))
    expect(result.current.designer.name).toBe('Ahmet Yılmaz')
  })

  it('proje alanlarını künyeye taşır ve adresten sokak/kapı ayrıştırır', async () => {
    const { result } = renderHook(() => useProjectSummary(PROJECT_ID), { wrapper })

    await waitFor(() => expect(result.current.name).toBe('İlave'))

    expect(result.current.building.projectType).toBe('İLAVE')
    expect(result.current.building.residenceCount).toBe('12')
    expect(result.current.building.shopCount).toBe('2')
    expect(result.current.building.totalAreaSquareMeters).toBe('2016')
    expect(result.current.streetName).toBe('Atatürk Mah. Yerli Sk.')
    expect(result.current.doorNumber).toBe('66')
  })

  it('firma kimliği YOKSA firma sorgusu HİÇ çalışmaz, kapak yine üretilir', async () => {
    api.getProjectDetail.mockResolvedValue({
      server: {
        ...serverFields(),
        projectFirmAuthorizationId: null,
        gasDistributionFirmId: null,
      },
      extras: null,
    })

    const { result } = renderHook(() => useProjectSummary(PROJECT_ID), { wrapper })

    await waitFor(() => expect(result.current.name).toBe('İlave'))

    expect(api.getProjectFirm).not.toHaveBeenCalled()
    expect(result.current.firm.title).toBe('')
  })
})
