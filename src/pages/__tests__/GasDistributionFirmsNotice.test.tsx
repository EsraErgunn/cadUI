import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FIRM_SAVED_MESSAGE } from '../../ui/admin/firms/useSavedFirmNotice'
import { GasDistributionFirmsPage } from '../GasDistributionFirmsPage'

const listApi = vi.hoisted(() => ({
  getGasDistributionFirms: vi.fn(),
  getFirmGroups: vi.fn(),
  getRegions: vi.fn(),
}))

vi.mock('../../api/adminFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminFirms')>()),
  ...listApi,
}))

vi.mock('../../api/permissions', () => ({ getMyPermissions: vi.fn().mockResolvedValue([]) }))

const LIST_PATH = '/admin/gas-distribution-firms'

function renderList(state?: { savedFirmId: number }) {
  listApi.getGasDistributionFirms.mockResolvedValue({
    items: [{ id: 1, dfirmNo: 1204, groupName: null, name: 'ADANA DOĞALGAZ', region: 'Akdeniz' }],
    totalCount: 1,
    page: 1,
    pageSize: 30,
  })
  listApi.getFirmGroups.mockResolvedValue([])
  listApi.getRegions.mockResolvedValue([])

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: LIST_PATH, state }]}>
        <GasDistributionFirmsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('kayıt sonrası başarı bildirimi', () => {
  // KK-10: liste ekranına dönülür ve "Firma başarıyla kaydedildi." görünür.
  it('kayıt sonrası belgedeki mesajı gösterir', async () => {
    renderList({ savedFirmId: 500 })

    expect(await screen.findByText(FIRM_SAVED_MESSAGE)).toBeInTheDocument()
  })

  // Şerit kullanıcının işini bölmeden duyurulmalı: hata değil, durum bildirimi.
  it('bildirim role="status" ile duyurulur', async () => {
    renderList({ savedFirmId: 500 })

    expect(await screen.findByRole('status')).toHaveTextContent(FIRM_SAVED_MESSAGE)
  })

  it('kapatılabilir', async () => {
    renderList({ savedFirmId: 500 })
    await screen.findByText(FIRM_SAVED_MESSAGE)

    await userEvent.click(screen.getByRole('button', { name: 'Bildirimi kapat' }))

    expect(screen.queryByText(FIRM_SAVED_MESSAGE)).not.toBeInTheDocument()
  })

  it('doğrudan gelindiğinde bildirim çıkmaz', async () => {
    renderList()
    await screen.findByRole('heading', { name: /Gaz Dağıtım Firmaları/ })

    expect(screen.queryByText(FIRM_SAVED_MESSAGE)).not.toBeInTheDocument()
  })
})
