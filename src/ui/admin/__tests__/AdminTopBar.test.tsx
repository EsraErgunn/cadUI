import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAuthSession, setAuthSession, type AuthSession } from '../../../api/authToken'
import { ROLE_CODES } from '../../../api/roles'
import { LOGIN_PATH, RequireAuth } from '../../../app/RequireAuth'
import { AdminTopBar } from '../AdminTopBar'
import { GAS_DISTRIBUTION_FIRMS_PATH, PROJECT_FIRMS_PATH } from '../adminNavItems'

/**
 * Kapsam seçicisi YÖNETİM rollerine ait (`MANAGEMENT_SCREEN_ROLES`), bu yüzden
 * testler artık oturumsuz render edemiyor: rol okunamayınca seçici hiç
 * çizilmiyor.
 */
const ADMIN_SESSION: AuthSession = {
  token: 'jwt-token',
  expiresAt: '2099-01-01T00:00:00.000Z',
  fullName: 'Yönetici',
  roleCode: ROLE_CODES.admin,
}

const { listRoles } = vi.hoisted(() => ({ listRoles: vi.fn() }))

vi.mock('../../../api/roles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/roles')>()),
  listRoles,
}))

const { getFirmGroups, fetchAllFirms } = vi.hoisted(() => ({
  getFirmGroups: vi.fn(),
  fetchAllFirms: vi.fn(),
}))

vi.mock('../../../api/adminFirms', () => ({ getFirmGroups, fetchAllFirms }))

/** Sunucu Türkçe sıralamıyor; sıra istemcinin garantisi olduğu için mock
    bilerek karışık veriliyor (ENERYA önce, ÇEDAŞ 'D'den sonra). */
const GROUPS = [
  { id: 2, name: 'ENERYA' },
  { id: 1, name: 'AKSA' },
  { id: 3, name: 'ÇEDAŞ' },
]

const FIRMS = [
  { id: 21, dfirmNo: 1, groupId: 1, groupName: 'AKSA', name: 'AKSA-Denizli' },
  { id: 20, dfirmNo: 2, groupId: 1, groupName: 'AKSA', name: 'AKSA-Ankara' },
  { id: 30, dfirmNo: 3, groupId: 2, groupName: 'ENERYA', name: 'ENERYA-Aydın' },
  { id: 40, dfirmNo: 4, groupId: null, groupName: null, name: 'Bağımsız Gaz' },
]

/** Kapsamın URL'e yazıldığı ve çıkışın yönlendirdiği testlerde adresi okumak için. */
function LocationProbe() {
  const { pathname, search } = useLocation()
  return (
    <>
      <span data-testid="search">{search}</span>
      <span data-testid="location">{pathname}</span>
    </>
  )
}

function renderTopBar(pathname: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[pathname]}>
        <AdminTopBar onOpenMenu={() => {}} />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/**
 * Kapsam seçicisi yönetim DIŞI rollerde kendi firmalarını `useOwnGasFirms`
 * üzerinden çekiyor; o hook `GET /api/auth/me` çağırıyor. Bu dosya üst BARIN
 * kendisini ölçüyor, ağ değil: gerçek istek burada çalışsaydı, çıkış
 * testlerinin `fetch` sahtesine takılıp 401 dönebiliyor ve oturumu bir sonraki
 * testin altından çekiyordu. Hook'un kendi testleri ayrı dosyada.
 */
vi.mock('../ownGasFirms/useOwnGasFirms', () => ({
  useOwnGasFirms: () => ({
    rows: [],
    isPending: false,
    isError: false,
    hasNoFirmLink: false,
    refetch: () => {},
  }),
}))

beforeEach(() => {
  setAuthSession(ADMIN_SESSION)
  // Çağrı sayısı testler arasında taşınmasın: "hiç istek atılmadı" iddiası buna bakıyor.
  getFirmGroups.mockClear()
  getFirmGroups.mockResolvedValue(GROUPS)
  fetchAllFirms.mockClear()
  fetchAllFirms.mockResolvedValue(FIRMS)
  listRoles.mockResolvedValue([])
})

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
})

/** Seçenekleri DOM sırasıyla `[etiket, değer]` olarak okur; girinti kırpılır. */
function readScopeOptions(): [string, string][] {
  return [...document.querySelectorAll('#admin-scope option')].map((node) => [
    (node.textContent ?? '').trim(),
    node.getAttribute('value') ?? '',
  ])
}

describe('AdminTopBar kapsam seçicisi', () => {
  it('grupları ve firmalarını hiyerarşik listeler', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)

    expect(await screen.findByRole('option', { name: 'AKSA' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'AKSA-Ankara' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sistem geneli' })).toBeInTheDocument()
  })

  /**
   * Grup için AYRI bir "(tümü)" satırı YOK. Bir süre `<optgroup>` başlığı ile
   * onun hemen altındaki "AKSA (tümü)" satırı yan yana duruyordu ve aynı şeyin
   * iki kez yazıldığı izlenimi veriyordu. Grup artık tek satır ve o satır
   * grubun tamamını seçiyor.
   */
  it('grup için ayrı bir "(tümü)" satırı çizmez', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    await screen.findByRole('option', { name: 'AKSA' })

    expect(readScopeOptions().some(([label]) => label.includes('tümü'))).toBe(false)
    // Grup satırı hâlâ SEÇİLEBİLİR: kapsamın tamamı erişilebilir kalmalı.
    expect(screen.getByRole('option', { name: 'AKSA' })).toHaveValue('group:1')
  })

  // Firma KENDİ grubunun altında görünmeli; başka grubun altına düşerse kapsam
  // seçimi kullanıcıya yanlış hiyerarşi gösterir.
  it('firmayı kendi grubunun altına koyar', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    await screen.findByRole('option', { name: 'ENERYA' })

    const labels = readScopeOptions().map(([label]) => label)
    expect(labels.indexOf('ENERYA-Aydın')).toBe(labels.indexOf('ENERYA') + 1)
  })

  // Sunucu Türkçe sıralamıyor: hem gruplar hem her grubun firmaları istemcide sıralanır.
  it('grupları ve firmaları Türkçe alfabeye göre sıralar', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    await screen.findByRole('option', { name: 'AKSA' })

    const labels = readScopeOptions().map(([label]) => label)
    expect(labels.slice(0, 4)).toEqual(['Sistem geneli', 'AKSA', 'AKSA-Ankara', 'AKSA-Denizli'])
    expect(labels.indexOf('AKSA')).toBeLessThan(labels.indexOf('ÇEDAŞ'))
    expect(labels.indexOf('ÇEDAŞ')).toBeLessThan(labels.indexOf('ENERYA'))
  })

  // Kapsamın sahibi URL: bağlantı paylaşılınca seçim de gitsin.
  it('grup seçimini group anahtarına yazar', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    await screen.findByRole('option', { name: 'ENERYA' })

    await userEvent.selectOptions(screen.getByLabelText('Kapsam'), 'group:2')

    expect(screen.getByTestId('search')).toHaveTextContent('group=2')
    expect(screen.getByTestId('search')).not.toHaveTextContent('gdfirm=')
  })

  // İki anahtar aynı anda yazılmaz: sunucu gdGroupId+gdFirmId ikilisini kabul etmiyor.
  it('firma seçimini gdfirm anahtarına yazar ve grubu siler', async () => {
    renderTopBar(`${GAS_DISTRIBUTION_FIRMS_PATH}?group=1`)
    await screen.findByRole('option', { name: 'AKSA-Ankara' })

    await userEvent.selectOptions(screen.getByLabelText('Kapsam'), 'firm:20')

    expect(screen.getByTestId('search')).toHaveTextContent('gdfirm=20')
    expect(screen.getByTestId('search')).not.toHaveTextContent('group=')
  })

  it('"Sistem geneli" seçilince iki anahtarı da adresten siler', async () => {
    renderTopBar(`${GAS_DISTRIBUTION_FIRMS_PATH}?gdfirm=20`)
    await screen.findByRole('option', { name: 'AKSA-Ankara' })

    await userEvent.selectOptions(screen.getByLabelText('Kapsam'), '')

    expect(screen.getByTestId('search')).not.toHaveTextContent('gdfirm=')
    expect(screen.getByTestId('search')).not.toHaveTextContent('group=')
  })

  // Grubu olmayan firma elenirse kapsamı arayüzden hiç seçilemez. Onun başlığı
  // `<optgroup>` olarak KALIYOR: seçilebilecek bir grup kapsamı yok.
  it('grubu olmayan firmayı ayrı başlık altında gösterir', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    const firmOption = await screen.findByRole('option', { name: 'Bağımsız Gaz' })

    expect(firmOption.closest('optgroup')).toHaveAttribute('label', 'Grubu olmayan firmalar')
  })

  // Kapsam her yönetici ekranında etkin (K44) — tek bir ekrana bağlı değil.
  it('gaz dağıtım firmaları dışındaki ekranda da etkin kalır', async () => {
    renderTopBar(PROJECT_FIRMS_PATH)

    expect(screen.getByLabelText('Kapsam')).toBeEnabled()
    expect(await screen.findByRole('option', { name: 'AKSA' })).toBeInTheDocument()
  })

})

describe('AdminTopBar oturum sonlandırma', () => {
  /** Üst barı gerçek koruma zinciriyle basar; adres çubuğu `LocationProbe`'ta. */
  function renderProtectedTopBar(session = ADMIN_SESSION) {
    setAuthSession(session)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[GAS_DISTRIBUTION_FIRMS_PATH]}>
          <Routes>
            <Route
              path={GAS_DISTRIBUTION_FIRMS_PATH}
              element={
                <RequireAuth>
                  <AdminTopBar onOpenMenu={() => {}} />
                </RequireAuth>
              }
            />
            <Route path={LOGIN_PATH} element={<h1>Giriş</h1>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  afterEach(() => {
    setAuthSession(undefined)
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  /** Çıkış artık ayrı ikon düğmesi değil; kullanıcı menüsünün maddesi. */
  async function openUserMenu(): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole('button', { expanded: false }))
    return screen.getByRole('menuitem', { name: 'Çıkış Yap' })
  }

  it('menü kullanıcının adını ve iki eylemi gösterir', async () => {
    renderProtectedTopBar()

    await userEvent.click(screen.getByRole('button', { expanded: false }))

    expect(screen.getByRole('menuitem', { name: 'Şifre Değiştir' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Çıkış Yap' })).toBeInTheDocument()
    // Yönetici rolünde GÖSTERİLEN ad sabit "Administrator"; oturumdaki gerçek ad
    // (ortama göre "Demo" olabiliyor) üst barda yazılmıyor. Rol yine oturumdan.
    expect(screen.getAllByText('Administrator').length).toBeGreaterThan(0)
    expect(screen.queryByText(ADMIN_SESSION.fullName)).not.toBeInTheDocument()
    expect(screen.getAllByText('Sistem Yöneticisi').length).toBeGreaterThan(0)
  })

  it('yönetici olmayan rolde oturumdaki ad yazılır', async () => {
    renderProtectedTopBar({
      ...ADMIN_SESSION,
      fullName: 'Ayşe Demir',
      roleCode: ROLE_CODES.projectFirmUser,
    })

    await userEvent.click(screen.getByRole('button', { expanded: false }))

    expect(screen.getAllByText('Ayşe Demir').length).toBeGreaterThan(0)
    expect(screen.queryByText('Administrator')).not.toBeInTheDocument()
  })

  it('tıklanınca çıkış ucuna gider', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderProtectedTopBar()

    await userEvent.click(await openUserMenu())

    await waitFor(() => {
      expect(String(fetchMock.mock.calls[0][0])).toContain('/api/auth/logout')
    })
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST')
  })

  it('başarılı çıkışta oturumu temizleyip giriş sayfasına yönlendirir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
    renderProtectedTopBar()

    await userEvent.click(await openUserMenu())

    expect(await screen.findByRole('heading', { name: 'Giriş' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(LOGIN_PATH)
    expect(getAuthSession()).toBeUndefined()
  })

  // 401 = token zaten geçersiz; kullanıcı yine çıkmış olmalı, hata ekranı görmemeli.
  it('401 dönse de giriş sayfasına yönlendirir', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'hata' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    renderProtectedTopBar()

    await userEvent.click(await openUserMenu())

    expect(await screen.findByRole('heading', { name: 'Giriş' })).toBeInTheDocument()
    expect(getAuthSession()).toBeUndefined()
  })

  // Çift tıklama ikinci bir istek üretmemeli: ilkinin token'ı düşürdüğü ana
  // denk gelip gereksiz bir 401 doğururdu.
  it('istek uçarken ikinci çıkış isteği gitmez', async () => {
    let releaseRequest = (): void => {}
    const pending = new Promise<Response>((resolve) => {
      releaseRequest = () => resolve(new Response(null, { status: 200 }))
    })
    const fetchMock = vi.fn().mockReturnValue(pending)
    vi.stubGlobal('fetch', fetchMock)
    renderProtectedTopBar()

    await userEvent.click(await openUserMenu())

    // Menü kapandı; kullanıcı yeniden açıp tekrar basıyor. İstek uçarken madde
    // kilitli olduğu için ikinci istek gitmez.
    const secondAttempt = await openUserMenu()
    expect(secondAttempt).toBeDisabled()
    await userEvent.click(secondAttempt)

    expect(fetchMock).toHaveBeenCalledTimes(1)

    releaseRequest()
    await waitFor(() => expect(getAuthSession()).toBeUndefined())
  })
})
