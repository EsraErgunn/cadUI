import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  FIRM_SAVED_MESSAGE,
  buildFailedAuthorizationsMessage,
} from '../../ui/admin/useSavedFirmNotice'
import { ProjectFirmsPage } from '../ProjectFirmsPage'

const listApi = vi.hoisted(() => ({ getProjectFirmList: vi.fn() }))
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirms')>()),
  ...listApi,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

const LIST_PATH = '/admin/project-firms'

interface SavedState {
  savedFirmId: number
  failedAuthorizationFirms?: string[]
}

/** Kısmi başarı senaryosu: iki bağdan biri kurulamadı. */
const FAILED_FIRMS = ['Başkentgaz', 'Doğugaz']
const FAILED_MESSAGE = buildFailedAuthorizationsMessage(FAILED_FIRMS)

function renderList(state?: SavedState) {
  listApi.getProjectFirmList.mockResolvedValue([])
  useIsAdmin.mockReturnValue(true)

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: LIST_PATH, state }]}>
        <ProjectFirmsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('kayıt sonrası bildirim (KK-8)', () => {
  it('her şey kaydedildiyse başarı mesajı çıkar', async () => {
    renderList({ savedFirmId: 900 })

    expect(await screen.findByText(FIRM_SAVED_MESSAGE)).toBeInTheDocument()
  })

  /**
   * Kısmi başarı: firma sunucuya gitti, bazı yetkilendirmeler gitmedi ve geri
   * ALINMADI. Başarı mesajı YERİNE uyarı gösterilir — iki şerit üst üste
   * binseydi kullanıcı olumlu olanı okuyup uyarıyı atlardı.
   */
  it('kurulamayan yetkilendirmeleri ADIYLA sayar', async () => {
    renderList({ savedFirmId: 900, failedAuthorizationFirms: FAILED_FIRMS })

    expect(await screen.findByText(FAILED_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText(FIRM_SAVED_MESSAGE)).not.toBeInTheDocument()
  })

  // Hata DEĞİL: kayıt gerçekleşti, yarısı beklemede. `alert` kullanıcının
  // işini böler, `status` bölmeden duyurur.
  it('uyarı role="status" ile duyurulur, alert değil', async () => {
    renderList({ savedFirmId: 900, failedAuthorizationFirms: FAILED_FIRMS })

    expect(await screen.findByRole('status')).toHaveTextContent(
      FAILED_MESSAGE)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('uyarı kapatılabilir', async () => {
    renderList({ savedFirmId: 900, failedAuthorizationFirms: FAILED_FIRMS })
    await screen.findByText(FAILED_MESSAGE)

    await userEvent.click(screen.getByRole('button', { name: 'Bildirimi kapat' }))

    expect(screen.queryByText(FAILED_MESSAGE)).not.toBeInTheDocument()
  })

  it('doğrudan gelindiğinde bildirim çıkmaz', async () => {
    renderList()
    await screen.findByRole('heading', { name: /Proje Firmaları/ })

    expect(screen.queryByText(FIRM_SAVED_MESSAGE)).not.toBeInTheDocument()
    expect(screen.queryByText(FAILED_MESSAGE)).not.toBeInTheDocument()
  })
})
