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

beforeEach(() => {
  setAuthSession(ADMIN_SESSION)
  // Çağrı sayısı testler arasında taşınmasın: "hiç istek atılmadı" iddiası buna bakıyor.
  getFirmGroups.mockClear()
  getFirmGroups.mockResolvedValue(GROUPS)
  fetchAllFirms.mockClear()
  fetchAllFirms.mockResolvedValue(FIRMS)
})

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
})

describe('AdminTopBar kapsam seçicisi', () => {
  it('grupları ve firmalarını hiyerarşik listeler', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)

    expect(await screen.findByRole('option', { name: 'AKSA (tümü)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'AKSA-Ankara' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sistem geneli' })).toBeInTheDocument()
  })

  // Firma KENDİ grubunun altında görünmeli; başka grubun altına düşerse kapsam
  // seçimi kullanıcıya yanlış hiyerarşi gösterir.
  it('firmayı kendi grubunun altına koyar', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    const firmOption = await screen.findByRole('option', { name: 'ENERYA-Aydın' })

    expect(firmOption.closest('optgroup')).toHaveAttribute('label', 'ENERYA')
  })

  // Sunucu Türkçe sıralamıyor: hem gruplar hem her grubun firmaları istemcide sıralanır.
  it('grupları ve firmaları Türkçe alfabeye göre sıralar', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    await screen.findByRole('option', { name: 'AKSA (tümü)' })

    const groupLabels = [...document.querySelectorAll('optgroup')].map((node) =>
      node.getAttribute('label'),
    )
    expect(groupLabels).toEqual(['AKSA', 'ÇEDAŞ', 'ENERYA', 'Grubu olmayan firmalar'])

    const aksaFirms = [...(document.querySelector('optgroup[label="AKSA"]')?.children ?? [])]
      .map((node) => node.textContent)
      .slice(1)
    expect(aksaFirms).toEqual(['AKSA-Ankara', 'AKSA-Denizli'])
  })

  // Kapsamın sahibi URL: bağlantı paylaşılınca seçim de gitsin.
  it('grup seçimini group anahtarına yazar', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    await screen.findByRole('option', { name: 'ENERYA (tümü)' })

    await userEvent.selectOptions(screen.getByLabelText('Kapsam'), 'ENERYA (tümü)')

    expect(screen.getByTestId('search')).toHaveTextContent('group=2')
    expect(screen.getByTestId('search')).not.toHaveTextContent('gdfirm=')
  })

  // İki anahtar aynı anda yazılmaz: sunucu gdGroupId+gdFirmId ikilisini kabul etmiyor.
  it('firma seçimini gdfirm anahtarına yazar ve grubu siler', async () => {
    renderTopBar(`${GAS_DISTRIBUTION_FIRMS_PATH}?group=1`)
    await screen.findByRole('option', { name: 'AKSA-Ankara' })

    await userEvent.selectOptions(screen.getByLabelText('Kapsam'), 'AKSA-Ankara')

    expect(screen.getByTestId('search')).toHaveTextContent('gdfirm=20')
    expect(screen.getByTestId('search')).not.toHaveTextContent('group=')
  })

  it('"Sistem geneli" seçilince iki anahtarı da adresten siler', async () => {
    renderTopBar(`${GAS_DISTRIBUTION_FIRMS_PATH}?gdfirm=20`)
    await screen.findByRole('option', { name: 'AKSA-Ankara' })

    await userEvent.selectOptions(screen.getByLabelText('Kapsam'), 'Sistem geneli')

    expect(screen.getByTestId('search')).not.toHaveTextContent('gdfirm=')
    expect(screen.getByTestId('search')).not.toHaveTextContent('group=')
  })

  // Grubu olmayan firma elenirse kapsamı arayüzden hiç seçilemez.
  it('grubu olmayan firmayı ayrı başlık altında gösterir', async () => {
    renderTopBar(GAS_DISTRIBUTION_FIRMS_PATH)
    const firmOption = await screen.findByRole('option', { name: 'Bağımsız Gaz' })

    expect(firmOption.closest('optgroup')).toHaveAttribute('label', 'Grubu olmayan firmalar')
  })

  // Kapsam her yönetici ekranında etkin (K44) — tek bir ekrana bağlı değil.
  it('gaz dağıtım firmaları dışındaki ekranda da etkin kalır', async () => {
    renderTopBar(PROJECT_FIRMS_PATH)

    expect(screen.getByLabelText('Kapsam')).toBeEnabled()
    expect(await screen.findByRole('option', { name: 'AKSA (tümü)' })).toBeInTheDocument()
  })

})

/**
 * Çıkış eylemi. Yönlendirme burada elle YAPILMIYOR: oturum düşünce
 * `RequireAuth` girişe götürüyor (`app/RequireAuth.tsx`) — bu testler o zinciri
 * uçtan uca sınıyor, yalnız düğmenin tıklanabilirliğini değil.
 */
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
