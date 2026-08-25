import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NewDocumentPage } from '../NewDocumentPage'
import { ProjectDetailPage } from '../ProjectDetailPage'

/** Kod grubu ucunun yanıtı; etiket çözümü buna bakıyor. */
const saveProjectDocuments = vi.hoisted(() => vi.fn())
const listProjectDocuments = vi.hoisted(() => vi.fn())

vi.mock('../../api/documents', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/documents')>()),
  saveProjectDocuments,
  listProjectDocuments,
}))

const documentTypes = vi.hoisted(() => [
  { id: 5015, code: 'CustomerAgreement', label: 'Müşteri Sözleşmesi' },
  { id: 5013, code: 'GeneralDocument', label: 'Genel Evrak' },
  { id: 5019, code: 'License', label: 'Ruhsat' },
])

vi.mock('../../api/documentTypes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/documentTypes')>()),
  getDocumentTypes: () => Promise.resolve(documentTypes),
}))

/** Ekranın bağlandığı proje; künyesi gerçek uçtan (`GET /api/projects/{id}`) gelir. */
const PROJECT_ID = 1
const PROJECT_NAME = 'Demo Doğalgaz Projesi'

/** `GET /api/projects/{id}/units` yanıtı; birim onay kutuları buradan geliyor. */
/** "Proje Evrakları" sekmesindeki satır; dosya yeniden yüklenmiyor. */
const EXISTING_DOCUMENT = {
  id: 91,
  fileName: 'onceki-ruhsat.pdf',
  docTypeCodeId: 5019,
  docTypeName: 'Ruhsat',
  receivedAt: '2026-07-01T09:00:00.000Z',
  unitNames: ['D20'],
  unitIds: [71],
  projectId: 1,
  projectName: 'Demo Doğalgaz Projesi',
  projectPId: null,
  projectFirmId: null,
  installationNo: null,
  firmName: null,
  gasFirmName: null,
  sizeBytes: 1024,
  uploadedByName: null,
  contentType: 'application/pdf',
}

const PROJECT_UNITS = [
  { id: 1, unitNumber: 'D20', devices: [] },
  { id: 2, unitNumber: 'D21', devices: [] },
]

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

/**
 * Gizli dosya girdisine doğrudan yazmak, sürükle-bırak taklidinden sade.
 * `findBy…`: proje künyesi artık gerçek uçtan geliyor, form o istek dönmeden
 * çizilmiyor.
 */
async function addFiles(user: ReturnType<typeof userEvent.setup>, files: File[]) {
  await user.upload(await screen.findByLabelText('Yüklenecek dosyaları seçin'), files)
}

beforeEach(() => {
  saveProjectDocuments.mockResolvedValue({ savedCount: 1 })
  listProjectDocuments.mockResolvedValue({ source: 'server', data: [] })
  // Ekran İKİ uca gidiyor: proje künyesi ve birim listesi. Yanıt yola göre
  // seçiliyor ve HER ÇAĞRIDA yeniden kuruluyor — tek bir `Response`
  // paylaşılsaydı gövdesi ilk okumada tükenir, ikinci ekran boş yanıt görürdü.
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/units')
        ? PROJECT_UNITS
        : {
            id: PROJECT_ID,
            name: PROJECT_NAME,
            createdAt: '2026-07-01T09:00:00.000Z',
            updatedAt: '2026-07-01T09:00:00.000Z',
          }

      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }),
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
    await user.selectOptions(await screen.findByLabelText('Evrak Tipi'), '5019')

    const unitGroup = screen.getByRole('group', { name: 'Birimler' })
    await user.click(within(unitGroup).getAllByRole('checkbox')[0])

    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    expect(await screen.findByText('Evrak başarıyla yüklendi.')).toBeInTheDocument()
    // Kayıt SUNUCUDA: "kalıcı değil" uyarısı kalktı.
    expect(screen.queryByText(/sunucuya yazılmadı/)).not.toBeInTheDocument()

    // Tip ve birim KİMLİKLE gidiyor; uç kod metni ya da birim adı kabul etmiyor.
    // İşaretlenen kutu "Tümünü Seç" olduğu için iki birim de gidiyor.
    expect(saveProjectDocuments).toHaveBeenCalledWith(PROJECT_ID, [
      expect.objectContaining({
        docTypeCodeId: 5019,
        unitIds: PROJECT_UNITS.map((unit) => unit.id),
      }),
    ])
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

  /**
   * Sekme bir süre SEÇİCİYDİ: var olan evrağı yükleme listesine ekleyip başka
   * birimlerle yeniden ilişkilendiriyordu. O akış kalktı — burada yalnız
   * DÜZENLEME var.
   */
  it('"Proje Evrakları" sekmesi projenin evraklarını birim ve eylemlerle listeler', async () => {
    const user = userEvent.setup()
    listProjectDocuments.mockResolvedValue({
      source: 'server',
      data: [EXISTING_DOCUMENT],
    })
    renderPage()

    await user.click(await screen.findByRole('tab', { name: 'Proje Evrakları' }))

    const table = await screen.findByRole('table', { name: /birimini değiştirebilir/ })
    expect(within(table).getByText('onceki-ruhsat.pdf')).toBeInTheDocument()
    expect(within(table).getByText('D20')).toBeInTheDocument()
    expect(within(table).getByRole('button', { name: 'Birim Değiştir' })).toBeInTheDocument()
    expect(within(table).getByRole('button', { name: 'Sil' })).toBeInTheDocument()
    // "Listeye ekle" akışı KALKTI.
    expect(screen.queryByRole('button', { name: /listeye ekle/ })).not.toBeInTheDocument()
  })

  it('"Sil" önce onay sorar', async () => {
    const user = userEvent.setup()
    listProjectDocuments.mockResolvedValue({
      source: 'server',
      data: [EXISTING_DOCUMENT],
    })
    renderPage()

    await user.click(await screen.findByRole('tab', { name: 'Proje Evrakları' }))
    const table = await screen.findByRole('table', { name: /birimini değiştirebilir/ })
    await user.click(within(table).getByRole('button', { name: 'Sil' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('Evrak silinsin mi?')
  })
})
