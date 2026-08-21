import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LIST_PATH, buildPage, buildRow, renderWithProviders } from './projectFirmUserFixture'
import { ProjectFirmUsersPage } from '../ProjectFirmUsersPage'

const listApi = vi.hoisted(() => ({ getProjectFirmUserList: vi.fn() }))
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectFirmUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmUsers')>()),
  ...listApi,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

function renderPage(route = LIST_PATH, total = 1) {
  listApi.getProjectFirmUserList.mockResolvedValue(
    buildPage([buildRow()], { totalCount: total, pageSize: 30 }),
  )
  useIsAdmin.mockReturnValue(true)

  return renderWithProviders({ route, children: <ProjectFirmUsersPage /> })
}

/** Son istekte sunucuya giden sorgu. */
function lastQuery() {
  const calls = listApi.getProjectFirmUserList.mock.calls
  return calls[calls.length - 1][0]
}

afterEach(() => {
  vi.clearAllMocks()
})

/**
 * "Filtrele" düğmesi KALKTI: yetki ve "Aktif" seçildiği anda uygulanıyor,
 * ARAMA ise Enter'da (her harfte istek atmamak için; debounce eklenmedi).
 */
describe('filtrenin uygulanma anı', () => {
  it('yazarken istek çıkmaz, Enter ile tek istek çıkar', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')
    const callsBefore = listApi.getProjectFirmUserList.mock.calls.length

    await user.type(screen.getByLabelText(/Kullanıcı adı, ad soyad/), 'tolga')
    expect(listApi.getProjectFirmUserList.mock.calls).toHaveLength(callsBefore)

    await user.keyboard('{Enter}')

    await waitFor(() => expect(lastQuery()).toMatchObject({ nameQuery: 'tolga' }))
  })

  // KK-5: arama alanında Enter da uygular.
  it('arama alanında Enter filtreyi uygular', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    await user.type(screen.getByLabelText(/Kullanıcı adı, ad soyad/), 'ertek{Enter}')

    await waitFor(() => expect(lastQuery()).toMatchObject({ nameQuery: 'ertek' }))
  })
})

describe('yetki ve aktif filtreleri (KK-3, KK-4)', () => {
  it('seçilen yetki sunucuya gider', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    await user.selectOptions(screen.getByLabelText('Yetki'), 'firmAuthorizedPerson')

    await waitFor(() => expect(lastQuery()).toMatchObject({ authorityType: 'firmAuthorizedPerson' }))
  })

  it('"Aktif" işaretlenince yalnız aktif kayıtlar istenir', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    await user.click(screen.getByLabelText('Aktif'))

    await waitFor(() => expect(lastQuery()).toMatchObject({ onlyActive: true }))
  })
})

// KK-6: üç kriter birlikte gider, liste ilk sayfadan başlar.
describe('kriterlerin birlikte uygulanması (KK-6)', () => {
  it('üç kriteri tek istekte gönderir ve ilk sayfaya döner', async () => {
    const user = userEvent.setup()
    renderPage(`${LIST_PATH}?page=4`)
    await screen.findByRole('table')

    // Her seçim kendi isteğini atıyor; son istek üç kriteri birlikte taşıyor
    // ve sayfa 1'e dönüyor.
    await user.selectOptions(screen.getByLabelText('Yetki'), 'firmEngineer')
    await user.click(screen.getByLabelText('Aktif'))
    await user.type(screen.getByLabelText(/Kullanıcı adı, ad soyad/), 'tolga{Enter}')

    await waitFor(() =>
      expect(lastQuery()).toMatchObject({
        authorityType: 'firmEngineer',
        onlyActive: true,
        nameQuery: 'tolga',
        page: 1,
      }),
    )
  })
})

describe('uygulanan filtre çipleri', () => {
  it('uygulanan kriterleri çip olarak gösterir ve tek tek kaldırır', async () => {
    const user = userEvent.setup()
    renderPage(`${LIST_PATH}?q=tolga&type=firmEngineer&active=1`)
    await screen.findByRole('table')

    const chips = screen.getByLabelText('Uygulanan filtreler')
    expect(chips).toHaveTextContent('Firma Mühendisi')
    expect(chips).toHaveTextContent('Yalnız aktif')
    expect(chips).toHaveTextContent('tolga')

    await user.click(screen.getByRole('button', { name: 'Yetki filtresini kaldır' }))

    await waitFor(() => expect(lastQuery()).toMatchObject({ authorityType: null }))
  })

  // Çip kaldırılınca kutulardaki taslak da URL'den yeniden kurulmalı.
  it('çip kaldırılınca kutu da temizlenir', async () => {
    const user = userEvent.setup()
    renderPage(`${LIST_PATH}?type=firmEngineer`)
    await screen.findByRole('table')
    expect(screen.getByLabelText('Yetki')).toHaveValue('firmEngineer')

    await user.click(screen.getByRole('button', { name: 'Yetki filtresini kaldır' }))

    await waitFor(() => expect(screen.getByLabelText('Yetki')).toHaveValue(''))
  })
})

// KK-12: sayfa numaralı sayfalama, "Daha Fazla Göster" YOK, filtreler korunur.
describe('sayfalama (KK-12)', () => {
  it('sayfa numaralarını çizer, "Daha Fazla Göster" düğmesi bulundurmaz', async () => {
    renderPage(LIST_PATH, 90)
    await screen.findByRole('table')

    expect(screen.getByRole('navigation', { name: 'Sayfalama' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sayfa 3' })).toBeInTheDocument()
    expect(screen.queryByText(/Daha Fazla Göster/)).not.toBeInTheDocument()
  })

  it('sonuç bilgisini belgedeki biçimde yazar', async () => {
    renderPage(LIST_PATH, 90)
    await screen.findByRole('table')

    expect(screen.getByText(/90 kayıttan 1-30 arası gösteriliyor/)).toBeInTheDocument()
  })

  it('sayfa değişince uygulanan filtreler korunur', async () => {
    const user = userEvent.setup()
    renderPage(`${LIST_PATH}?q=tolga&type=firmEngineer`, 90)
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }))

    await waitFor(() =>
      expect(lastQuery()).toMatchObject({
        page: 2,
        nameQuery: 'tolga',
        authorityType: 'firmEngineer',
      }),
    )
  })
})
