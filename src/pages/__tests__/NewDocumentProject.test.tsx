import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetMockDocuments } from '../../api/documentsMock'
import { getMockProjectSeeds } from '../../api/projectsMock'
import { NewDocumentPage } from '../NewDocumentPage'

/**
 * Ekranın bağlandığı projenin künyesi GERÇEK uçtan (`GET /api/projects/{id}`)
 * çözülür. Önceden mock tohumlarından okunuyordu: sunucudaki proje tohum
 * listesinde yoksa ekran hiç açılmıyor, kimlik tesadüfen bir tohuma denk
 * gelirse BAŞKA bir projenin adı gösteriliyordu.
 */

const SERVER_PROJECT_NAME = 'Demo Doğalgaz Projesi'

/** Tohum listesinin dışında kalan kimlik: mock 48 kayıt üretiyor. */
const PROJECT_ID_BEYOND_SEEDS = 9_412

function stubProjectResponse(projectId: number, status = 200) {
  const body =
    status === 200
      ? {
          id: projectId,
          name: SERVER_PROJECT_NAME,
          createdAt: '2026-07-01T09:00:00.000Z',
          updatedAt: '2026-07-01T09:00:00.000Z',
        }
      : { message: 'Kayıt bulunamadı.' }

  // Yanıt her çağrıda yeniden kuruluyor: tek bir `Response`'un gövdesi ilk
  // okumada tükenir ve ikinci istek boş yanıt görür.
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  )
}

function renderPage(projectId: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/admin/documents/new?project=${projectId}`]}>
        <Routes>
          <Route path="/admin/documents/new" element={<NewDocumentPage />} />
          <Route path="/projects" element={<h1>Projeler</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  resetMockDocuments()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('NewDocumentPage — proje künyesi', () => {
  it('kimlik tohum listesinde olmasa da ekran sunucudaki projeyle açılır', async () => {
    stubProjectResponse(PROJECT_ID_BEYOND_SEEDS)
    renderPage(PROJECT_ID_BEYOND_SEEDS)

    expect(await screen.findByRole('link', { name: SERVER_PROJECT_NAME })).toHaveAttribute(
      'href',
      `/projects/${PROJECT_ID_BEYOND_SEEDS}`,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('kimlik bir tohuma denk gelse de ad sunucudan gelir, tohumdan değil', async () => {
    const [seed] = getMockProjectSeeds()
    stubProjectResponse(seed.id)
    renderPage(seed.id)

    expect(await screen.findByRole('link', { name: SERVER_PROJECT_NAME })).toBeInTheDocument()
    expect(screen.queryByText(seed.name)).not.toBeInTheDocument()
  })

  it('sunucu projeyi bulamazsa ekran sebebini yazar', async () => {
    stubProjectResponse(PROJECT_ID_BEYOND_SEEDS, 404)
    renderPage(PROJECT_ID_BEYOND_SEEDS)

    expect(await screen.findByRole('alert')).toHaveTextContent(/geçerli bir proje yok/)
    expect(screen.getByRole('link', { name: 'Projelere dön' })).toHaveAttribute('href', '/projects')
  })

  it('künye okunamazsa yükleme formu çizilmez, tekrar deneme sunulur', async () => {
    stubProjectResponse(PROJECT_ID_BEYOND_SEEDS, 500)
    renderPage(PROJECT_ID_BEYOND_SEEDS)

    expect(await screen.findByRole('alert')).toHaveTextContent(/bilgileri okunamadı/)
    expect(screen.queryByLabelText('Yüklenecek dosyaları seçin')).not.toBeInTheDocument()
  })
})
