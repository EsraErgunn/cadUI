import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AUTHORIZATIONS_PENDING_MESSAGE,
  FIRM_SAVED_MESSAGE,
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
  hasPendingAuthorizations?: boolean
}

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
   * Yetkilendirme yazan uç yok: firma sunucuya gitti, yetkiler gitmedi.
   * Başarı mesajı YERİNE uyarı gösterilir — iki şerit üst üste binseydi
   * kullanıcı olumlu olanı okuyup uyarıyı atlardı.
   */
  it('yetkilendirmeler kaydedilmediyse uyarı mesajı çıkar', async () => {
    renderList({ savedFirmId: 900, hasPendingAuthorizations: true })

    expect(await screen.findByText(AUTHORIZATIONS_PENDING_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText(FIRM_SAVED_MESSAGE)).not.toBeInTheDocument()
  })

  // Hata DEĞİL: kayıt gerçekleşti, yarısı beklemede. `alert` kullanıcının
  // işini böler, `status` bölmeden duyurur.
  it('uyarı role="status" ile duyurulur, alert değil', async () => {
    renderList({ savedFirmId: 900, hasPendingAuthorizations: true })

    expect(await screen.findByRole('status')).toHaveTextContent(
      AUTHORIZATIONS_PENDING_MESSAGE,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('uyarı kapatılabilir', async () => {
    renderList({ savedFirmId: 900, hasPendingAuthorizations: true })
    await screen.findByText(AUTHORIZATIONS_PENDING_MESSAGE)

    await userEvent.click(screen.getByRole('button', { name: 'Bildirimi kapat' }))

    expect(screen.queryByText(AUTHORIZATIONS_PENDING_MESSAGE)).not.toBeInTheDocument()
  })

  it('doğrudan gelindiğinde bildirim çıkmaz', async () => {
    renderList()
    await screen.findByRole('heading', { name: /Proje Firmaları/ })

    expect(screen.queryByText(FIRM_SAVED_MESSAGE)).not.toBeInTheDocument()
    expect(screen.queryByText(AUTHORIZATIONS_PENDING_MESSAGE)).not.toBeInTheDocument()
  })
})
