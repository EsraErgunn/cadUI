import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setAuthSession } from '../../api/authToken'
import { ROLE_CODES } from '../../api/roles'
import { FirmUserHomePage } from '../firmUser/FirmUserHomePage'

/** Varsayılan aralık son bir ay; kayıtlar bugünden olmalı ki süzülmesin. */
const TODAY = `${new Date().toISOString().slice(0, 10)}T09:00:00`

const API_STATUS_COUNTS = { draft: 7, pendingApproval: 2, approved: 13, rejected: 1 }

const DRAFT_PROJECTS = [
  { id: 3, name: 'Gülbahar Apartmanı', code: 'PRJ-003', createdAt: TODAY, updatedAt: TODAY },
]
const PENDING_PROJECTS = [
  { id: 9, name: 'Çınar Sitesi', code: 'PRJ-009', createdAt: TODAY, updatedAt: TODAY },
]

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Sayfa YALNIZ iki gerçek uca gidiyor: `status-counts` ve `projects`. Yönetici
 * panosunun ucu (`/api/admin/dashboard`) burada hiç çağrılmamalı — stub onu
 * tanımıyor, çağrılsaydı test proje listesi gövdesi alıp sessizce geçerdi.
 */
function respondByPath(input: RequestInfo | URL): Response {
  const url = new URL(String(input))

  if (url.pathname.endsWith('/status-counts')) return jsonResponse(API_STATUS_COUNTS)

  const items = url.searchParams.get('Status') === 'PendingApproval' ? PENDING_PROJECTS : DRAFT_PROJECTS
  return jsonResponse({ items, totalCount: items.length, page: 1, pageSize: 5 })
}

function requestUrls(): URL[] {
  return vi.mocked(fetch).mock.calls.map((call) => new URL(String(call[0])))
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/firm']}>
        <Routes>
          <Route path="/firm" element={<FirmUserHomePage />} />
          <Route path="/projects" element={<h1>Projeler</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  setAuthSession({
    token: 'jwt-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    fullName: 'Firma Kullanıcısı',
    roleCode: ROLE_CODES.projectFirmUser,
  })
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

describe('FirmUserHomePage', () => {
  it('durum adetlerini gerçek uçtan gösterir', async () => {
    renderPage()

    // Kart adet gelmeden de çiziliyor (rakam yerine "…"); bekleme RAKAMA
    // yapılmalı, yoksa iddia boş kartı yakalar.
    await screen.findByText('7')

    const draftCard = screen.getByRole('link', { name: /Taslak/ })
    expect(within(draftCard).getByText('7')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Onaylanan/ })).getByText('13')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Onay Bekleyen/ })).getByText('2')).toBeInTheDocument()
  })

  it('iki listeyi kendi durumundan doldurur', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: 'Gülbahar Apartmanı' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Çınar Sitesi' })).toBeInTheDocument()
  })

  /**
   * ASIL SINAV: pano yönetici ucundan beslenmiyor. `/api/admin/dashboard`
   * kapsamı `gdGroupId`/`gdFirmId` üzerine kurulu ve bu rolün ekranı değil.
   */
  it('yönetici gösterge panosu ucuna gitmez', async () => {
    renderPage()
    await screen.findByRole('link', { name: 'Gülbahar Apartmanı' })

    const paths = requestUrls().map((url) => url.pathname)
    expect(paths).not.toContain('/api/admin/dashboard')
    expect(paths).not.toContain('/api/gasdistributionfirms')
    expect(paths).not.toContain('/api/projectfirms')
  })

  /**
   * Kapsam sunucunun sorumluluğu: istemci `ProjectFirmId` göndererek güvenlik
   * sağlamaya ÇALIŞMAZ (kullanıcı o parametreyi değiştirebilir).
   */
  it('sorgulara firma kimliği koymaz', async () => {
    renderPage()
    await screen.findByRole('link', { name: 'Gülbahar Apartmanı' })

    for (const url of requestUrls()) {
      expect(url.searchParams.get('ProjectFirmId')).toBeNull()
      expect(url.searchParams.get('gdGroupId')).toBeNull()
      expect(url.searchParams.get('gdFirmId')).toBeNull()
    }
  })

  /** Uydurulmuş sayı YOK: evrak/poliçe uçları olmadığı için o kartlar da yok. */
  it('sunucuda karşılığı olmayan kart göstermez', async () => {
    renderPage()
    await screen.findByRole('link', { name: 'Gülbahar Apartmanı' })

    expect(screen.queryByText(/Eksik Evrak/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Poliçe Toplam/i)).not.toBeInTheDocument()
  })

  it('boş listede uydurma satır değil açıklama gösterir', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/status-counts')) return Promise.resolve(jsonResponse(API_STATUS_COUNTS))
      return Promise.resolve(jsonResponse({ items: [], totalCount: 0, page: 1, pageSize: 5 }))
    })

    renderPage()

    expect(
      await screen.findByText('Taslak projeniz yok. Yeni bir proje oluşturabilirsiniz.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Onay bekleyen projeniz yok.')).toBeInTheDocument()
  })
})
