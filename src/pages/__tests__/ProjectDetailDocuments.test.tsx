import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { asMock, buildDetail, buildHistory, buildUnits, renderDetail } from './projectDetailFixture'
import { setAuthSession } from '../../api/authToken'
import { ROLE_CODES } from '../../api/roles'

const detailApi = vi.hoisted(() => ({
  getProjectDetail: vi.fn(),
  getProjectUnits: vi.fn(),
  getProjectHistory: vi.fn(),
  getProjectDocuments: vi.fn(),
  getProjectPolicies: vi.fn(),
}))
const canApprove = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectDetail')>()),
  ...detailApi,
}))

vi.mock('../../ui/admin/useCanApproveProject', () => ({ useCanApproveProject: canApprove }))

beforeEach(() => {
  detailApi.getProjectDetail.mockResolvedValue(buildDetail())
  detailApi.getProjectUnits.mockResolvedValue(asMock(buildUnits()))
  detailApi.getProjectHistory.mockResolvedValue(asMock(buildHistory()))
  detailApi.getProjectDocuments.mockResolvedValue(asMock([]))
  detailApi.getProjectPolicies.mockResolvedValue(asMock([]))
  canApprove.mockReturnValue(true)
})

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
  vi.clearAllMocks()
})

// KK-9: boş durumda bilgilendirme kutusu, kayıt varsa liste, düğmeler yönlendirir.
describe('evrak sekmesi (KK-9)', () => {
  it('evrak yoksa bilgilendirme kutusu gösterir', async () => {
    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('tab', { name: 'Proje Evrakları' }))

    expect(
      await screen.findByText(/Projeye ait döküman bulunamamıştır\./),
    ).toBeInTheDocument()
    expect(screen.getByText('Bilgilendirme;')).toBeInTheDocument()
  })

  it('evrak varsa liste hâlinde gösterir', async () => {
    detailApi.getProjectDocuments.mockResolvedValue(
      asMock([
        {
          id: 7,
          fileName: 'ruhsat.pdf',
          docType: 'Ruhsat',
          sizeBytes: 2048,
          uploadedByName: 'AHMET AKBAYIR',
          receivedAt: '2026-07-10T11:28:28.000Z',
        },
      ]),
    )

    const user = userEvent.setup()
    renderDetail()
    await user.click(await screen.findByRole('tab', { name: 'Proje Evrakları' }))

    const table = await screen.findByRole('table', { name: /yüklenmiş evraklar/ })
    expect(within(table).getByText('ruhsat.pdf')).toBeInTheDocument()
    expect(within(table).getByText('2,0 KB')).toBeInTheDocument()
    expect(screen.queryByText(/Projeye ait döküman bulunamamıştır\./)).not.toBeInTheDocument()
  })

  it('Evrak Ekle düğmesi ilgili ekrana yönlendirir', async () => {
    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('tab', { name: 'Proje Evrakları' }))
    await user.click(await screen.findByRole('link', { name: /Evrak Ekle/ }))

    expect(await screen.findByRole('heading', { name: 'Evrak Ekle' })).toBeInTheDocument()
  })
})

describe('poliçe sekmesi (KK-9)', () => {
  it('poliçe yoksa bilgilendirme kutusu gösterir', async () => {
    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('tab', { name: 'Poliçe Bilgileri' }))

    expect(
      await screen.findByText(/Proje Poliçe Kaydı Bulunamamıştır\./),
    ).toBeInTheDocument()
  })

  it('poliçe varsa liste hâlinde gösterir', async () => {
    detailApi.getProjectPolicies.mockResolvedValue(
      asMock([
        {
          id: 3,
          policyNumber: 'PLC-1',
          insuranceCompanyName: 'Test Sigorta',
          unitNumber: 'D20',
          amount: 1500,
          startDate: '2026-01-01',
          endDate: '2027-01-01',
        },
      ]),
    )

    const user = userEvent.setup()
    renderDetail()
    await user.click(await screen.findByRole('tab', { name: 'Poliçe Bilgileri' }))

    const table = await screen.findByRole('table', { name: /Projeye bağlı poliçeler/ })
    expect(within(table).getByText('PLC-1')).toBeInTheDocument()
    expect(within(table).getByText('Onaylandı')).toBeInTheDocument()
  })

  it('Poliçelendir düğmesi ilgili ekrana yönlendirir', async () => {
    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('tab', { name: 'Poliçe Bilgileri' }))
    await user.click(await screen.findByRole('link', { name: /Poliçelendir/ }))

    expect(await screen.findByRole('heading', { name: 'Poliçe Oluşturma' })).toBeInTheDocument()
  })
})

/**
 * Gaz dağıtım kullanıcısı evrak ve poliçeyi GÖRÜR, yazamaz. Sunucudaki sınırın
 * aynısı: `POST /api/docs` ve `POST /api/policies` uçları
 * `Authorize(Roles = Admin, ProjectFirmUser)`.
 */
describe('proje detayı — gaz dağıtım kullanıcısı', () => {
  it('evrak sekmesinde "Evrak Ekle" kısayolunu göstermez', async () => {
    const user = userEvent.setup()
    renderDetail(undefined, ROLE_CODES.gasDistributionUser)

    await user.click(await screen.findByRole('tab', { name: 'Proje Evrakları' }))

    // Sekmenin GÖRÜNTÜLEME yüzeyi duruyor (varsayılan mock boş liste →
    // bilgilendirme kutusu); gizlenen yalnız yazma kısayolu.
    expect(
      await screen.findByText(/Projeye ait döküman bulunamamıştır\./),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Evrak Ekle/ })).not.toBeInTheDocument()
  })

  it('poliçe sekmesinde "Poliçelendir" kısayolunu göstermez', async () => {
    const user = userEvent.setup()
    renderDetail(undefined, ROLE_CODES.gasDistributionUser)

    await user.click(await screen.findByRole('tab', { name: 'Poliçe Bilgileri' }))

    expect(screen.queryByRole('link', { name: /Poliçelendir/ })).not.toBeInTheDocument()
  })

  it('işlemler sekmesinde iki yazma kısayolunu da göstermez', async () => {
    const user = userEvent.setup()
    renderDetail(undefined, ROLE_CODES.gasDistributionUser)

    await user.click(await screen.findByRole('tab', { name: 'Proje İşlemleri' }))

    expect(screen.queryByRole('link', { name: /Evrak Ekle/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Poliçelendir/ })).not.toBeInTheDocument()
  })

  it('yönetici aynı kısayolları görmeye devam eder', async () => {
    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('tab', { name: 'Proje İşlemleri' }))

    expect(screen.getByRole('link', { name: /Evrak Ekle/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Poliçelendir/ })).toBeInTheDocument()
  })
})
