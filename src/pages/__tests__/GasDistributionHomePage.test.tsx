import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setAuthSession } from '../../api/authToken'
import { ROLE_CODES } from '../../api/roles'
import { GasDistributionHomePage } from '../gasDistributionUser/GasDistributionHomePage'

/** Varsayılan aralık son bir ay; kayıtlar bugünden olmalı ki süzülmesin. */
const TODAY = `${new Date().toISOString().slice(0, 10)}T09:00:00`

const API_STATUS_COUNTS = { draft: 4, pendingApproval: 9, approved: 21, rejected: 3 }

const PENDING_PROJECTS = [
  { id: 11, name: 'Yıldız Apartmanı', code: 'PRJ-011', createdAt: TODAY, updatedAt: TODAY },
]
const APPROVED_PROJECTS = [
  { id: 22, name: 'Lale Sitesi', code: 'PRJ-022', createdAt: TODAY, updatedAt: TODAY },
]

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Pano YALNIZ iki gerçek uca gidiyor. Stub `/api/admin/dashboard`'ı TANIMIYOR:
 * oraya bir istek çıksaydı proje listesi gövdesi alıp test sessizce geçerdi,
 * bu yüzden yol ayrıca sınanıyor.
 */
function respondByPath(input: RequestInfo | URL): Response {
  const url = new URL(String(input))

  if (url.pathname.endsWith('/status-counts')) return jsonResponse(API_STATUS_COUNTS)

  const items = url.searchParams.get('Status') === 'Approved' ? APPROVED_PROJECTS : PENDING_PROJECTS
  return jsonResponse({ items, totalCount: items.length, page: 1, pageSize: 8 })
}

function requestUrls(): URL[] {
  return vi.mocked(fetch).mock.calls.map((call) => new URL(String(call[0])))
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/gas-distribution']}>
        <Routes>
          <Route path="/gas-distribution" element={<GasDistributionHomePage />} />
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
    fullName: 'Dağıtım Kullanıcısı',
    roleCode: ROLE_CODES.gasDistributionUser,
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

describe('GasDistributionHomePage', () => {
  it('durum adetlerini gerçek uçtan gösterir', async () => {
    renderPage()

    // Kart adet gelmeden de çiziliyor ("…"); bekleme RAKAMA yapılmalı.
    await screen.findByText('9')

    expect(
      within(screen.getByRole('link', { name: /Onay Bekleyen/ })).getByText('9'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('link', { name: /Onaylanan/ })).getByText('21'),
    ).toBeInTheDocument()
  })

  it('onay kuyruğunu ve son onaylananları ayrı kartlarda listeler', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: 'Yıldız Apartmanı' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Lale Sitesi' })).toBeInTheDocument()
  })

  /**
   * ASIL SINAV: pano yönetici ucundan beslenmiyor. `/api/admin/dashboard`
   * kapsamı gdGroupId/gdFirmId üzerine kurulu, kartları bu role kapalı
   * ekranlara bağlanıyor ve rolün oraya erişimi doğrulanmış değil.
   */
  it('yönetici gösterge panosu ucuna gitmez', async () => {
    renderPage()
    await screen.findByRole('link', { name: 'Yıldız Apartmanı' })

    const paths = requestUrls().map((url) => url.pathname)
    expect(paths).not.toContain('/api/admin/dashboard')
    expect(paths).not.toContain('/api/gasdistributionfirms')
    expect(paths).not.toContain('/api/gasdistributiongroups')
  })

  /**
   * Kapsam sunucunun sorumluluğu: istemci kendi firma kimliğini göndererek
   * güvenlik sağlamaya ÇALIŞMAZ — kullanıcı o parametreyi değiştirebilir.
   */
  it('sorgulara firma kimliği koymaz', async () => {
    renderPage()
    await screen.findByRole('link', { name: 'Yıldız Apartmanı' })

    for (const url of requestUrls()) {
      expect(url.searchParams.get('gdFirmId')).toBeNull()
      expect(url.searchParams.get('gdGroupId')).toBeNull()
      expect(url.searchParams.get('ProjectFirmId')).toBeNull()
    }
  })

  /** Uydurulmuş sayı YOK: evrak/poliçe uçları olmadığı için o kartlar da yok. */
  it('sunucuda karşılığı olmayan kart göstermez', async () => {
    renderPage()
    await screen.findByRole('link', { name: 'Yıldız Apartmanı' })

    expect(screen.queryByText(/Bekleyen Evrak/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Poliçe Toplam/i)).not.toBeInTheDocument()
    // Yönetici panosunun kartları da burada yok.
    expect(screen.queryByText(/Yoğunluk/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Duyuru/i)).not.toBeInTheDocument()
  })

  it('boş kuyrukta uydurma satır değil açıklama gösterir', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/status-counts')) {
        return Promise.resolve(jsonResponse(API_STATUS_COUNTS))
      }
      return Promise.resolve(jsonResponse({ items: [], totalCount: 0, page: 1, pageSize: 8 }))
    })

    renderPage()

    expect(await screen.findByText('Onay bekleyen proje yok. Kuyruk temiz.')).toBeInTheDocument()
  })
})
