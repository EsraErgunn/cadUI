import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../api/http'
import type { ProjectFirm } from '../../api/projectFirms'
import { ProjectFirmsPage } from '../ProjectFirmsPage'

const listApi = vi.hoisted(() => ({ getProjectFirmList: vi.fn() }))
const formApi = vi.hoisted(() => ({ deleteProjectFirm: vi.fn() }))
const authorizationApi = vi.hoisted(() => ({ getEffectiveAuthorizations: vi.fn() }))
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirms')>()),
  ...listApi,
}))

vi.mock('../../api/projectFirmForm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmForm')>()),
  ...formApi,
}))

vi.mock('../../api/projectFirmAuthorizations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmAuthorizations')>()),
  ...authorizationApi,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

const FIRM: ProjectFirm = {
  id: 7,
  serialNumber: null,
  qualificationNumber: null,
  name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
  authorizedPerson: 'Ahmet Yılmaz',
  email: 'bilgi@adana.com.tr',
  phone: '05321000000',
  mobilePhone: null,
  taxNumber: '1234567890',
}

const DELETE_BUTTON = `${FIRM.name} firmasını sil`

function renderList({ isAdmin = true } = {}) {
  useIsAdmin.mockReturnValue(isAdmin)
  listApi.getProjectFirmList.mockResolvedValue([FIRM])
  // Sayfanın İKİNCİ sorgusu (K88, "G.D. Firması" sütununun bağı). Mock'lanmazsa
  // istek jsdom'da düşüyor ve sayfa bir uyarı şeridi daha çiziyor — o şerit de
  // `role="status"` taşıdığı için başarı bildirimini arayan sorgu iki eleman
  // bulup patlıyordu. Bu testin konusu silme; bağ boş dönmesi yeterli.
  authorizationApi.getEffectiveAuthorizations.mockResolvedValue([])

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/project-firms']}>
        <ProjectFirmsPage />
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

/** Gaz dağıtım firması silme testinin eşi; iki liste aynı akışı paylaşıyor. */
describe('proje firması silme', () => {
  it('onaydan ÖNCE istek atılmaz', async () => {
    const user = userEvent.setup()
    renderList()

    await user.click(await screen.findByRole('button', { name: DELETE_BUTTON }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(formApi.deleteProjectFirm).not.toHaveBeenCalled()
  })

  it('onaylanınca DELETE ucuna gider ve listeyi tazeler', async () => {
    const user = userEvent.setup()
    formApi.deleteProjectFirm.mockResolvedValue(undefined)
    renderList()

    await confirmDelete(user)

    await waitFor(() => {
      expect(formApi.deleteProjectFirm).toHaveBeenCalledWith(FIRM.id)
    })
    // Liste açılışta bir kez, silmeden sonra geçersizleştirmeyle bir kez daha.
    await waitFor(() => {
      expect(listApi.getProjectFirmList.mock.calls.length).toBeGreaterThan(1)
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
    expect(formApi.deleteProjectFirm).not.toHaveBeenCalled()
  })

  it('404 listeyi yenilemeyi öneren mesaj gösterir', async () => {
    const user = userEvent.setup()
    formApi.deleteProjectFirm.mockRejectedValue(new ApiError(404, 'Not Found'))
    renderList()

    await confirmDelete(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Firma bulunamadı')
  })

  it('diğer hatalarda tekrar denemeyi öneren mesaj gösterir', async () => {
    const user = userEvent.setup()
    formApi.deleteProjectFirm.mockRejectedValue(new ApiError(500, 'hata'))
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
  })
})
