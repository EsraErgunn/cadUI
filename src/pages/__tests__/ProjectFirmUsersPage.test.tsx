import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildPage,
  buildRow,
  renderWithProviders,
} from './projectFirmUserFixture'
import { PROJECT_FIRM_USER_CREATE_PATH } from '../../ui/admin/adminNavItems'
import { ProjectFirmUsersPage } from '../ProjectFirmUsersPage'

const listApi = vi.hoisted(() => ({ getProjectFirmUserList: vi.fn() }))
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectFirmUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmUsers')>()),
  ...listApi,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

function renderPage({ rows = [buildRow()], total = 1, isAdmin = true, route = undefined } = {}) {
  listApi.getProjectFirmUserList.mockResolvedValue(buildPage(rows, { totalCount: total }))
  useIsAdmin.mockReturnValue(isAdmin)

  return renderWithProviders({ route, children: <ProjectFirmUsersPage /> })
}

afterEach(() => {
  vi.clearAllMocks()
})

// K51: kullanıcı satırları uydurma; ekran bunu kalıcı bir şeritle SÖYLEMEK
// zorunda, üretimde ise tablo yerine "kaynağı yok" kutusu çıkar.
describe('veri kaynağı uyarısı (K51)', () => {
  it('mock satırlarda kalıcı uyarı şeridi gösterir', async () => {
    renderPage()
    await screen.findByRole('table')

    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent('Bu ekrandaki bazı veriler sunucudan gelmiyor.')
    expect(notice).toHaveTextContent('Kullanıcı satırları')
    // Şerit KAPATILAMAZ: uyarıyı bir kez kapatıp sahte kaydı gerçek sanmak
    // bu ekranın en bilinen başarısızlığı olurdu.
    expect(within(notice).queryByRole('button')).not.toBeInTheDocument()
  })

  it('kaynak yokken tablo yerine "kaynağı yok" kutusu çıkar', async () => {
    listApi.getProjectFirmUserList.mockResolvedValue({ source: 'unavailable', data: null })
    useIsAdmin.mockReturnValue(true)
    renderWithProviders({ children: <ProjectFirmUsersPage /> })

    expect(await screen.findByText('Bu bölümün veri kaynağı henüz yok.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('Bu ekrandaki bazı veriler sunucudan gelmiyor.')).not.toBeInTheDocument()
  })
})

// KK-1: kırılım, başlık + parantez içinde adet, altında açıklama.
describe('ekran açılışı (KK-1)', () => {
  it('başlık, kırılım, adet ve açıklamayı gösterir', async () => {
    renderPage({ total: 25566 })

    // Adet yanıt gelince dolar; o ana kadar başlıkta "…" durur. Binlik ayraç
    // tr-TR biçiminde (adminFormat).
    const heading = await screen.findByRole('heading', { name: /Proje Firması Kullanıcıları/ })
    await waitFor(() => expect(heading).toHaveTextContent('(25.566)'))
    expect(screen.getByLabelText('Konum')).toHaveTextContent('Anasayfa')
    expect(screen.getByLabelText('Konum')).toHaveTextContent('Firmalar')
  })

  // KK-2: yetki "Tümü", sağ üstteki sıra korunuyor.
  // Uydurma biçim dayatmak yerine ham metin kalır.
  it('maskeye uymayan numarayı olduğu gibi gösterir', async () => {
    renderPage({ rows: [buildRow({ phone: '1180' })] })

    expect(await screen.findByText('1180')).toBeInTheDocument()
  })

  it('proje firması yoksa tire gösterir', async () => {
    renderPage({
      rows: [buildRow({ projectFirm: null }), buildRow({ id: 1002 })],
      total: 2,
    })

    expect(await screen.findByText('—')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AA Mühendislik' })).toBeInTheDocument()
  })
})

// KK-10: kullanıcı adı/ad soyad güncelleme ekranına, firmalar firma detayına gider.
describe('tıklanabilir sütunlar (KK-10)', () => {
  it('kullanıcı ve firma bağlantıları doğru hedefe gider', async () => {
    renderPage()
    const table = await screen.findByRole('table')

    expect(within(table).getByRole('link', { name: 'tolga.ertek' })).toHaveAttribute(
      'href',
      '/admin/project-firm-users/1001',
    )
    expect(within(table).getByRole('link', { name: 'Tolga Ertek' })).toHaveAttribute(
      'href',
      '/admin/project-firm-users/1001',
    )
    expect(within(table).getByRole('link', { name: 'AA Mühendislik' })).toHaveAttribute(
      'href',
      '/admin/project-firms/201',
    )
  })
})

// KK-7: sonuç yoksa tablo yerine açıklama, sayfalama gizli.
describe('sonuç bulunmaması (KK-7)', () => {
  it('tabloyu gizler, açıklamayı gösterir ve sayfalamayı çizmez', async () => {
    renderPage({ rows: [], total: 0 })

    expect(
      await screen.findByText('Arama kriterlerine uygun kayıt bulunamadı.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Sayfalama' })).not.toBeInTheDocument()
  })
})

/**
 * Ekranın kendi ekleme girişi. Bir süre YOKTU: kullanıcı yalnız gösterge
 * panelindeki kısayoldan gelebiliyordu ve o kısayol da üretimde çizilmiyordu.
 */
describe('yeni kullanıcı girişi', () => {
  it('yöneticiye "Yeni Kullanıcı" bağlantısı gösterir', async () => {
    renderPage()

    const link = await screen.findByRole('link', { name: /Yeni Kullanıcı/ })
    expect(link).toHaveAttribute('href', PROJECT_FIRM_USER_CREATE_PATH)
  })

  /** Sunucu da öyle diyor: `POST /api/auth/register` yalnız Admin'e açık. */
  it('yönetici olmayan kullanıcıda çizilmez', async () => {
    renderPage({ isAdmin: false })

    await screen.findByRole('table')
    expect(screen.queryByRole('link', { name: /Yeni Kullanıcı/ })).not.toBeInTheDocument()
  })
})

/** Silme ucu HENÜZ YOK; sahte başarı yerine sebebi söyleniyor (gaz dağıtım
    kullanıcıları ekranındaki desenin aynısı). */
describe('kullanıcı silme', () => {
  it('yöneticiye satır başına "Sil" gösterir', async () => {
    renderPage()

    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('button', { name: 'Sil' }).length).toBeGreaterThan(0)
  })

  it('yönetici olmayanda eylem sütunu hiç üretilmez', async () => {
    renderPage({ isAdmin: false })

    const table = await screen.findByRole('table')
    expect(within(table).queryByRole('button', { name: 'Sil' })).not.toBeInTheDocument()
  })

  it('onaylanınca ucun olmadığını söyler', async () => {
    const user = userEvent.setup()
    renderPage()

    const table = await screen.findByRole('table')
    await user.click(within(table).getAllByRole('button', { name: 'Sil' })[0])

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Sil' }))

    expect(await screen.findByText(/silme ucu sunucuda henüz yok/)).toBeInTheDocument()
  })
})
