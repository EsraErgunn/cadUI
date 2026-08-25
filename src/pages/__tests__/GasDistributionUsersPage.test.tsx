import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
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
    source: 'server' as const,
    data: { items: [USER], totalCount: 1, page: 1, pageSize: 30 },
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
 * Düzenleme, Proje Firması Kullanıcıları ekranındaki desenin aynısı: satırın
 * kimliğini taşıyan hücreler güncelleme ekranına GÖTÜRÜR, ayrı bir "Düzenle"
 * sütunu açılmaz.
 */
describe('gaz dağıtım kullanıcısı düzenleme girişi', () => {
  it('kullanıcı adı ve ad soyad güncelleme ekranına bağlanır', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    const target = `${GAS_DISTRIBUTION_USERS_PATH}/${USER.id}`

    expect(within(table).getByRole('link', { name: USER.username })).toHaveAttribute(
      'href',
      target,
    )
    expect(within(table).getByRole('link', { name: USER.fullName })).toHaveAttribute(
      'href',
      target,
    )
  })
})
