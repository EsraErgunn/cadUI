import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POLICY_PAGE_SIZE, type PolicyRow } from '../../api/policies'
import { resetMockPolicies } from '../../api/policiesMock'
import { PolicyListPage } from '../PolicyListPage'

const listPolicies = vi.hoisted(() => vi.fn())

vi.mock('../../api/policies', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/policies')>()),
  listPolicies,
}))

function buildPolicy(overrides: Partial<PolicyRow> = {}): PolicyRow {
  return {
    id: 1,
    policyNumber: 'ORNEK-POL-0001',
    insuranceCompanyId: 1,
    insuranceCompanyName: 'Anadolu Sigorta',
    agencyName: 'Anadolu Sigorta — Örnek Acente 1',
    method: 'manual',
    amount: 480000,
    startDate: '2026-05-10',
    endDate: '2027-05-10',
    projectId: 4,
    projectName: 'Çınar Sitesi',
    projectPId: '200011555',
    ...overrides,
  }
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="search">{location.search}</output>
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/policies']}>
        <Routes>
          <Route
            path="/admin/policies"
            element={
              <>
                <PolicyListPage />
                <LocationProbe />
              </>
            }
          />
          <Route path="/projects/:projectId" element={<h1>Proje Detay</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Liste `Sourced` zarfıyla dönüyor: sahte veri yalnız geliştirmede üretilir
    (K51). Testler geliştirme derlemesinde koştuğu için `mock` kolu. */
function asMock(items: PolicyRow[]) {
  return {
    source: 'mock' as const,
    data: { items, totalCount: items.length, page: 1, pageSize: POLICY_PAGE_SIZE },
  }
}

beforeEach(() => {
  resetMockPolicies()
  listPolicies.mockResolvedValue(asMock([buildPolicy()]))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PolicyListPage', () => {
  it('başlıkta adet, altında açıklama gösterir', async () => {
    renderPage()

    // Adet veri gelmeden "…" gösteriliyor; bekleyen hâl geçtikten sonra bakılır.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Poliçeler/ })).toHaveTextContent('(1)'),
    )
    expect(screen.getByText('Tüm projelere ait poliçeler')).toBeInTheDocument()
  })

  it('satırı sütun sırasıyla çizer; proje adı detaya bağlantılı', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.trim())

    expect(headers).toEqual([
      'No',
      'Poliçe No',
      'Sigorta Şirketi',
      'Acente',
      'Proje Adı',
      'ProjeId',
      'Teminat Tutarı',
      'Başlangıç',
      'Bitiş',
      'Yöntem',
    ])

    expect(within(table).getByText('ORNEK-POL-0001')).toBeInTheDocument()
    expect(within(table).getByText('10.05.2026')).toBeInTheDocument()
    expect(within(table).getByText('Manuel Poliçe')).toBeInTheDocument()

    const projectLink = within(table).getByRole('link', { name: 'Çınar Sitesi' })
    expect(projectLink).toHaveAttribute('href', '/projects/4')
  })

  /** Sihirbazdan gelen kayıtta künye çözülemeyebiliyor; uydurma ad yazmak
      yerine boş değer işareti kalır (K63). */
  it('proje adı yoksa bağlantı değil boş değer gösterir', async () => {
    listPolicies.mockResolvedValue(
      asMock([buildPolicy({ projectName: null, projectPId: null })]),
    )
    renderPage()

    const table = await screen.findByRole('table')
    expect(within(table).queryByRole('link')).not.toBeInTheDocument()
  })

  it("filtre uygulanınca kriterler URL'e yazılır ve sayfa 1'e döner", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    // Şirket listesi ayrı bir istekten geliyor; seçenek beklenmezse kutu henüz
    // "Tümü"den ibaret olur.
    await user.selectOptions(
      screen.getByLabelText('Sigorta Şirketi'),
      await screen.findByRole('option', { name: 'Anadolu Sigorta' }),
    )
    await user.type(screen.getByLabelText(/Poliçe numarası veya proje adında ara/), 'ORNEK')
    await user.click(screen.getByRole('button', { name: /Filtrele/ }))

    await waitFor(() => {
      const search = screen.getByTestId('search').textContent ?? ''
      expect(search).toContain('company=1')
      expect(search).toContain('q=ORNEK')
      expect(search).not.toContain('page=')
    })
  })

  it('poliçe yoksa nereden oluşturulacağını söyler', async () => {
    listPolicies.mockResolvedValue(asMock([]))
    renderPage()

    expect(await screen.findByText(/Poliçelendir/)).toBeInTheDocument()
  })

  it('kaynak yoksa tablo yerine "sunucuya bağlı değil" kutusu çıkar', async () => {
    listPolicies.mockResolvedValue({ source: 'unavailable', data: null })
    renderPage()

    expect(await screen.findByText(/GET \/api\/policies/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
