import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setAuthSession } from '../../api/authToken'
import { ROLE_CODES, type RoleCode } from '../../api/roles'
import { MyGasDistributionFirmsPage } from '../MyGasDistributionFirmsPage'

const authApi = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
const authorizationApi = vi.hoisted(() => ({ getAuthorizedGasFirms: vi.fn() }))
const nameApi = vi.hoisted(() => ({ getGasFirmName: vi.fn() }))

vi.mock('../../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/auth')>()),
  ...authApi,
}))

vi.mock('../../api/projectFirmAuthorizations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmAuthorizations')>()),
  ...authorizationApi,
  ...nameApi,
}))

const ME = {
  id: 7,
  username: 'kullanici',
  fullName: 'Kullanıcı',
  roleCode: ROLE_CODES.projectFirmUser as string,
  projectFirmId: 201,
  gasDistributionFirmId: null as number | null,
}

function renderPage(roleCode: RoleCode) {
  setAuthSession({
    token: 'jwt-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    fullName: 'Kullanıcı',
    roleCode,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MyGasDistributionFirmsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
})

/**
 * Ekranın kaynağı GERÇEK uçlar; sahte satır üretmiyor. İki rol iki ayrı uçtan
 * besleniyor çünkü yönetimin liste ucu (`GET /api/gasdistributionfirms`)
 * sunucuda yalnız Admin'e açık.
 */
describe('ait olduğu gaz dağıtım firmaları', () => {
  it('proje firması kullanıcısında yetki kayıtlarından okur', async () => {
    authApi.getCurrentUser.mockResolvedValue({ ...ME, roleCode: ROLE_CODES.projectFirmUser })
    authorizationApi.getAuthorizedGasFirms.mockResolvedValue([
      { id: 101, name: 'Başkentgaz' },
      { id: 102, name: 'Doğugaz' },
    ])

    renderPage(ROLE_CODES.projectFirmUser)

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Başkentgaz')).toBeInTheDocument()
    expect(within(table).getByText('Doğugaz')).toBeInTheDocument()
    // Kimlik oturumdan değil `/api/auth/me`'den; sabit kimlik YOK.
    expect(authorizationApi.getAuthorizedGasFirms).toHaveBeenCalledWith(201, expect.anything())
    expect(nameApi.getGasFirmName).not.toHaveBeenCalled()
  })

  /**
   * Ad YETKİ ucundan çözülüyor: `GET /api/gasdistributionfirms/{id}` sunucuda
   * `[Authorize(Roles = Admin)]` ve bu rolde 403 dönüyordu.
   */
  it('gaz dağıtım kullanıcısında firma adını yetki ucundan okur', async () => {
    authApi.getCurrentUser.mockResolvedValue({
      ...ME,
      roleCode: ROLE_CODES.gasDistributionUser,
      projectFirmId: null,
      gasDistributionFirmId: 101,
    })
    nameApi.getGasFirmName.mockResolvedValue('Başkentgaz')

    renderPage(ROLE_CODES.gasDistributionUser)

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Başkentgaz')).toBeInTheDocument()
    expect(nameApi.getGasFirmName).toHaveBeenCalledWith(101, expect.anything())
    expect(authorizationApi.getAuthorizedGasFirms).not.toHaveBeenCalled()
  })

  /** Satırda tıklanabilir hücre YOK: bu roller firmayı düzenleyemiyor. */
  it('satırda bağlantı çizmez', async () => {
    authApi.getCurrentUser.mockResolvedValue({ ...ME, roleCode: ROLE_CODES.projectFirmUser })
    authorizationApi.getAuthorizedGasFirms.mockResolvedValue([{ id: 101, name: 'Başkentgaz' }])

    renderPage(ROLE_CODES.projectFirmUser)

    const table = await screen.findByRole('table')
    expect(within(table).queryAllByRole('link')).toHaveLength(0)
  })

  it('firma bağı yoksa istek atmaz ve sebebini yazar', async () => {
    authApi.getCurrentUser.mockResolvedValue({
      ...ME,
      roleCode: ROLE_CODES.projectFirmUser,
      projectFirmId: null,
    })

    renderPage(ROLE_CODES.projectFirmUser)

    expect(await screen.findByText(/ilişkilendirilmemiş/)).toBeInTheDocument()
    expect(authorizationApi.getAuthorizedGasFirms).not.toHaveBeenCalled()
  })

  it('uç düşerse anlaşılır hata gösterir', async () => {
    authApi.getCurrentUser.mockResolvedValue({ ...ME, roleCode: ROLE_CODES.projectFirmUser })
    authorizationApi.getAuthorizedGasFirms.mockRejectedValue(new Error('bozuk'))

    renderPage(ROLE_CODES.projectFirmUser)

    expect(await screen.findByRole('alert')).toHaveTextContent('Firma bilgileri yüklenemedi.')
  })
})
