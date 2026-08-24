import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ANNOUNCEMENTS_PATH } from '../../ui/admin/adminNavItems'
import { AnnouncementsPage } from '../AnnouncementsPage'

const dashboardApi = vi.hoisted(() => ({
  getAnnouncements: vi.fn(),
  publishAnnouncement: vi.fn(),
}))

vi.mock('../../api/adminDashboard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminDashboard')>()),
  ...dashboardApi,
}))

const ITEMS = [
  {
    id: 2,
    title: 'Planlı Bakım Bildirimi',
    body: '19 Temmuz Pazar 02:00–06:00 arasında sistem bakımda olacaktır.',
    publishedAt: '2026-07-11T06:00:00.000Z',
    source: 'Sistem',
    scopeName: null,
  },
  {
    id: 1,
    title: 'ZetaCAD 3.0 Versiyon 3469 Yayında',
    body: 'Yeni versiyon yayında. Lidar ile mimari tarama bu sürümle geldi.',
    publishedAt: '2026-06-19T09:00:00.000Z',
    source: 'Teknhelogos',
    scopeName: 'AKSA',
  },
]

const PUBLISHED = {
  id: 9,
  title: 'Yeni Duyuru',
  summary: 'Duyuru gövdesi.',
  publishedAt: '2026-08-09T09:00:00.000Z',
  source: 'Yönetim',
}

function renderPage({ route = ANNOUNCEMENTS_PATH, items = ITEMS, totalCount = 2 } = {}) {
  dashboardApi.getAnnouncements.mockResolvedValue({
    items,
    totalCount,
    page: 1,
    pageSize: 10,
  })
  dashboardApi.publishAnnouncement.mockResolvedValue(PUBLISHED)

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={ANNOUNCEMENTS_PATH} element={<AnnouncementsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Konum izi de bir liste; duyuru satırları adlandırılmış listeden okunuyor. */
async function findAnnouncementItems(): Promise<HTMLElement[]> {
  const list = await screen.findByRole('list', { name: 'Yayınlanan duyurular' })
  return within(list).getAllByRole('listitem')
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('duyuru listesi', () => {
  it('başlık, adet ve kapsam açıklaması görünür', async () => {
    renderPage()

    const heading = await screen.findByRole('heading', { level: 1 })

    // Adet veri gelince başlığa düşer; yükleme sırasında "…" yazıyor.
    await waitFor(() => expect(heading).toHaveTextContent('Duyurular (2)'))
  })

  it('duyurular TAM metniyle listelenir — kartın kısaltması burada uygulanmaz', async () => {
    renderPage()

    expect(await screen.findByText(ITEMS[0].body)).toBeInTheDocument()
    expect(screen.getByText(ITEMS[1].body)).toBeInTheDocument()
  })

  it('her duyuru kaynağını ve kapsamını yazar', async () => {
    renderPage()
    const items = await findAnnouncementItems()

    expect(items[0]).toHaveTextContent('Sistem')
    expect(items[0]).toHaveTextContent('Tüm kapsamlar')
    expect(items[1]).toHaveTextContent('Teknhelogos')
    expect(items[1]).toHaveTextContent('AKSA')
  })

  it('sistem duyurusu amber kenarlıkla ayrışır', async () => {
    renderPage()
    const items = await findAnnouncementItems()

    expect(items[0].className).toContain('border-l-warning')
    expect(items[1].className).not.toContain('border-l-warning')
  })

  it('tarih saatiyle birlikte gösterilir — aynı gün birden çok duyuru olabilir', async () => {
    renderPage()

    expect(await screen.findByText(/11\.07\.2026/)).toBeInTheDocument()
  })

  // Coğrafi bölge kavramı kalktı: adres çubuğuna elle `?region=` yazılsa bile
  // uca bölge gitmez, kapsam yalnız grup/firma olabilir.
  it('uca bölge kapsamı taşımaz', async () => {
    renderPage({ route: `${ANNOUNCEMENTS_PATH}?region=Ege` })

    await screen.findByRole('heading', { name: /Duyurular/ })
    expect(dashboardApi.getAnnouncements).toHaveBeenCalledWith(
      expect.objectContaining({ scope: { type: 'global' } }),
      expect.anything(),
    )
    expect(dashboardApi.getAnnouncements).toHaveBeenCalledWith(
      expect.not.objectContaining({ region: expect.anything() }),
      expect.anything(),
    )
  })

  it('hiç duyuru yokken boş durum mesajı çıkar', async () => {
    renderPage({ items: [], totalCount: 0 })

    expect(await screen.findByText(/Henüz yayınlanmış duyuru yok/)).toBeInTheDocument()
  })
})

describe('duyuru araması', () => {
  it('arama metni uca gider ve çip olarak görünür', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText(/ara/i), 'bakım')
    await user.click(screen.getByRole('button', { name: 'Ara' }))

    expect(dashboardApi.getAnnouncements).toHaveBeenLastCalledWith(
      expect.objectContaining({ textQuery: 'bakım' }),
      expect.anything(),
    )
    const chips = await screen.findByRole('list', { name: 'Uygulanan filtreler' })
    expect(within(chips).getByText('bakım')).toBeInTheDocument()
  })

  it('arama sonuç vermezse ayrı bir boş durum mesajı çıkar', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText(/ara/i), 'bulunmayan')
    dashboardApi.getAnnouncements.mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
    })
    await user.click(screen.getByRole('button', { name: 'Ara' }))

    expect(await screen.findByText(/Aramaya uyan duyuru bulunamadı/)).toBeInTheDocument()
  })
})

describe('listeden duyuru yayınlama', () => {
  it('aynı form açılır ve yayınlanan duyuru bildirilir', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Duyuru Yayınla' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Başlık'), 'Yeni Duyuru')
    await user.type(within(dialog).getByLabelText('Duyuru Metni'), 'Duyuru gövdesi.')
    await user.click(within(dialog).getByRole('button', { name: 'Yayınla' }))

    expect(dashboardApi.publishAnnouncement).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('duyurusu yayınlandı')
  })

  it('yayınlandıktan sonra liste yeniden istenir', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: /Duyurular/ })
    const callsBefore = dashboardApi.getAnnouncements.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'Duyuru Yayınla' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Başlık'), 'Yeni Duyuru')
    await user.type(within(dialog).getByLabelText('Duyuru Metni'), 'Duyuru gövdesi.')
    await user.click(within(dialog).getByRole('button', { name: 'Yayınla' }))

    await screen.findByRole('status')
    expect(dashboardApi.getAnnouncements.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})
