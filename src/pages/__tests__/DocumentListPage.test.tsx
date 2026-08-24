import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setAuthSession, type AuthSession } from '../../api/authToken'
import { DOCUMENT_PAGE_SIZE, type DocumentRow } from '../../api/documents'
import { ROLE_CODES } from '../../api/roles'
import { DocumentListPage } from '../DocumentListPage'

/** Kod grubu ucunun yanıtı; etiket çözümü buna bakıyor. */
const documentTypes = vi.hoisted(() => [
  { id: 5015, code: 'CustomerAgreement', label: 'Müşteri Sözleşmesi' },
  { id: 5013, code: 'GeneralDocument', label: 'Genel Evrak' },
  { id: 5019, code: 'License', label: 'Ruhsat' },
])

vi.mock('../../api/documentTypes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/documentTypes')>()),
  getDocumentTypes: () => Promise.resolve(documentTypes),
}))

const listDocuments = vi.hoisted(() => vi.fn())
const deleteDocument = vi.hoisted(() => vi.fn())
const getDocumentDownloadUrl = vi.hoisted(() => vi.fn())

vi.mock('../../api/documents', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/documents')>()),
  listDocuments,
  deleteDocument,
  getDocumentDownloadUrl,
}))

const TODAY = `${new Date().toISOString().slice(0, 10)}T09:00:00.000Z`

function buildDocument(overrides: Partial<DocumentRow> = {}): DocumentRow {
  return {
    id: 1,
    fileName: 'musteri-sozlesmesi.pdf',
    docTypeCodeId: 5015,
    docTypeName: 'Müşteri Sözleşmesi',
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
  listDocuments.mockResolvedValue(asMock([buildDocument()]))
  deleteDocument.mockResolvedValue({ ok: true })
})

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
  vi.clearAllMocks()
})

describe('DocumentListPage', () => {
  it('başlıkta adet, altında açıklama ve kırılım gösterir', async () => {
    renderPage()

    // Adet veri gelmeden "…" gösteriliyor; bekleyen hâl geçtikten sonra bakılır.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Evraklar/ })).toHaveTextContent('(1)'),
    )
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

  /**
   * Adres satırda DEĞİL: `GET /api/docs/{id}/download` süreli bir adres
   * üretiyor ve her satır için önden istemek süresi dolmuş adresler bırakırdı.
   * Bu yüzden ad bir düğme ve adres tıklanınca alınıyor.
   */
  it('görüntülenebilir dosya yeni sekmede açılır', async () => {
    const user = userEvent.setup()
    const open = vi.fn()
    vi.stubGlobal('open', open)
    getDocumentDownloadUrl.mockResolvedValue('https://depo/plan.pdf')
    listDocuments.mockResolvedValue(asMock([buildDocument({ id: 1, fileName: 'plan.pdf' })]))

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'plan.pdf' }))

    expect(getDocumentDownloadUrl).toHaveBeenCalledWith(1)
    expect(open).toHaveBeenCalledWith('https://depo/plan.pdf', '_blank', 'noopener,noreferrer')

    vi.unstubAllGlobals()
  })

  it('filtre uygulanınca kriterler URL\'e yazılır ve sayfa 1\'e döner', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table')

    // Seçim ANINDA uygulanıyor ("Filtrele" kalktı). Arama kutusu YOK: uç
    // arama parametresi almıyor ve sayfalı listede istemci araması yalnız
    // görünen sayfayı süzerdi.
    await user.selectOptions(screen.getByLabelText('Döküman Tipi'), 'License')

    await waitFor(() => {
      const search = screen.getByTestId('search').textContent ?? ''
      expect(search).toContain('type=License')
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

/**
 * Evrak ekranının VERİSİ hâlâ mock (sunucuda `GET /api/docs` ucuna bağlı bir
 * istemci yok); burada sınanan rol ayrımı, yani yönetim ALANLARININ
 * çizilmemesi. Kapsam yine sunucunun işi.
 */
describe('DocumentListPage (proje firması kullanıcısı)', () => {
  it('firma sütunlarını ve firma süzgecini göstermez', async () => {
    renderPage(ROLE_CODES.projectFirmUser)
    await screen.findByRole('table')

    expect(screen.queryByRole('columnheader', { name: 'Firma Adı' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'G.D Firması' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Proje Firması')).not.toBeInTheDocument()

    // Evrakın kendi alanları duruyor.
    expect(screen.getByRole('columnheader', { name: 'Evrak Adı' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Evrak Tipi' })).toBeInTheDocument()
  })

  it('yönetici aynı ekranda firma sütunlarını görmeye devam eder', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(screen.getByRole('columnheader', { name: 'Firma Adı' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'G.D Firması' })).toBeInTheDocument()
    expect(screen.getByLabelText('Proje Firması')).toBeInTheDocument()
  })

  /**
   * Evrak SİLME sunucuda `Admin, ProjectFirmUser`'a açık
   * (`DELETE /api/docs/{id}`); okuma uçları rol kısıtı taşımıyor. Gaz dağıtım
   * kullanıcısı evrağı görür, silemez.
   */
  it('evrakları görüntüleyebilir', async () => {
    renderPage(ROLE_CODES.gasDistributionUser)

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Evrak Adı' })).toBeInTheDocument()
  })

  it('Sil aksiyonunu göstermez', async () => {
    renderPage(ROLE_CODES.gasDistributionUser)
    await screen.findByRole('table')

    expect(screen.queryByRole('button', { name: 'Sil' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Aksiyonlar' })).not.toBeInTheDocument()
  })

  it('yönetici aynı ekranda Sil aksiyonunu görmeye devam eder', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(screen.getByRole('button', { name: 'Sil' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Aksiyonlar' })).toBeInTheDocument()
  })
})
