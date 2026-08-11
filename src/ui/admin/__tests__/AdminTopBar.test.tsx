import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminTopBar } from '../AdminTopBar'
import { GAS_DISTRIBUTION_FIRMS_PATH, PROJECT_FIRMS_PATH } from '../adminNavItems'

const { getFirmGroups } = vi.hoisted(() => ({ getFirmGroups: vi.fn() }))

vi.mock('../../../api/adminFirms', () => ({ getFirmGroups }))

const GROUPS = [
  { id: 1, name: 'AKSA' },
  { id: 2, name: 'ENERYA' },
]

/** Kapsamın URL'e yazıldığı testlerde adresi okumak için. */
function LocationProbe() {
  const { search } = useLocation()
  return <span data-testid="search">{search}</span>
}

function renderTopBar(pathname: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[pathname]}>
        <AdminTopBar />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  // Çağrı sayısı testler arasında taşınmasın: "hiç istek atılmadı" iddiası buna bakıyor.
  getFirmGroups.mockClear()
  getFirmGroups.mockResolvedValue(GROUPS)
})

describe('AdminTopBar bölge kapsamı', () => {
  it('grup firmalarını seçenek olarak listeler', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)

    expect(await screen.findByRole('option', { name: 'AKSA' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Tüm bölgeler' })).toBeInTheDocument()
  })

  // Kapsamın sahibi URL: bağlantı paylaşılınca seçim de gitsin.
  it('seçimi URL query string\'ine yazar', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    await screen.findByRole('option', { name: 'ENERYA' })

    await userEvent.selectOptions(screen.getByLabelText('Bölge'), 'ENERYA')

    expect(screen.getByTestId('search')).toHaveTextContent('group=2')
  })

  it('"Tüm bölgeler" seçilince anahtarı adresten siler', async () => {
    renderTopBar(`${GAS_DISTRIBUTION_FIRMS_PATH}?group=2`)
    await screen.findByRole('option', { name: 'ENERYA' })

    await userEvent.selectOptions(screen.getByLabelText('Bölge'), 'Tüm bölgeler')

    expect(screen.getByTestId('search')).not.toHaveTextContent('group=')
  })

  // Kapsam her yönetici ekranında etkin (K44) — tek bir ekrana bağlı değil.
  it('gaz dağıtım firmaları dışındaki ekranda da etkin kalır', async () => {
    renderTopBar(PROJECT_FIRMS_PATH)

    expect(screen.getByLabelText('Bölge')).toBeEnabled()
    expect(await screen.findByRole('option', { name: 'AKSA' })).toBeInTheDocument()
  })

  it('kapsamı her ekranda aynı anahtara yazar', async () => {
    renderTopBar(PROJECT_FIRMS_PATH)
    await screen.findByRole('option', { name: 'AKSA' })

    await userEvent.selectOptions(screen.getByLabelText('Bölge'), 'AKSA')

    expect(screen.getByTestId('search')).toHaveTextContent('group=1')
  })
})
