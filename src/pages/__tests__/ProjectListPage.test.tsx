import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setAuthSession, type AuthSession } from '../../api/authToken'
import { ROLE_CODES } from '../../api/roles'
import { ProjectListPage } from '../ProjectListPage'

/** Varsayılan tarih aralığı son bir ay; kayıtlar bugünden olmalı ki süzülmesin. */
const TODAY = `${new Date().toISOString().slice(0, 10)}T09:00:00`

/**
 * Liste, sekme rozetleri ve il/ilçe süzgeçleri gerçek uçlara gidiyor
 * (Swagger 2026-08-14). Liste artık SAYFALI ZARF döndürüyor; süzme, sıralama
 * ve sayfalama sunucuda. "Onaya Gönder" hâlâ mock uçtan geliyor, stub'lanmıyor.
 */
const API_PROJECTS = [
  { id: 3, name: 'Gülbahar Apartmanı', code: null, createdAt: TODAY, updatedAt: TODAY },
  { id: 2, name: 'Çınar Sitesi', code: 'PRJ-002', createdAt: TODAY, updatedAt: TODAY },
  { id: 1, name: 'Demo Doğalgaz Projesi', code: null, createdAt: TODAY, updatedAt: TODAY },
]

const API_STATUS_COUNTS = { draft: 3, pendingApproval: 0, approved: 0, rejected: 0 }
const API_CITIES = [{ id: 6, name: 'Ankara', plateCode: '06' }]
const API_DISTRICTS = [{ id: 64, name: 'Çankaya' }]
/** `GET /api/projectfirms` satırı; kutu `title`'ı etiket olarak gösterir. */
const API_PROJECT_FIRMS = [
  {
    id: 11,
    companyType: 2,
    title: 'Anadolu Mühendislik Ltd. Şti.',
    taxNumber: null,
    contactPerson: null,
    phone: null,
    email: null,
  },
]

/** Yanıt HER çağrıda yeniden kuruluyor: tek `Response` paylaşılsaydı gövdesi
    ilk okumada tükenir, ikinci sorgu boş yanıt görürdü. */
function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Sayfa dört ayrı uca gidiyor; stub yolu okuyup doğru gövdeyi veriyor. */
function respondByPath(input: RequestInfo | URL): Response {
  const { pathname } = new URL(String(input))

  if (pathname.endsWith('/status-counts')) return jsonResponse(API_STATUS_COUNTS)
  if (pathname.endsWith('/districts')) return jsonResponse(API_DISTRICTS)
  if (pathname === '/api/cities') return jsonResponse(API_CITIES)
  // Uç 2026-08-16'da sayfalı zarfa geçti (`fetchAllPages` topluyor).
  if (pathname === '/api/projectfirms') {
    return jsonResponse({
      items: API_PROJECT_FIRMS,
      totalCount: API_PROJECT_FIRMS.length,
      page: 1,
      pageSize: 100,
    })
  }

  // Satır durumu SEKMEDEN geliyor: liste ucu sunucuda süzülü olduğu için stub
  // da hangi sekmenin sorulduğuna göre `status` yazıyor. Karar düğmeleri satırın
  // kendi durumuna bakıyor (`isRowInStatus`), sekmeye değil.
  const status = new URL(String(input)).searchParams.get('Status')
  const items = API_PROJECTS.map((project) => ({ ...project, status }))

  return jsonResponse({ items, totalCount: items.length, page: 1, pageSize: 30 })
}

/** İstek URL'lerini yeni→eski sırada verir; son çağrı en sonda. */
function fetchCalls(): URL[] {
  const mock = vi.mocked(fetch)
  return mock.mock.calls
    .map((call) => new URL(String(call[0])))
    .filter((url) => url.pathname === '/api/projects')
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
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route
            path="/projects"
            element={
              <>
                <ProjectListPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}


/**
 * Bu testler YÖNETİCİ görünümünü sınıyor: firma sütunları ve "Proje Firması"
 * süzgeci yalnız yönetim rollerinde çiziliyor (`useIsManagementUser`), oturumsuz
 * render'da hiç görünmezdi.
 */
const ADMIN_SESSION: AuthSession = {
  token: 'jwt-token',
  expiresAt: '2099-01-01T00:00:00.000Z',
  fullName: 'Yönetici',
  roleCode: ROLE_CODES.admin,
}

beforeEach(() => {
  setAuthSession(ADMIN_SESSION)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((input: RequestInfo | URL) => Promise.resolve(respondByPath(input))),
  )
})

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('ProjectListPage (duman)', () => {
  it('taslak projeleri listeler, sekme değişince filtreleri korur', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1), {
      timeout: 3000,
    })

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Taslak')
    expect(screen.getAllByRole('button', { name: 'Gönder' }).length).toBeGreaterThan(0)

    // "Filtrele" düğmesi kalktı: arama Enter'da uygulanıyor.
    await user.type(screen.getByPlaceholderText('Proje Ara...'), 'gül{Enter}')
    await waitFor(() => expect(screen.getByTestId('search').textContent).toContain('q=g'))

    await user.click(screen.getByRole('tab', { name: /Onaylanan/ }))

    await waitFor(() =>
      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Onaylanan'),
    )
    expect(screen.getByTestId('search').textContent).toContain('q=g')
    // Onaylanan projede satır aksiyonu olmaz.
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Sil' })).toHaveLength(0))
  })

  /**
   * Satır aksiyonu sekmeye değil satırın KENDİ durumuna bakıyor: sunucu
   * "Approved" dediği bir kayıt taslak sekmesine düşse bile ona "Gönder"
   * teklif edilmez (durumu boş gelen satırda sekme yedek kalır).
   */
  it('sunucunun onaylı dediği satıra taslak sekmesinde de aksiyon koymaz', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        if (new URL(String(input)).pathname !== '/api/projects') {
          return Promise.resolve(respondByPath(input))
        }

        return Promise.resolve(
          jsonResponse({
            items: [
              { ...API_PROJECTS[0], status: 'Approved' },
              { ...API_PROJECTS[1], status: 'Draft' },
            ],
            totalCount: 2,
            page: 1,
            pageSize: 30,
          }),
        )
      }),
    )

    renderPage()
    await screen.findByRole('table')

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Gönder' })).toHaveLength(1),
    )
    expect(screen.getAllByRole('button', { name: 'Sil' })).toHaveLength(1)
  })

  /**
   * Rozetler eskiden mock veri kümesini sayıyordu: "Onaylanan 7" yazan sekme
   * boş açılıyordu. Artık listeyle AYNI uçtan geliyorlar — uç durum
   * döndürmediği için tüm kayıtlar taslak, diğer üç sekme dürüstçe sıfır.
   */
  it('sekme rozetleri gerçek listeden gelir, uydurma dağılım göstermez', async () => {
    renderPage()
    await screen.findByRole('table')

    const draftTab = screen.getByRole('tab', { name: /Taslak/ })
    await waitFor(() => expect(draftTab).toHaveTextContent(String(API_PROJECTS.length)))

    for (const label of [/Onay Bekleyen/, /Onaylanan/, /Reddedilen/]) {
      expect(screen.getByRole('tab', { name: label })).toHaveTextContent('0')
    }
  })

  /**
   * Uç yalnız beş alan döndürüyor; taşımadığı sütunlar tablonun geri kalanıyla
   * aynı boş değer işaretini gösterir — uydurma firma adı ya da içi tire dolu
   * bir rozet çizilmez.
   */
  it('uçtan gelmeyen sütunlar boş değer işaretiyle çizilir', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    const firstRow = within(table).getAllByRole('row')[1]

    expect(within(firstRow).getByRole('link')).toHaveTextContent('Gülbahar Apartmanı')
    // Firma İsmi / Bina Kodu / Proje Tipi / Isınma Tipi / G.D Firması → beş boşluk.
    expect(within(firstRow).getAllByText('Değer yok')).toHaveLength(5)
  })

  /**
   * Firma listesi GERÇEK uçtan; kutu `title`'ı gösteriyor. Seçim uca
   * `ProjectFirmId` olarak gidiyor, temizlenince parametre DÜŞÜYOR.
   */
  it('proje firması süzgeci gerçek uçtan gelir ve ProjectFirmId gönderir', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    const firmSelect = screen.getByLabelText('Proje Firması')
    await screen.findByRole('option', { name: 'Anadolu Mühendislik Ltd. Şti.' })
    await user.selectOptions(firmSelect, '11')

    // SON istek bakılır: ilk istek süzgeç uygulanmadan önce atılmıştı.
    await waitFor(() =>
      expect(fetchCalls().at(-1)?.searchParams.get('ProjectFirmId')).toBe('11'),
    )

    await user.selectOptions(screen.getByLabelText('Proje Firması'), '')

    await waitFor(() =>
      expect(fetchCalls().at(-1)?.searchParams.has('ProjectFirmId')).toBe(false),
    )
  })

  it('sil onayı iptal edilince satır listede kalır', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Sil' }).length).toBeGreaterThan(0), {
      timeout: 3000,
    })
    const rowCount = screen.getAllByRole('row').length

    await user.click(screen.getAllByRole('button', { name: 'Sil' })[0])
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Vazgeç' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(rowCount)
  })
})

/**
 * Rol ayrımı. Satırların KAPSAMI burada sınanmıyor — onu sunucu belirliyor;
 * sınanan, yönetim ALANLARININ çizilmemesi ve istemcinin kendi kendine bir
 * firma süzgeci uydurmaması.
 */
describe('ProjectListPage (proje firması kullanıcısı)', () => {
  it('firma sütunlarını ve firma süzgecini göstermez', async () => {
    renderPage(ROLE_CODES.projectFirmUser)
    await screen.findByRole('table')

    expect(screen.queryByRole('columnheader', { name: 'Firma İsmi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'G.D Firması' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Proje Firması')).not.toBeInTheDocument()

    // Listenin kendisi ve kalan sütunlar yerinde: gizlenen YALNIZ firma alanları.
    expect(screen.getByRole('columnheader', { name: 'Proje Adı' })).toBeInTheDocument()
    expect(screen.getByText('Çınar Sitesi')).toBeInTheDocument()
  })

  /**
   * `ProjectFirmId` bir GÜVENLİK filtresi değil; istemcinin gönderdiği kimlik
   * kullanıcı tarafından değiştirilebilir. Kapsamı sunucu token'dan uyguluyor,
   * bu yüzden istemci parametreyi kendiliğinden EKLEMEZ.
   */
  it('firma kapsamını kendisi süzmeye çalışmaz', async () => {
    renderPage(ROLE_CODES.projectFirmUser)
    await screen.findByRole('table')

    for (const url of fetchCalls()) {
      expect(url.searchParams.get('ProjectFirmId')).toBeNull()
      expect(url.searchParams.get('gdGroupId')).toBeNull()
      expect(url.searchParams.get('gdFirmId')).toBeNull()
    }
  })

  /** Firma listesi ucu yalnız süzgeç kutusu için vardı; kutu yoksa istek de yok. */
  it('kullanmayacağı firma listesini indirmez', async () => {
    renderPage(ROLE_CODES.projectFirmUser)
    await screen.findByRole('table')

    const paths = vi.mocked(fetch).mock.calls.map((call) => new URL(String(call[0])).pathname)
    expect(paths).not.toContain('/api/projectfirms')
  })

  it('yönetici aynı ekranda firma sütunlarını görmeye devam eder', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(screen.getByRole('columnheader', { name: 'Firma İsmi' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'G.D Firması' })).toBeInTheDocument()
    expect(screen.getByLabelText('Proje Firması')).toBeInTheDocument()
  })
})

/**
 * Gaz dağıtım kullanıcısı proje YAZMAZ, KARAR VERİR. Sunucu da böyle diyor:
 * `POST /api/projects`, `DELETE /api/projects/{id}` ve `.../submit` uçları
 * `Authorize(Roles = Admin, ProjectFirmUser)` ile korunuyor; `.../approve` ve
 * `.../reject` ise `Admin, GasDistributionUser`. Buradaki görünürlük o
 * sınırın arayüzdeki karşılığı.
 */
describe('ProjectListPage (gaz dağıtım kullanıcısı)', () => {
  it('Yeni Proje düğmesini göstermez', async () => {
    renderPage(ROLE_CODES.gasDistributionUser)
    await screen.findByRole('table')

    expect(screen.queryByRole('link', { name: /Yeni Proje/ })).not.toBeInTheDocument()
  })

  it('taslak sekmesinde Sil ve Gönder aksiyonlarını göstermez', async () => {
    renderPage(ROLE_CODES.gasDistributionUser)
    await screen.findByRole('table')

    expect(screen.queryByRole('button', { name: 'Sil' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gönder' })).not.toBeInTheDocument()
    // Eylem sütunu HİÇ üretilmiyor: boş bir "Aksiyonlar" başlığı eylem varmış
    // gibi görünürdü.
    expect(screen.queryByRole('columnheader', { name: 'Aksiyonlar' })).not.toBeInTheDocument()
  })

  it('taslak sekmesinde Onayla/Reddet göstermez', async () => {
    renderPage(ROLE_CODES.gasDistributionUser)
    await screen.findByRole('table')

    expect(screen.queryByRole('button', { name: /Onayla/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reddet/ })).not.toBeInTheDocument()
  })

  it('onay bekleyen sekmesinde Onayla ve Reddet gösterir', async () => {
    const user = userEvent.setup()
    renderPage(ROLE_CODES.gasDistributionUser)
    await screen.findByRole('table')

    await user.click(screen.getByRole('tab', { name: /Onay Bekleyen/ }))

    expect(await screen.findAllByRole('button', { name: /Onayla/ })).toHaveLength(
      API_PROJECTS.length,
    )
    expect(screen.getAllByRole('button', { name: /Reddet/ })).toHaveLength(API_PROJECTS.length)
    expect(screen.queryByRole('button', { name: 'Sil' })).not.toBeInTheDocument()
  })

  it.each([
    ['Onaylanan', 'onaylanan'],
    ['Reddedilen', 'reddedilen'],
  ])('%s sekmesinde karar aksiyonu göstermez', async (tabLabel) => {
    const user = userEvent.setup()
    renderPage(ROLE_CODES.gasDistributionUser)
    await screen.findByRole('table')

    await user.click(screen.getByRole('tab', { name: new RegExp(tabLabel) }))
    await screen.findByRole('table')

    expect(screen.queryByRole('button', { name: /Onayla/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reddet/ })).not.toBeInTheDocument()
  })

  it('Onayla mevcut onay ucuna gider', async () => {
    const user = userEvent.setup()
    renderPage(ROLE_CODES.gasDistributionUser)
    await screen.findByRole('table')
    await user.click(screen.getByRole('tab', { name: /Onay Bekleyen/ }))

    const approveButtons = await screen.findAllByRole('button', { name: /Onayla/ })
    await user.click(approveButtons[0])

    const posted = vi
      .mocked(fetch)
      .mock.calls.find((call) => String(call[0]).includes('/approve'))
    expect(posted).toBeDefined()
    expect(new URL(String(posted?.[0])).pathname).toBe(`/api/projects/${API_PROJECTS[0].id}/approve`)
    expect(await screen.findByText(/Proje onaylandı/)).toBeInTheDocument()
  })

  /**
   * Ret GEREKÇESİZ gitmez: kural `requiresReason` (api/projectDetail.ts) ve
   * proje detayı da aynı kapıdan geçiyor. Diyalog açılmadan istek atılmamalı.
   */
  it('Reddet önce gerekçe diyaloğunu açar, sonra ret ucuna gider', async () => {
    const user = userEvent.setup()
    renderPage(ROLE_CODES.gasDistributionUser)
    await screen.findByRole('table')
    await user.click(screen.getByRole('tab', { name: /Onay Bekleyen/ }))

    const rejectButtons = await screen.findAllByRole('button', { name: /Reddet/ })
    await user.click(rejectButtons[0])

    const dialog = await screen.findByRole('dialog')
    expect(
      vi.mocked(fetch).mock.calls.some((call) => String(call[0]).includes('/reject')),
    ).toBe(false)

    // Sorgu diyaloğun İÇİNE kapsanıyor: satırlardaki "Reddet" düğmeleri de
    // ekranda duruyor ve aynı ada sahip.
    await user.type(within(dialog).getByRole('textbox'), 'Kolon çapı yetersiz')
    await user.click(within(dialog).getByRole('button', { name: 'Reddet' }))

    const posted = vi.mocked(fetch).mock.calls.find((call) => String(call[0]).includes('/reject'))
    expect(posted).toBeDefined()
    expect(String(posted?.[1]?.body)).toContain('Kolon çapı yetersiz')
  })
})
