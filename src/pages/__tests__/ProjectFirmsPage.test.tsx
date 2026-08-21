import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectFirmAuthorizationRef } from '../../api/projectFirmAuthorizations'
import { PROJECT_FIRM_PAGE_SIZE, type ProjectFirm } from '../../api/projectFirms'
import { ProjectFirmsPage } from '../ProjectFirmsPage'

const listApi = vi.hoisted(() => ({ getProjectFirmList: vi.fn() }))
const authorizationApi = vi.hoisted(() => ({ getEffectiveAuthorizations: vi.fn() }))
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirms')>()),
  ...listApi,
}))

vi.mock('../../api/projectFirmAuthorizations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmAuthorizations')>()),
  ...authorizationApi,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

const LIST_PATH = '/admin/project-firms'

function buildFirm(overrides: Partial<ProjectFirm> = {}): ProjectFirm {
  return {
    id: 1,
    name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
    authorizedPerson: 'Ahmet Yılmaz',
    email: 'bilgi@adana.com.tr',
    phone: '05321000000',
    taxNumber: '1234567890',
    ...overrides,
  }
}

/** Sayfaya YÜRÜRLÜKTEKİ satırlar geliyor; süre süzgeci api katmanında. */
function buildAuthorization(
  overrides: Partial<ProjectFirmAuthorizationRef> = {},
): ProjectFirmAuthorizationRef {
  return {
    id: 1,
    projectFirmId: 1,
    projectFirmName: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
    gasDistributionFirmId: 101,
    gasDistributionFirmName: 'Başkentgaz',
    validFrom: '2026-01-01T00:00:00Z',
    validTo: null,
    ...overrides,
  }
}

function renderPage({
  firms = [buildFirm()],
  authorizations = [] as ProjectFirmAuthorizationRef[],
  isAdmin = true,
  route = LIST_PATH,
} = {}) {
  listApi.getProjectFirmList.mockResolvedValue(firms)
  authorizationApi.getEffectiveAuthorizations.mockResolvedValue(authorizations)
  useIsAdmin.mockReturnValue(isAdmin)

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <ProjectFirmsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Tablo gelene kadar bekler; sorgu asenkron çözülüyor. */
async function findTable() {
  return screen.findByRole('table')
}

/** Belgedeki sekiz veri sütunu; "İşlemler" bunlara YETKİLİYSE eklenir. */
/** Seri No, Yeter No ve Gsm sütunları kaldırıldı (K102). */
const DATA_COLUMN_LABELS = ['Firma Adı', 'G.D. Firması', 'Yetkili', 'E-Mail', 'Telefon']

/** Sütun kaymalarını elle saymamak için; "G.D. Firması" ikinci hücre. */
const GAS_FIRM_CELL_INDEX = 1

async function readHeaders(): Promise<(string | undefined)[]> {
  const table = await findTable()
  return within(table)
    .getAllByRole('columnheader')
    .map((header) => header.textContent?.trim())
}

afterEach(() => {
  vi.clearAllMocks()
})

// KK-1: kırılım, başlık + adet, açıklama, sütun sırası, sağ üst düğmeler.
describe('ekran açılışı', () => {
  it('başlık, kırılım ve açıklamayı gösterir', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: /Proje Firmaları/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Konum')).toHaveTextContent('Anasayfa')
  })

  it('sütunları belgedeki sırayla listeler', async () => {
    renderPage()

    expect(await readHeaders()).toEqual([...DATA_COLUMN_LABELS, 'İşlemler'])
  })

  it('yetkisiz kullanıcıda İşlemler sütunu hiç çizilmez', async () => {
    renderPage({ isAdmin: false })

    expect(await readHeaders()).toEqual(DATA_COLUMN_LABELS)
  })

  it('arama alanı ve iki düğme sağ üstte yer alır', async () => {
    renderPage()
    await findTable()

    expect(screen.getByLabelText('Firma adında ara')).toHaveAttribute('placeholder', 'Firma Adı')
    expect(screen.getByRole('button', { name: 'Filtrele' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Yeni Proje Firması/ })).toBeInTheDocument()
  })

  it('adedi tr-TR binlik ayracıyla yazar', async () => {
    const firms = Array.from({ length: 1234 }, (_unused, index) =>
      buildFirm({ id: index + 1, name: `Firma ${index}` }),
    )
    renderPage({ firms })
    // Adet veri gelene kadar "…" gösteriyor; tablo çizilince sayı kesinleşir.
    await findTable()

    // Erişilebilir ad metin düğümleri arasına boşluk koyduğu için ("( 1.234 )")
    // ada değil, düğümün metnine bakılıyor.
    expect(screen.getByRole('heading', { name: /Proje Firmaları/ })).toHaveTextContent(
      'Proje Firmaları (1.234)',
    )
  })

  it('yönetici olmayana ekleme düğmesini göstermez', async () => {
    renderPage({ isAdmin: false })
    await findTable()

    expect(screen.queryByRole('link', { name: /Yeni Proje Firması/ })).not.toBeInTheDocument()
  })
})

describe('satır içeriği', () => {
  it('firma adını güncelleme ekranına bağlar', async () => {
    renderPage({ firms: [buildFirm({ id: 42 })] })
    await findTable()

    expect(screen.getByRole('link', { name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.' })).toHaveAttribute(
      'href',
      '/admin/project-firms/42',
    )
  })

  it('e-posta ve telefonu ilgili uygulamaya bağlar', async () => {
    renderPage()
    await findTable()

    expect(screen.getByRole('link', { name: 'bilgi@adana.com.tr' })).toHaveAttribute(
      'href',
      'mailto:bilgi@adana.com.tr',
    )
    expect(screen.getByRole('link', { name: '0532 100 00 00' })).toHaveAttribute(
      'href',
      'tel:05321000000',
    )
  })

  /**
   * Uçtan gelmeyen bağ G.D. Firması; hücre boş bırakılmaz, ortak
   * `EmptyValue` deseni çizilir (bkz. api/projectFirmDto.ts). Dördüncü hücre
   * (G.D. Firması) burada yetkisi olmadığı için boş — alan artık uçtan geliyor.
   */
  /**
   * Hep boş olan üç sütun kalktı (K102); geriye kalan tek boş hücre, yetkisi
   * olmayan firmanın G.D. Firması sütunu.
   */
  it('yetkisi olmayan satırda boş değer gösterir', async () => {
    renderPage()
    const table = await findTable()

    const cells = within(table).getAllByRole('cell')
    // İşaret `aria-hidden`; ekran okuyucuya okunan karşılığı sınanıyor.
    expect(within(cells[GAS_FIRM_CELL_INDEX]).getByText('Değer yok')).toBeInTheDocument()
  })

  it('kaldırılan sütunlar hiç çizilmez', async () => {
    renderPage()
    const headers = await readHeaders()

    expect(headers).not.toContain('Seri No')
    expect(headers).not.toContain('Yeter No')
    expect(headers).not.toContain('Gsm')
  })
})

/**
 * G.D. firması bağı AYRI uçtan (`/api/project-firm-authorizations`) geliyor ve
 * satır başına BİRDEN FAZLA olabiliyor.
 */
describe('G.D. firması sütunu', () => {
  it('yetkili olunan firmayı güncelleme ekranına bağlar', async () => {
    renderPage({ authorizations: [buildAuthorization()] })
    await findTable()

    expect(screen.getByRole('link', { name: 'Başkentgaz' })).toHaveAttribute(
      'href',
      '/admin/gas-distribution-firms/101',
    )
  })

  it('birden fazla yetkinin firmasını alt alta listeler', async () => {
    renderPage({
      authorizations: [
        buildAuthorization({ id: 1, gasDistributionFirmId: 101, gasDistributionFirmName: 'Doğugaz' }),
        buildAuthorization({ id: 2, gasDistributionFirmId: 102, gasDistributionFirmName: 'Çorumgaz' }),
      ],
    })
    const table = await findTable()

    // Sıralama Türkçe: 'Ç' 'D'den ÖNCE gelmeli.
    const names = within(within(table).getAllByRole('cell')[GAS_FIRM_CELL_INDEX])
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(names).toEqual(['Çorumgaz', 'Doğugaz'])
  })

  it('aynı çift için yenilenmiş iki yetkiyi tek satıra indirir', async () => {
    renderPage({
      authorizations: [
        buildAuthorization({ id: 1, validFrom: '2025-01-01T00:00:00Z' }),
        buildAuthorization({ id: 2, validFrom: '2026-01-01T00:00:00Z' }),
      ],
    })
    const table = await findTable()

    expect(
      within(within(table).getAllByRole('cell')[GAS_FIRM_CELL_INDEX]).getAllByRole('listitem'),
    ).toHaveLength(1)
  })

  /** Yetkisi olmayan firma listeden DÜŞMEZ; iç birleştirme yapılsaydı düşerdi. */
  it('yetkisi olmayan firmayı listede tutar', async () => {
    renderPage({
      firms: [buildFirm({ id: 1, name: 'Yetkisiz Mühendislik' })],
      authorizations: [buildAuthorization({ projectFirmId: 99 })],
    })
    const table = await findTable()

    expect(screen.getByText('Yetkisiz Mühendislik')).toBeInTheDocument()
    expect(
      within(within(table).getAllByRole('cell')[GAS_FIRM_CELL_INDEX]).getByText('Değer yok'),
    ).toBeInTheDocument()
  })

  /** Sütun boş kalınca "hiç yetkisi yok" gibi okunur; şerit farkı söylüyor. */
  it('bağ çekilemezse uyarı şeridi gösterir', async () => {
    listApi.getProjectFirmList.mockResolvedValue([buildFirm()])
    authorizationApi.getEffectiveAuthorizations.mockRejectedValue(new Error('kopuk'))
    useIsAdmin.mockReturnValue(true)

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[LIST_PATH]}>
          <ProjectFirmsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/G.D. Firması. sütunu boş görünüyor/)).toBeInTheDocument()
  })
})

// KK-2: arama sunucu değil istemci tarafında ama davranış aynı görünmeli.
describe('arama', () => {
  it('yazılan ünvana göre süzer ve adedi günceller', async () => {
    const user = userEvent.setup()
    renderPage({
      firms: [
        buildFirm({ id: 1, name: 'ADANA MÜHENDİSLİK' }),
        buildFirm({ id: 2, name: 'BOLU PROJE' }),
      ],
    })
    await findTable()

    await user.type(screen.getByLabelText('Firma adında ara'), 'bolu')

    // Arama debounce'lu: eşleşmeyen satır hemen değil, yazım durulunca düşer.
    await waitFor(() => {
      expect(screen.queryByText('ADANA MÜHENDİSLİK')).not.toBeInTheDocument()
    })
    expect(screen.getByText('BOLU PROJE')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Proje Firmaları/ })).toHaveTextContent(
      'Proje Firmaları (1)',
    )
  })

  it('eşleşme yoksa kriteri değiştirmeyi öneren boş durum gösterir', async () => {
    const user = userEvent.setup()
    renderPage()
    await findTable()

    await user.type(screen.getByLabelText('Firma adında ara'), 'yok böyle bir firma')

    expect(await screen.findByText(/kriteri değiştirip tekrar deneyin/i)).toBeInTheDocument()
  })

  it('arama listeyi yeniden ÇEKMEZ, yalnız yeniden süzer', async () => {
    const user = userEvent.setup()
    renderPage()
    await findTable()

    await user.type(screen.getByLabelText('Firma adında ara'), 'adana')
    await screen.findByText('ADANA MÜHENDİSLİK LTD. ŞTİ.')

    expect(listApi.getProjectFirmList).toHaveBeenCalledTimes(1)
  })
})

// KK-6: sayfa başına 30 kayıt, alttaki bilgi metni güncellenir.
describe('sayfalama', () => {
  const manyFirms = Array.from({ length: 65 }, (_unused, index) =>
    buildFirm({ id: index + 1, name: `Firma ${String(index + 1).padStart(3, '0')}` }),
  )

  it('ilk sayfada 30 kayıt gösterir', async () => {
    renderPage({ firms: manyFirms })
    const table = await findTable()

    expect(within(table).getAllByRole('row')).toHaveLength(PROJECT_FIRM_PAGE_SIZE + 1)
  })

  it('kayıt aralığını yazar', async () => {
    renderPage({ firms: manyFirms })
    await findTable()

    expect(screen.getByText(/65 kayıttan 1-30 arası gösteriliyor/)).toBeInTheDocument()
  })

  it('sayfa değişince aralık metni güncellenir', async () => {
    const user = userEvent.setup()
    renderPage({ firms: manyFirms })
    await findTable()

    await user.click(screen.getByRole('button', { name: 'Sayfa 2' }))

    expect(await screen.findByText(/65 kayıttan 31-60 arası gösteriliyor/)).toBeInTheDocument()
  })

  it('adresteki sayfa numarasıyla açılır', async () => {
    renderPage({ firms: manyFirms, route: `${LIST_PATH}?page=3` })
    await findTable()

    expect(screen.getByText(/65 kayıttan 61-65 arası gösteriliyor/)).toBeInTheDocument()
  })
})

// KK-3: düğme kriter alanını açar.
describe('filtre alanı', () => {
  it('Filtrele tıklanınca kriter alanı açılır', async () => {
    const user = userEvent.setup()
    renderPage()
    await findTable()

    // Buradaki "Filtrele" bir UYGULAMA düğmesi değil, kriter alanını AÇAN
    // düğme — kriterler zaten seçildiği anda uygulanıyor.
    await user.click(screen.getByRole('button', { name: 'Filtrele' }))

    // "Bölge" kutusu kaldırıldı (K31); kalan iki kriter hâlâ pasif.
    const panel = screen.getByRole('region', { name: 'Ek filtre kriterleri' })
    expect(within(panel).getByLabelText('G.D. Firması')).toBeDisabled()
    expect(within(panel).getByLabelText('Yeterlilik Durumu')).toBeDisabled()
    expect(within(panel).queryByLabelText('Bölge')).not.toBeInTheDocument()
  })

  it('kriter alanı kapatılabilir', async () => {
    const user = userEvent.setup()
    renderPage()
    await findTable()
    await user.click(screen.getByRole('button', { name: 'Filtrele' }))
    await user.click(screen.getByRole('button', { name: 'Filtre alanını kapat' }))

    expect(screen.queryByRole('region', { name: 'Ek filtre kriterleri' })).not.toBeInTheDocument()
  })
})

describe('hata durumu', () => {
  it('liste yüklenemezse hata kutusu ve yeniden dene düğmesi çıkar', async () => {
    listApi.getProjectFirmList.mockRejectedValue(new Error('Sunucuya ulaşılamadı.'))
    authorizationApi.getEffectiveAuthorizations.mockResolvedValue([])
    useIsAdmin.mockReturnValue(true)

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[LIST_PATH]}>
          <ProjectFirmsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Proje firması listesi yüklenemedi.')
  })
})
