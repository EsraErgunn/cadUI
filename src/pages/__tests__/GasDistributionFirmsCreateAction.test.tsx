import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GasDistributionFirmsPage } from '../GasDistributionFirmsPage'

const listApi = vi.hoisted(() => ({
  getGasDistributionFirms: vi.fn(),
  getFirmGroups: vi.fn(),
}))
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/adminFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminFirms')>()),
  ...listApi,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

const LIST_PATH = '/admin/gas-distribution-firms'
const CREATE_ACTION_NAME = 'Yeni firma ekle'

function renderList({ isAdmin }: { isAdmin: boolean }) {
  listApi.getGasDistributionFirms.mockResolvedValue({
    items: [{ id: 1, dfirmNo: 1204, groupName: null, name: 'ADANA DOĞALGAZ' }],
    totalCount: 1,
    page: 1,
    pageSize: 30,
  })
  listApi.getFirmGroups.mockResolvedValue([])
  useIsAdmin.mockReturnValue(isAdmin)

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[LIST_PATH]}>
        <GasDistributionFirmsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

/**
 * Düğmenin görünürlüğü ROL'e bağlı. Önceki hâli mock izin listesine bakıyordu:
 * üretimde liste boş döndüğü için düğme Admin'e DE görünmüyordu, geliştirmede ise
 * üç iznin tamamı döndüğü için HERKESE görünüyordu — yani rol hiç okunmuyordu.
 *
 * Testler `DEV=true` ile koştuğu için eski kodda kırmızı olan vaka İKİNCİSİDİR
 * (rolü olmayan kullanıcıya düğme yine çizilirdi). Üretimdeki asıl kusur burada
 * doğrudan yakalanamaz: `isMockDataAllowed()` derleme kipine bağlıydı.
 */
describe('gaz dağıtım firmaları — "Yeni Firma Ekle" görünürlüğü', () => {
  it('Admin için görünür', async () => {
    renderList({ isAdmin: true })

    expect(await screen.findByRole('link', { name: CREATE_ACTION_NAME })).toBeInTheDocument()
  })

  it('Admin olmayan kullanıcıda çizilmez', async () => {
    renderList({ isAdmin: false })

    // Listenin yüklendiğinden emin ol; yoksa "yok" iddiası boş ekranı doğrulardı.
    expect(await screen.findByText('ADANA DOĞALGAZ')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: CREATE_ACTION_NAME })).not.toBeInTheDocument()
  })
})
