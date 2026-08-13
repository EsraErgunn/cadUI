import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMockDocuments, resetMockDocuments } from '../../api/documentsMock'
import { NewDocumentPage } from '../NewDocumentPage'
import { ProjectDetailPage } from '../ProjectDetailPage'

/** Mock proje listesindeki ilk kayıt; künye `projectsMock`'tan tohumlanıyor. */
const PROJECT_ID = 1

function buildFile(name: string, sizeBytes = 1024): File {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: sizeBytes })
  return file
}

function renderPage(search = `?project=${PROJECT_ID}`) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/admin/documents/new${search}`]}>
        <Routes>
          <Route path="/admin/documents/new" element={<NewDocumentPage />} />
          <Route path="/projects" element={<h1>Projeler</h1>} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Gizli dosya girdisine doğrudan yazmak, sürükle-bırak taklidinden sade. */
async function addFiles(user: ReturnType<typeof userEvent.setup>, files: File[]) {
  await user.upload(screen.getByLabelText('Yüklenecek dosyaları seçin'), files)
}

beforeEach(() => {
  resetMockDocuments()
  // Proje detayına yönlendirme sonrası detay ucu çağrılıyor; ekran testin
  // konusu değil, yalnız yönlendirmenin vardığı yer.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: PROJECT_ID,
          name: 'Demo Doğalgaz Projesi',
          createdAt: '2026-07-01T09:00:00.000Z',
          updatedAt: '2026-07-01T09:00:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('NewDocumentPage', () => {
  it('proje kimliği yoksa ekran boş kalmaz, projelere dönüş sunar', () => {
    renderPage('')

    expect(screen.getByRole('alert')).toHaveTextContent(/geçerli bir proje yok/)
    expect(screen.getByRole('link', { name: 'Projelere dön' })).toHaveAttribute(
      'href',
      '/projects',
    )
  })

  it('iki kaynak sekmesi var; "Favori Evraklar" yok', async () => {
    renderPage()

    const tabs = await screen.findAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Bilgisayardan Seç', 'Proje Evrakları'])
  })

  it('sınırı aşan dosya listeye eklenmez, sebebi yazılır', async () => {
    const user = userEvent.setup()
    renderPage()

    await addFiles(user, [buildFile('ruhsat.pdf'), buildFile('buyuk.png', 11 * 1024 * 1024)])

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent("buyuk.png: Dosya boyutu 10MB'ı aşamaz.")

    const uploaded = screen.getByRole('region', { name: 'Yüklenen Evraklar' })
    expect(within(uploaded).getByText('ruhsat.pdf')).toBeInTheDocument()
    expect(within(uploaded).queryByText('buyuk.png')).not.toBeInTheDocument()
  })

  /**
   * Sürükle-bırak `accept` özniteliğini DİNLEMEZ (dosya seçici dinler); bu
   * yüzden desteklenmeyen biçim ancak bu yoldan gelebiliyor ve asıl denetimi
   * yapan uygulama kodudur.
   */
  it('sürüklenen desteklenmeyen dosya listeye eklenmez', async () => {
    renderPage()

    const dropZone = (await screen.findByText('Dosyaları buraya sürükleyip bırakın'))
      .parentElement
    expect(dropZone).not.toBeNull()

    fireEvent.drop(dropZone as HTMLElement, {
      dataTransfer: { files: [buildFile('kolon.dwg')], types: ['Files'] },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'kolon.dwg: Desteklenmeyen dosya formatı.',
    )
    const uploaded = screen.getByRole('region', { name: 'Yüklenen Evraklar' })
    expect(within(uploaded).queryByText('kolon.dwg')).not.toBeInTheDocument()
  })

  it('evrak tipi ve birim seçilmeden kayıt tamamlanmaz', async () => {
    const user = userEvent.setup()
    renderPage()

    await addFiles(user, [buildFile('ruhsat.pdf')])
    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    expect(
      await screen.findByText('Evrak tipi seçilmeden kayıt tamamlanamaz.'),
    ).toBeInTheDocument()
    expect(screen.getByText('En az bir birim seçilmelidir.')).toBeInTheDocument()
    // Yönlendirme olmamalı: kayıt tamamlanmadı.
    expect(screen.getByRole('heading', { name: 'Evrak Ekle' })).toBeInTheDocument()
  })

  it('"Tümünü Seç" projenin bütün birimlerini işaretler', async () => {
    const user = userEvent.setup()
    renderPage()

    await addFiles(user, [buildFile('ruhsat.pdf')])

    const unitGroup = await screen.findByRole('group', { name: 'Birimler' })
    const boxes = within(unitGroup).getAllByRole('checkbox')
    await user.click(boxes[0])

    for (const box of boxes) expect(box).toBeChecked()
  })

  it('kaydedince evrak listeye girer ve proje detayına bildirimle dönülür', async () => {
    const user = userEvent.setup()
    renderPage()

    await addFiles(user, [buildFile('ruhsat.pdf')])
    await user.selectOptions(await screen.findByLabelText('Evrak Tipi'), 'ruhsat')

    const unitGroup = screen.getByRole('group', { name: 'Birimler' })
    await user.click(within(unitGroup).getAllByRole('checkbox')[0])

    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    expect(await screen.findByText('Evrak başarıyla yüklendi.')).toBeInTheDocument()
    // Kalıcı olmadığı SÖYLENMELİ: kayıt sunucuya gitmiyor (karar 12).
    expect(screen.getByText(/sunucuya yazılmadı/)).toBeInTheDocument()
    expect(screen.getByText(/Sayfa yenilenince yüklenen evraklar listeden düşer/)).toBeInTheDocument()

    const saved = getMockDocuments().filter((document) => document.fileName === 'ruhsat.pdf')
    expect(saved).toHaveLength(1)
    expect(saved[0].projectId).toBe(PROJECT_ID)
    expect(saved[0].docTypeCode).toBe('ruhsat')
    expect(saved[0].unitNames.length).toBeGreaterThan(0)
  })

  it('satır kaldırılınca listeden düşer', async () => {
    const user = userEvent.setup()
    renderPage()

    await addFiles(user, [buildFile('ruhsat.pdf'), buildFile('police.pdf')])
    await user.click(
      await screen.findByRole('button', { name: 'ruhsat.pdf dosyasını listeden kaldır' }),
    )

    await waitFor(() => expect(screen.queryByText('ruhsat.pdf')).not.toBeInTheDocument())
    expect(screen.getByText('police.pdf')).toBeInTheDocument()
  })

  it('"Proje Evrakları" sekmesinden mevcut evrak yeniden ilişkilendirilebilir', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('tab', { name: 'Proje Evrakları' }))

    const addButtons = await screen.findAllByRole('button', { name: /dosyasını listeye ekle/ })
    await user.click(addButtons[0])

    const uploaded = screen.getByRole('region', { name: 'Yüklenen Evraklar' })
    expect(within(uploaded).getAllByRole('combobox')).toHaveLength(1)
  })
})
