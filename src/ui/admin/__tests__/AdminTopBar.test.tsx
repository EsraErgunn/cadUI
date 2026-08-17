import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminTopBar } from '../AdminTopBar'
import { GAS_DISTRIBUTION_FIRMS_PATH, PROJECT_FIRMS_PATH } from '../adminNavItems'

const { getFirmGroups, fetchAllFirms } = vi.hoisted(() => ({
  getFirmGroups: vi.fn(),
  fetchAllFirms: vi.fn(),
}))

vi.mock('../../../api/adminFirms', () => ({ getFirmGroups, fetchAllFirms }))

/** Sunucu Türkçe sıralamıyor; sıra istemcinin garantisi olduğu için mock
    bilerek karışık veriliyor (ENERYA önce, ÇEDAŞ 'D'den sonra). */
const GROUPS = [
  { id: 2, name: 'ENERYA' },
  { id: 1, name: 'AKSA' },
  { id: 3, name: 'ÇEDAŞ' },
]

const FIRMS = [
  { id: 21, dfirmNo: 1, groupId: 1, groupName: 'AKSA', name: 'AKSA-Denizli' },
  { id: 20, dfirmNo: 2, groupId: 1, groupName: 'AKSA', name: 'AKSA-Ankara' },
  { id: 30, dfirmNo: 3, groupId: 2, groupName: 'ENERYA', name: 'ENERYA-Aydın' },
  { id: 40, dfirmNo: 4, groupId: null, groupName: null, name: 'Bağımsız Gaz' },
]

/** Kapsamın URL'e yazıldığını okumak için. */
function LocationProbe() {
  const { pathname, search } = useLocation()
  return (
    <>
      <span data-testid="search">{search}</span>
      <span data-testid="location">{pathname}</span>
    </>
  )
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
  fetchAllFirms.mockClear()
  fetchAllFirms.mockResolvedValue(FIRMS)
})

describe('AdminTopBar kapsam seçicisi', () => {
  it('grupları ve firmalarını hiyerarşik listeler', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)

    expect(await screen.findByRole('option', { name: 'AKSA (tümü)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'AKSA-Ankara' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sistem geneli' })).toBeInTheDocument()
  })

  // Firma KENDİ grubunun altında görünmeli; başka grubun altına düşerse kapsam
  // seçimi kullanıcıya yanlış hiyerarşi gösterir.
  it('firmayı kendi grubunun altına koyar', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    const firmOption = await screen.findByRole('option', { name: 'ENERYA-Aydın' })

    expect(firmOption.closest('optgroup')).toHaveAttribute('label', 'ENERYA')
  })

  // Sunucu Türkçe sıralamıyor: hem gruplar hem her grubun firmaları istemcide sıralanır.
  it('grupları ve firmaları Türkçe alfabeye göre sıralar', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    await screen.findByRole('option', { name: 'AKSA (tümü)' })

    const groupLabels = [...document.querySelectorAll('optgroup')].map((node) =>
      node.getAttribute('label'),
    )
    expect(groupLabels).toEqual(['AKSA', 'ÇEDAŞ', 'ENERYA', 'Grubu olmayan firmalar'])

    const aksaFirms = [...(document.querySelector('optgroup[label="AKSA"]')?.children ?? [])]
      .map((node) => node.textContent)
      .slice(1)
    expect(aksaFirms).toEqual(['AKSA-Ankara', 'AKSA-Denizli'])
  })

  // Kapsamın sahibi URL: bağlantı paylaşılınca seçim de gitsin.
  it('grup seçimini group anahtarına yazar', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    await screen.findByRole('option', { name: 'ENERYA (tümü)' })

    await userEvent.selectOptions(screen.getByLabelText('Kapsam'), 'ENERYA (tümü)')

    expect(screen.getByTestId('search')).toHaveTextContent('group=2')
    expect(screen.getByTestId('search')).not.toHaveTextContent('gdfirm=')
  })

  // İki anahtar aynı anda yazılmaz: sunucu gdGroupId+gdFirmId ikilisini kabul etmiyor.
  it('firma seçimini gdfirm anahtarına yazar ve grubu siler', async () => {
    renderTopBar(`${GAS_DISTRIBUTION_FIRMS_PATH}?group=1`)
    await screen.findByRole('option', { name: 'AKSA-Ankara' })

    await userEvent.selectOptions(screen.getByLabelText('Kapsam'), 'AKSA-Ankara')

    expect(screen.getByTestId('search')).toHaveTextContent('gdfirm=20')
    expect(screen.getByTestId('search')).not.toHaveTextContent('group=')
  })

  it('"Sistem geneli" seçilince iki anahtarı da adresten siler', async () => {
    renderTopBar(`${GAS_DISTRIBUTION_FIRMS_PATH}?gdfirm=20`)
    await screen.findByRole('option', { name: 'AKSA-Ankara' })

    await userEvent.selectOptions(screen.getByLabelText('Kapsam'), 'Sistem geneli')

    expect(screen.getByTestId('search')).not.toHaveTextContent('gdfirm=')
    expect(screen.getByTestId('search')).not.toHaveTextContent('group=')
  })

  // Grubu olmayan firma elenirse kapsamı arayüzden hiç seçilemez.
  it('grubu olmayan firmayı ayrı başlık altında gösterir', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    const firmOption = await screen.findByRole('option', { name: 'Bağımsız Gaz' })

    expect(firmOption.closest('optgroup')).toHaveAttribute('label', 'Grubu olmayan firmalar')
  })

  // Kapsam her yönetici ekranında etkin (K44) — tek bir ekrana bağlı değil.
  it('gaz dağıtım firmaları dışındaki ekranda da etkin kalır', async () => {
    renderTopBar(PROJECT_FIRMS_PATH)

    expect(screen.getByLabelText('Kapsam')).toBeEnabled()
    expect(await screen.findByRole('option', { name: 'AKSA (tümü)' })).toBeInTheDocument()
  })
})
