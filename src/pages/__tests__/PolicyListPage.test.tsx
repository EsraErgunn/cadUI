import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setAuthSession, type AuthSession } from '../../api/authToken'
import { POLICY_PAGE_SIZE, type PolicyRow } from '../../api/policies'
import { resetMockPolicies } from '../../api/policiesMock'
import { ROLE_CODES } from '../../api/roles'
import { PolicyListPage } from '../PolicyListPage'

/**
 * Poliçe SİLME sunucuda `Admin, ProjectFirmUser`'a açık; sütun rol bayrağına
 * bağlı olduğu için testler oturumsuz render edilemiyor.
 */
const ADMIN_SESSION: AuthSession = {
  token: 'jwt-token',
  expiresAt: '2099-01-01T00:00:00.000Z',
  fullName: 'Yönetici',
  roleCode: ROLE_CODES.admin,
}

const listPolicies = vi.hoisted(() => vi.fn())
const deletePolicy = vi.hoisted(() => vi.fn())

/** `GET /api/insurance-companies` yanıtı; süzgeçteki şirket kutusunun kaynağı. */
const insuranceCompanies = vi.hoisted(() => [
  { source: 'server' as const, data: [{ id: 1, name: 'Anadolu Sigorta' }] },
])

vi.mock('../../api/policies', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/policies')>()),
  listPolicies,
  deletePolicy,
  listInsuranceCompanies: () => Promise.resolve(insuranceCompanies[0]),
}))

function buildPolicy(overrides: Partial<PolicyRow> = {}): PolicyRow {
  return {
    id: 1,
    policyNumber: 'ORNEK-POL-0001',
    insuranceCompanyId: 1,
    insuranceCompanyName: 'Anadolu Sigorta',
    amount: 480000,
    startDate: '2026-05-10',
    endDate: '2027-05-10',
    projectId: 4,
    projectName: 'Çınar Sitesi',
    ...overrides,
  }
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="search">{location.search}</output>
}

function renderPage(roleCode: string = ROLE_CODES.admin) {
  setAuthSession({ ...ADMIN_SESSION, roleCode })
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

/** Liste artık GERÇEK uçtan geliyor; `Sourced` zarfı KALKTI, dönen değer düz
    sayfalı sonuç. */
function asPage(items: PolicyRow[]) {
  return { items, totalCount: items.length, page: 1, pageSize: POLICY_PAGE_SIZE }
}

beforeEach(() => {
  resetMockPolicies()
  listPolicies.mockResolvedValue(asPage([buildPolicy()]))
  deletePolicy.mockResolvedValue({ ok: true })
})

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
  vi.clearAllMocks()
})

describe('PolicyListPage', () => {
  it('başlıkta adet, altında açıklama gösterir', async () => {
    renderPage()

    // Adet veri gelmeden "…" gösteriliyor; bekleyen hâl geçtikten sonra bakılır.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Poliçeler/ })).toHaveTextContent('(1)'),
    )
  })

  /** Silme ONAYDAN sonra: düğmeye basmak tek başına satırı düşürmemeli. */
  it('"Sil" önce onay sorar, onaylanınca satırı düşürür', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Sil' }))
    expect(deletePolicy).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Sil' }))

    await waitFor(() => expect(deletePolicy).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Poliçe silindi.')).toBeInTheDocument()
  })

  it('vazgeçilince silme isteği atılmaz', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Sil' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Vazgeç' }),
    )

    expect(deletePolicy).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('satırı sütun sırasıyla çizer; proje adı detaya bağlantılı', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.trim())

    // "Acente", "ProjeId" ve "Yöntem" YOK: üçünün de sunucuda karşılığı
    // bulunmuyor, boş ya da uydurma sütun bırakılmadı.
    expect(headers).toEqual([
      'No',
      'Poliçe No',
      'Sigorta Şirketi / Poliçe Firması',
      'Proje Adı',
      'Teminat Tutarı',
      'Başlangıç',
      'Bitiş',
      'Aksiyonlar',
    ])

    expect(within(table).getByText('ORNEK-POL-0001')).toBeInTheDocument()
    expect(within(table).getByText('10.05.2026')).toBeInTheDocument()

    const projectLink = within(table).getByRole('link', { name: 'Çınar Sitesi' })
    expect(projectLink).toHaveAttribute('href', '/projects/4')
  })

  /** Sihirbazdan gelen kayıtta künye çözülemeyebiliyor; uydurma ad yazmak
      yerine boş değer işareti kalır (K63). */
  it('proje adı yoksa bağlantı değil boş değer gösterir', async () => {
    listPolicies.mockResolvedValue(asPage([buildPolicy({ projectName: null })]))
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
      screen.getByLabelText('Sigorta Şirketi / Poliçe Firması'),
      await screen.findByRole('option', { name: 'Anadolu Sigorta' }),
    )
    // Seçim ANINDA uygulanıyor ("Filtrele" kalktı); arama Enter'da.
    await user.type(screen.getByLabelText(/Poliçe no, birim no/), 'ORNEK{Enter}')

    await waitFor(() => {
      const search = screen.getByTestId('search').textContent ?? ''
      expect(search).toContain('company=1')
      expect(search).toContain('q=ORNEK')
      expect(search).not.toContain('page=')
    })
  })

  it('poliçe yoksa nereden oluşturulacağını söyler', async () => {
    listPolicies.mockResolvedValue(asPage([]))
    renderPage()

    expect(await screen.findByText(/Poliçelendir/)).toBeInTheDocument()
  })

  /**
   * Sıralanabilir başlık YOK: uç `SortBy`/`SortDir` almıyor ve sıra sunucuda
   * sabit. Çalışmayan bir sütun başlığı, olmayandan yanıltıcıdır.
   */
  it('hiçbir sütun başlığı sıralama düğmesi değildir', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    expect(within(table).queryAllByRole('button', { name: /sırala/i })).toHaveLength(0)
    for (const header of within(table).getAllByRole('columnheader')) {
      expect(header).not.toHaveAttribute('aria-sort')
    }
  })

  /** Ekran proje BAĞIMSIZ: uca `ProjectId` gitmemeli, yoksa liste tek projeye
      daralırdı. Süzgeçler ise sorguya girmeli. */
  it('sorguyu proje kimliği OLMADAN kurar', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(listPolicies).toHaveBeenCalled()
    const [query] = listPolicies.mock.calls[0]
    expect(query.projectId).toBeNull()
    expect(query).not.toHaveProperty('sortBy')
    expect(query).not.toHaveProperty('sortDir')
  })
})

/**
 * Gaz dağıtım kullanıcısı poliçeleri GÖRÜR, yazamaz. Sunucu da böyle diyor:
 * `POST/PUT/DELETE /api/policies` uçları `Authorize(Roles = Admin,
 * ProjectFirmUser)`; `GET` uçları rol kısıtı taşımıyor ve kapsamı
 * `WhereVisibleTo` veriyor.
 */
describe('PolicyListPage (gaz dağıtım kullanıcısı)', () => {
  it('poliçeleri görüntüleyebilir', async () => {
    renderPage(ROLE_CODES.gasDistributionUser)

    expect(await screen.findByRole('table')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Poliçeler/ })).toHaveTextContent('(1)'),
    )
  })

  it('Sil aksiyonunu göstermez', async () => {
    renderPage(ROLE_CODES.gasDistributionUser)
    await screen.findByRole('table')

    expect(screen.queryByRole('button', { name: 'Sil' })).not.toBeInTheDocument()
    // Sütun HİÇ üretilmiyor: boş "Aksiyonlar" başlığı eylem varmış gibi görünürdü.
    expect(screen.queryByRole('columnheader', { name: 'Aksiyonlar' })).not.toBeInTheDocument()
  })

  it('yönetici aynı ekranda Sil aksiyonunu görmeye devam eder', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(screen.getByRole('button', { name: 'Sil' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Aksiyonlar' })).toBeInTheDocument()
  })
})
