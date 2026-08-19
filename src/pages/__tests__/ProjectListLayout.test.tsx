import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PROJECT_PAGE_SIZE, type ProjectListItem } from '../../api/projects'
import { AdminLayout } from '../../ui/admin/AdminLayout'
import { ProjectListPage } from '../ProjectListPage'

const api = vi.hoisted(() => ({
  listProjects: vi.fn(),
  getProjectStatusCounts: vi.fn(),
  getDistricts: vi.fn(),
  getProjectFirms: vi.fn(),
}))

vi.mock('../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projects')>()),
  ...api,
}))

function buildRows(count: number): ProjectListItem[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: index + 1,
    pId: String(24000 + index),
    name: `Proje ${index + 1}`,
    firmName: 'Anadolu Mühendislik',
    buildingCode: null,
    projectType: 'ILAVE',
    heatingType: 'bireysel' as const,
    hasDocuments: index % 2 === 0,
    updatedAt: '2026-08-01T09:30:00.000Z',
    createdAt: '2026-07-01T09:30:00.000Z',
    gasFirm: { id: 101, name: 'Başkent Doğalgaz' },
    status: 'taslak' as const,
  }))
}

/** Sayfa, gerçek kabuğun İÇİNDE kuruluyor: kaydırma iskeleti ikisinin
    birleşiminden doğuyor, sayfayı tek başına render etmek onu göstermez. */
function renderInShell(state?: { createdProjectName: string; createdProjectPId: string }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/projects', state }]}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/projects" element={<ProjectListPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function setRecordCount(totalCount: number, pageItemCount = totalCount) {
  api.listProjects.mockResolvedValue({
    items: buildRows(pageItemCount),
    page: 1,
    pageSize: PROJECT_PAGE_SIZE,
    totalCount,
  })
}

/** SVG'de `className` bir nesne; sınıfları her zaman öznitelikten okuyoruz. */
function classList(node: Element): string[] {
  return (node.getAttribute('class') ?? '').split(/\s+/).filter((token) => token !== '')
}

/** `useCreatedProjectNotice` içindeki vurgu süresinden uzun; testin sabiti
    üretim sabitine bağlanmıyor ki süre ayarlanınca test kırılmasın. */
const HIGHLIGHT_TIMEOUT_MS = 10_000

const VERTICAL_SCROLL_CLASSES = new Set([
  'overflow-auto',
  'overflow-scroll',
  'overflow-hidden',
  'overflow-y-auto',
  'overflow-y-scroll',
  'overflow-y-hidden',
])

function verticalScrollContainers(): string[] {
  const shell = screen.getByRole('main').parentElement?.parentElement
  if (shell === null || shell === undefined) throw new Error('Kabuk kökü bulunamadı')

  return [shell, ...shell.querySelectorAll('*')]
    .filter((node) => classList(node).some((token) => VERTICAL_SCROLL_CLASSES.has(token)))
    .map((node) => node.getAttribute('class') ?? '')
}

beforeEach(() => {
  api.getProjectStatusCounts.mockResolvedValue({
    taslak: 0,
    onayBekleyen: 0,
    onaylanan: 0,
    reddedilen: 0,
  })
  api.getDistricts.mockResolvedValue([])
  api.getProjectFirms.mockResolvedValue([])
})

describe('ProjectListPage — kabuk içinde kaydırma düzeni', () => {
  it.each([
    ['0 kayıt', 0],
    ['10 kayıt', 10],
    ['30 kayıt', PROJECT_PAGE_SIZE],
  ])('%s ile dikey kaydırma kabı oluşmaz', async (_label, count) => {
    setRecordCount(count)
    renderInShell()

    await waitFor(() => expect(api.listProjects).toHaveBeenCalled())
    await screen.findByRole('table')

    expect(verticalScrollContainers()).toEqual([])
  })

  it('0 kayıtta boş durum görünür, sayfalama çizilmez', async () => {
    setRecordCount(0)
    renderInShell()

    expect(await screen.findByText('Bu durumda kayıtlı proje yok.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /Sayfalama/i })).not.toBeInTheDocument()
  })

  it('10 kayıtta satırlar ve sayfalama bilgisi tutarlı', async () => {
    setRecordCount(10)
    renderInShell()

    await screen.findByRole('table')
    // Başlık satırı + 10 veri satırı.
    expect(screen.getAllByRole('row')).toHaveLength(11)
  })

  it('yeni oluşturulan kaydın satırı vurgulanır, süre dolunca söner', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setRecordCount(10)
    renderInShell({ createdProjectName: 'Proje 3', createdProjectPId: '24002' })

    // Şeritteki proje numarası ile vurgulanan satır aynı kayda işaret etmeli.
    expect(await screen.findByText(/Proje numarası: 24002/)).toBeInTheDocument()
    const row = (await screen.findByText('24002')).closest('tr')
    expect(classList(row as Element)).toContain('bg-success/10')

    // Diğer satırlar etkilenmez.
    const otherRow = screen.getByText('24000').closest('tr')
    expect(classList(otherRow as Element)).not.toContain('bg-success/10')

    await act(async () => {
      vi.advanceTimersByTime(HIGHLIGHT_TIMEOUT_MS)
    })

    expect(classList(row as Element)).not.toContain('bg-success/10')
    // Vurgu sönse de başarı şeridi durur; kullanıcı kendisi kapatır.
    expect(screen.getByText(/Proje numarası: 24002/)).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('30 kayıtta tablo yatay kaydırılabilir kalır', async () => {
    setRecordCount(PROJECT_PAGE_SIZE)
    renderInShell()

    const table = await screen.findByRole('table')
    expect(screen.getAllByRole('row')).toHaveLength(PROJECT_PAGE_SIZE + 1)

    // Kabul kriteri 4: dar ekranda tablo yatay kayar. Bu sarmalayıcı kaldırılırsa
    // sütunlar sıkışır — dikey kaydırma temizliği bunu bozmamalı.
    const scroller = table.parentElement
    expect(classList(scroller as Element)).toContain('overflow-x-auto')
  })
})
