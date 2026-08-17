import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../api/http'
import { GasDistributionFirmsPage } from '../GasDistributionFirmsPage'

const listApi = vi.hoisted(() => ({
  getGasDistributionFirms: vi.fn(),
  getFirmGroups: vi.fn(),
}))
const formApi = vi.hoisted(() => ({ deactivateGasDistributionFirm: vi.fn() }))
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/adminFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminFirms')>()),
  ...listApi,
}))

vi.mock('../../api/adminFirmForm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminFirmForm')>()),
  ...formApi,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

const FIRM = { id: 7, dfirmNo: 1204, groupId: null, groupName: null, name: 'ADANA DOĞALGAZ' }

const DELETE_BUTTON = `${FIRM.name} firmasını sil`

function renderList({ isAdmin = true } = {}) {
  useIsAdmin.mockReturnValue(isAdmin)
  listApi.getGasDistributionFirms.mockResolvedValue({
    items: [FIRM],
    totalCount: 1,
    page: 1,
    pageSize: 30,
  })
  listApi.getFirmGroups.mockResolvedValue([])

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/gas-distribution-firms']}>
        <GasDistributionFirmsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Onay diyaloğunu açıp "Sil" düğmesine basar. */
async function confirmDelete(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: DELETE_BUTTON }))
  const dialog = screen.getByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: 'Sil' }))
}

afterEach(() => {
  vi.clearAllMocks()
})

/**
 * Sunucudaki DELETE soft-delete; arayüzün dili yine de "Sil" (ekip kararı).
 * Kaydın korunduğu bilgisi onay diyaloğunun açıklamasında duruyor.
 */
describe('firma silme', () => {
  it('onaydan ÖNCE istek atılmaz', async () => {
    const user = userEvent.setup()
    renderList()

    await user.click(await screen.findByRole('button', { name: DELETE_BUTTON }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(formApi.deactivateGasDistributionFirm).not.toHaveBeenCalled()
  })

  it('onaylanınca DELETE ucuna gider ve listeyi tazeler', async () => {
    const user = userEvent.setup()
    formApi.deactivateGasDistributionFirm.mockResolvedValue(undefined)
    renderList()

    await confirmDelete(user)

    await waitFor(() => {
      expect(formApi.deactivateGasDistributionFirm).toHaveBeenCalledWith(FIRM.id)
    })
    // Liste açılışta bir kez, silmeden sonra geçersizleştirmeyle bir kez daha.
    await waitFor(() => {
      expect(listApi.getGasDistributionFirms.mock.calls.length).toBeGreaterThan(1)
    })
    expect(await screen.findByRole('status')).toHaveTextContent('firması silindi')
  })

  it('vazgeçilirse istek atılmaz', async () => {
    const user = userEvent.setup()
    renderList()

    await user.click(await screen.findByRole('button', { name: DELETE_BUTTON }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Vazgeç' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(formApi.deactivateGasDistributionFirm).not.toHaveBeenCalled()
  })

  it('404 listeyi yenilemeyi öneren mesaj gösterir', async () => {
    const user = userEvent.setup()
    formApi.deactivateGasDistributionFirm.mockRejectedValue(new ApiError(404, 'Not Found'))
    renderList()

    await confirmDelete(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Firma bulunamadı')
  })

  it('diğer hatalarda tekrar denemeyi öneren mesaj gösterir', async () => {
    const user = userEvent.setup()
    formApi.deactivateGasDistributionFirm.mockRejectedValue(new ApiError(500, 'hata'))
    renderList()

    await confirmDelete(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Firma silinemedi')
  })
})

/**
 * Yetki denetimi SUNUCUDA; istemci yalnız görünürlüğe karar veriyor. Pasif düğme
 * göstermek, tıklayınca 403 alacak bir yol açık bırakmak olurdu.
 */
describe('yetki görünürlüğü', () => {
  it('yönetici olmayan kullanıcıda silme düğmesi hiç çizilmez', async () => {
    renderList({ isAdmin: false })

    expect(await screen.findByText(FIRM.name)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: DELETE_BUTTON })).not.toBeInTheDocument()
    expect(screen.queryByText('İşlemler')).not.toBeInTheDocument()
  })
})
