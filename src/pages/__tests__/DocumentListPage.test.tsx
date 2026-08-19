import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DOCUMENT_PAGE_SIZE, type DocumentRow } from '../../api/documents'
import { resetMockDocuments } from '../../api/documentsMock'
import { DocumentListPage } from '../DocumentListPage'

const listDocuments = vi.hoisted(() => vi.fn())
const deleteDocument = vi.hoisted(() => vi.fn())

vi.mock('../../api/documents', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/documents')>()),
  listDocuments,
  deleteDocument,
}))

const TODAY = `${new Date().toISOString().slice(0, 10)}T09:00:00.000Z`

function buildDocument(overrides: Partial<DocumentRow> = {}): DocumentRow {
  return {
    id: 1,
    fileName: 'musteri-sozlesmesi.pdf',
    docTypeCode: 'musteriSozlesmesi',
    receivedAt: TODAY,
    unitNames: ['Kolon', 'DMUST'],
    projectId: 4,
    projectName: 'Çınar Sitesi',
    projectPId: '200011555',
    projectFirmId: 11,
    installationNo: '3101752034',
    firmName: 'Anadolu Mühendislik Ltd. Şti.',
    gasFirmName: 'Başkent Doğalgaz Dağıtım A.Ş.',
    sizeBytes: 2048,
    uploadedByName: 'AHMET AKBAYIR',
    contentType: 'application/pdf',
    url: null,
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
      <MemoryRouter initialEntries={['/admin/documents']}>
        <Routes>
          <Route
            path="/admin/documents"
            element={
              <>
                <DocumentListPage />
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
function asMock(items: DocumentRow[]) {
  return {
    source: 'mock' as const,
    data: { items, totalCount: items.length, page: 1, pageSize: DOCUMENT_PAGE_SIZE },
  }
}

beforeEach(() => {
  resetMockDocuments()
  listDocuments.mockResolvedValue(asMock([buildDocument()]))
  deleteDocument.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('DocumentListPage', () => {
  it('başlıkta adet, altında açıklama ve kırılım gösterir', async () => {
    renderPage()

    // Adet veri gelmeden "…" gösteriliyor; bekleyen hâl geçtikten sonra bakılır.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Evraklar/ })).toHaveTextContent('(1)'),
    )
    expect(screen.getByText('Tüm projelere ait yüklenmiş evraklar')).toBeInTheDocument()
    expect(screen.getByText('Proje Evrakları')).toBeInTheDocument()
  })

  /** Silme ONAYDAN sonra: düğmeye basmak tek başına satırı düşürmemeli. */
  it('"Sil" önce onay sorar, onaylanınca satırı düşürür', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Sil' }))
    expect(deleteDocument).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Sil' }))

    await waitFor(() => expect(deleteDocument).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Evrak silindi.')).toBeInTheDocument()
  })

  it('vazgeçilince silme isteği atılmaz', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Sil' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Vazgeç' }),
    )

    expect(deleteDocument).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // Belgedeki iki sekmeden "Favoriler" kapsam dışı; tek sekme kalınca şerit
  // tümüyle kaldırıldı.
  it('sekme çubuğu göstermez', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('satırı belgedeki sütun sırasıyla çizer, rozet koymaz', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.trim())

    expect(headers).toEqual([
      'No',
      'Evrak Adı',
      'Evrak Tipi',
      'Geliş Tarihi',
      'Birim',
      'Proje Adı',
      'ProjeId',
      'Tesisat No',
      'Firma Adı',
      'G.D Firması',
      'Aksiyonlar',
    ])
    expect(within(table).getByText('Müşteri Sözleşmesi')).toBeInTheDocument()
    expect(within(table).getByText('Kolon, DMUST')).toBeInTheDocument()
    expect(within(table).queryByText('PDF')).not.toBeInTheDocument()
  })

  it('yalnız proje adı bağlantılı; firma sütunları düz metin', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    const links = within(table).getAllByRole('link')

    expect(links).toHaveLength(1)
    expect(links[0]).toHaveTextContent('Çınar Sitesi')
    expect(links[0]).toHaveAttribute('href', '/projects/4')
  })

  it('kaynağı olmayan evrağın adı bağlantı DEĞİL', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    expect(
      within(table).queryByRole('link', { name: 'musteri-sozlesmesi.pdf' }),
    ).not.toBeInTheDocument()
    expect(within(table).getByText('musteri-sozlesmesi.pdf')).toBeInTheDocument()
  })

  it('görüntülenebilir dosya yeni sekmede açılır, diğeri indirilir', async () => {
    listDocuments.mockResolvedValue(
      asMock([
        buildDocument({ id: 1, fileName: 'plan.pdf', url: 'blob:pdf' }),
        buildDocument({
          id: 2,
          fileName: 'cizim.alp',
          contentType: 'application/octet-stream',
          url: 'blob:alp',
        }),
      ]),
    )

    renderPage()

    const viewable = await screen.findByRole('link', { name: 'plan.pdf' })
    expect(viewable).toHaveAttribute('target', '_blank')
    expect(viewable).toHaveAttribute('rel', 'noopener noreferrer')

    const downloadable = screen.getByRole('link', { name: 'cizim.alp' })
    expect(downloadable).not.toHaveAttribute('target')
    expect(downloadable).toHaveAttribute('download', 'cizim.alp')
  })

  it('filtre uygulanınca kriterler URL\'e yazılır ve sayfa 1\'e döner', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    await user.selectOptions(screen.getByLabelText('Döküman Tipi'), 'ruhsat')
    await user.type(screen.getByLabelText('Evrak adında ara'), 'ruhsat')
    await user.click(screen.getByRole('button', { name: /Filtrele/ }))

    await waitFor(() => {
      const search = screen.getByTestId('search').textContent ?? ''
      expect(search).toContain('type=ruhsat')
      expect(search).toContain('q=ruhsat')
      expect(search).not.toContain('page=')
    })
  })

  it('kaynak yoksa tablo yerine "sunucuya bağlı değil" kutusu çıkar', async () => {
    listDocuments.mockResolvedValue({ source: 'unavailable', data: null })

    renderPage()

    expect(await screen.findByText(/veri kaynağı henüz yok/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('geliştirmede kalıcı mock uyarısı gösterir', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(screen.getByText(/bazı veriler sunucudan gelmiyor/)).toBeInTheDocument()
  })

  it('varsayılan tarih aralığı adrese YAZILMAZ ama uca gider', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(screen.getByTestId('search').textContent).toBe('')

    const query = listDocuments.mock.calls[0][0] as { dateFrom: string; pageSize: number }
    expect(query.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(query.pageSize).toBe(30)
  })
})
