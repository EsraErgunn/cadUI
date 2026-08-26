import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GAS_DISTRIBUTION_USERS_PATH } from '../../ui/admin/adminNavItems'
import { GasDistributionUsersPage } from '../GasDistributionUsersPage'

const listApi = vi.hoisted(() => ({ listGasDistributionUsers: vi.fn() }))
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/gasDistributionUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/gasDistributionUsers')>()),
  ...listApi,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

const USER = {
  id: 41,
  username: 'mehmet.yilmaz',
  fullName: 'MEHMET YILMAZ',
  email: 'mehmet@ornek.local',
  phone: '05551112233',
}

function renderPage() {
  listApi.listGasDistributionUsers.mockResolvedValue({
    items: [USER],
    totalCount: 1,
    page: 1,
    pageSize: 30,
  })
  useIsAdmin.mockReturnValue(true)

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[GAS_DISTRIBUTION_USERS_PATH]}>
        <Routes>
          <Route path={GAS_DISTRIBUTION_USERS_PATH} element={<GasDistributionUsersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('gaz dağıtım kullanıcıları listesi', () => {
  /**
   * Ürün kuralı: gaz dağıtım kullanıcısı proje firmasına BAĞLI DEĞİL. Sunucu
   * `UserDto`'da `projectFirmName` taşımaya devam ediyor (tek tablo iki rolü de
   * karşılıyor) ama bu ekranda göstermek olmayan bir ilişki varmış gibi okunurdu.
   */
  it('"Proje Firması" sütunu ÇİZİLMEZ', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.trim())

    expect(headers).not.toContain('Proje Firması')
  })

  it('kullanıcı alanlarını gösterir', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    expect(within(table).getByText('mehmet.yilmaz')).toBeInTheDocument()
    expect(within(table).getByText('MEHMET YILMAZ')).toBeInTheDocument()
    expect(within(table).getByText('mehmet@ornek.local')).toBeInTheDocument()
  })
})

/**
 * Düzenlemenin girişi TEK hücre: kullanıcı adı. Ayrı bir "Düzenle" sütunu
 * açılmaz; ad soyad da bağlantıydı, aynı kaydın aynı formuna giden ikinci bir
 * yol olduğu için düz metne çevrildi.
 */
describe('gaz dağıtım kullanıcısı düzenleme girişi', () => {
  it('kullanıcı adı güncelleme ekranına bağlanır', async () => {
    renderPage()

    const table = await screen.findByRole('table')

    expect(within(table).getByRole('link', { name: USER.username })).toHaveAttribute(
      'href',
      `${GAS_DISTRIBUTION_USERS_PATH}/${USER.id}`,
    )
  })

  it('satırdaki tek bağlantı kullanıcı adıdır', async () => {
    renderPage()

    const table = await screen.findByRole('table')

    expect(within(table).getAllByRole('link')).toHaveLength(1)
    expect(within(table).getByText(USER.fullName).closest('a')).toBeNull()
  })
})

/**
 * Silme ucu sunucuda HENÜZ YOK (`DELETE /api/users/{id}`). Düğme çiziliyor ama
 * onaylandığında sahte başarı göstermiyor: `useRowDelete`'in "unavailable" kolu
 * sebebini söylüyor ve satır listede kalıyor.
 */
describe('kullanıcı silme', () => {
  it('yöneticiye satır başına "Sil" gösterir', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    expect(within(table).getByRole('button', { name: 'Sil' })).toBeInTheDocument()
  })

  it('yönetici olmayanda eylem sütunu hiç üretilmez', async () => {
    useIsAdmin.mockReturnValue(false)
    renderPage()
    useIsAdmin.mockReturnValue(false)

    const table = await screen.findByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.trim())

    expect(headers).not.toContain('Aksiyonlar')
    expect(within(table).queryByRole('button', { name: 'Sil' })).not.toBeInTheDocument()
  })

  it('onaylanınca ucun olmadığını söyler ve satır listede kalır', async () => {
    const user = userEvent.setup()
    renderPage()

    const table = await screen.findByRole('table')
    await user.click(within(table).getByRole('button', { name: 'Sil' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Sil' }))

    expect(await screen.findByText(/silme ucu sunucuda henüz yok/)).toBeInTheDocument()
    expect(within(await screen.findByRole('table')).getByText(USER.username)).toBeInTheDocument()
  })
})
