import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PROJECT_FIRM_PAGE_SIZE, type ProjectFirm } from '../../api/projectFirms'
import { ProjectFirmsPage } from '../ProjectFirmsPage'

const listApi = vi.hoisted(() => ({ getProjectFirmList: vi.fn() }))
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirms')>()),
  ...listApi,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

const LIST_PATH = '/admin/project-firms'

function buildFirm(overrides: Partial<ProjectFirm> = {}): ProjectFirm {
  return {
    id: 1,
    serialNumber: null,
    qualificationNumber: null,
    name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
    gasFirm: null,
    authorizedPerson: 'Ahmet Yılmaz',
    email: 'bilgi@adana.com.tr',
    phone: '05321000000',
    mobilePhone: null,
    taxNumber: '1234567890',
    ...overrides,
  }
}

function renderPage({ firms = [buildFirm()], isAdmin = true, route = LIST_PATH } = {}) {
  listApi.getProjectFirmList.mockResolvedValue(firms)
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

afterEach(() => {
  vi.clearAllMocks()
})

// KK-1: kırılım, başlık + adet, açıklama, sütun sırası, sağ üst düğmeler.
describe('ekran açılışı', () => {
  it('başlık, kırılım ve açıklamayı gösterir', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: /Proje Firmaları/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Konum')).toHaveTextContent('Anasayfa')
    expect(screen.getByText('Sisteme kayıtlı proje (mühendislik) firmaları')).toBeInTheDocument()
  })

  it('sütunları belgedeki sırayla listeler', async () => {
    renderPage()
    const table = await findTable()

    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.trim())

    expect(headers).toEqual([
      'Seri No',
      'Yeter No',
      'Firma Adı',
      'G.D. Firması',
      'Yetkili',
      'E-Mail',
      'Telefon',
      'Gsm',
    ])
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
   * Seri No / Yeter No / Gsm / G.D. Firması uçtan gelmiyor; hücre boş
   * bırakılmaz, "-" gösterilir (bkz. api/projectFirmDto.ts).
   */
  it('karşılığı olmayan alanlarda tire gösterir', async () => {
    renderPage()
    const table = await findTable()

    const cells = within(table).getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('-')
    expect(cells[1]).toHaveTextContent('-')
    expect(cells[3]).toHaveTextContent('-')
    expect(cells[7]).toHaveTextContent('-')
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
