import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { toDayKey } from '../../api/dayKey'
import {
  ANNOUNCEMENTS_PATH,
  PROJECT_FIRM_CREATE_PATH,
  USER_CREATE_PATH,
} from '../../ui/admin/adminNavItems'
import { AdminHomePage } from '../AdminHomePage'
import { ComingSoonPage } from '../ComingSoonPage'

const dashboardApi = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
  publishAnnouncement: vi.fn(),
}))
const permissionsApi = vi.hoisted(() => ({ getMyPermissions: vi.fn() }))
/** Kapsam kimliğini ADA çeviren liste; başlıktaki bölge adı buradan geliyor. */
const firmsApi = vi.hoisted(() => ({ getFirmGroups: vi.fn() }))

vi.mock('../../api/adminDashboard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminDashboard')>()),
  ...dashboardApi,
}))

vi.mock('../../api/permissions', () => permissionsApi)

vi.mock('../../api/adminFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminFirms')>()),
  ...firmsApi,
}))

const SUMMARY = {
  counts: { gasDistributionUsers: 2926, projectFirms: 11838, projectFirmUsers: 24804 },
  today: { newProjects: 11, approved: 3, rejected: 0 },
  regionDensity: [
    { region: 'Marmara', count: 28 },
    { region: 'Akdeniz', count: 22 },
    { region: 'Karadeniz', count: 16 },
    { region: 'İç Anadolu', count: 12 },
    { region: 'Ege', count: 8 },
  ],
  announcements: [
    {
      id: 2,
      title: 'Planlı Bakım Bildirimi',
      summary: '19 Temmuz Pazar 02:00–06:00 arasında sistem bakımda olacaktır.',
      publishedAt: '2026-07-11T06:00:00.000Z',
      source: 'Sistem',
    },
    {
      id: 1,
      title: 'ZetaCAD 3.0 Versiyon 3469 Yayında',
      summary: 'Yeni versiyon yayında.',
      publishedAt: '2026-06-19T09:00:00.000Z',
      source: 'Teknhelogos',
    },
  ],
}

const ALL_PERMISSIONS = ['firm.create', 'projectFirm.create', 'user.create']

const PUBLISHED = {
  id: 9,
  title: 'Yeni Duyuru',
  summary: 'Duyuru gövdesi.',
  publishedAt: '2026-08-09T09:00:00.000Z',
  source: 'Yönetim',
}

function renderPage({ route = '/admin', permissions = ALL_PERMISSIONS } = {}) {
  dashboardApi.getDashboardSummary.mockResolvedValue(SUMMARY)
  dashboardApi.publishAnnouncement.mockResolvedValue(PUBLISHED)
  permissionsApi.getMyPermissions.mockResolvedValue(permissions)
  firmsApi.getFirmGroups.mockResolvedValue([
    { id: 1, name: 'AKMERCAN' },
    { id: 2, name: 'AKSA' },
  ])

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="/projects" element={<h1>Taslak Projeler</h1>} />
          <Route
            path={PROJECT_FIRM_CREATE_PATH}
            element={<ComingSoonPage title="Proje Firması Ekle" />}
          />
          <Route path={USER_CREATE_PATH} element={<ComingSoonPage title="Kullanıcı Oluştur" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Duyuru formunu açar ve zorunlu alanları doldurur. */
async function fillAnnouncementForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Duyuru Yayınla' }))

  await user.type(screen.getByLabelText('Başlık'), 'Yeni Duyuru')
  await user.type(screen.getByLabelText('Duyuru Metni'), 'Duyuru gövdesi.')
}

afterEach(() => {
  vi.clearAllMocks()
})

// KK-1 — Ekran açılışı
describe('KK-1 ekran açılışı', () => {
  it('kırılım, başlık ve kapsam açıklaması görünür', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Genel Bakış' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anasayfa' })).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/Sistem geneli durum —/)).toHaveTextContent('tüm bölgeler')
  })

  it('sağ üstte "Duyuru Yayınla" bulunur ve etkindir', async () => {
    renderPage()

    const button = await screen.findByRole('button', { name: 'Duyuru Yayınla' })
    expect(button).toBeEnabled()
  })

  it('kapsam açıklamasındaki tarih İÇİNDE BULUNULAN gündür', async () => {
    renderPage()
    const today = new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date())

    expect(await screen.findByText(/Sistem geneli durum —/)).toHaveTextContent(today)
  })
})

/**
 * KK-2 — bölge kapsamı üst bardan geliyor ve `group` anahtarında duruyor
 * (docs/kararlar.md K44). Eski `region` anahtarı artık okunmuyor.
 */
describe('bölge kapsamı', () => {
  it('kapsam yokken sistem genelini ister ve öyle yazar', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Genel Bakış' })

    expect(dashboardApi.getDashboardSummary).toHaveBeenCalledWith(
      expect.any(String),
      null,
      expect.anything(),
    )
    expect(screen.getByText(/Sistem geneli durum —/)).toHaveTextContent('tüm bölgeler')
  })

  it('kapsam seçiliyken grup kimliğini uca geçirir', async () => {
    renderPage({ route: '/admin?group=2' })

    await screen.findByRole('heading', { name: 'Genel Bakış' })

    expect(dashboardApi.getDashboardSummary).toHaveBeenCalledWith(
      expect.any(String),
      2,
      expect.anything(),
    )
  })

  // Sayılar süzülmüşken "tüm bölgeler" demek yanlış olurdu.
  it('seçili bölgenin adını başlığa yazar', async () => {
    renderPage({ route: '/admin?group=2' })

    // Grup listesi sonra çözülüyor; ilk kare hâlâ "tüm bölgeler" diyor.
    expect(await screen.findByText(/Sistem geneli durum —.*AKSA/)).toBeInTheDocument()
  })

  // Eski anahtar sessizce kapsam kurmasın: adres çubuğunda kalmış olabilir.
  it('eski `region` anahtarını yok sayar', async () => {
    renderPage({ route: '/admin?region=Ege' })

    await screen.findByRole('heading', { name: 'Genel Bakış' })

    expect(screen.getByText(/Sistem geneli durum —/)).toHaveTextContent('tüm bölgeler')
  })
})

// KK-3 — Özet kartları
describe('KK-3 özet kartları', () => {
  it('üç kart binlik ayraçlı değerlerle görünür', async () => {
    renderPage()

    expect(await screen.findByText('2.926')).toBeInTheDocument()
    expect(screen.getByText('11.838')).toBeInTheDocument()
    expect(screen.getByText('24.804')).toBeInTheDocument()
  })

  it('proje firması kartları bağlantı, gaz dağıtım kullanıcıları değil', async () => {
    renderPage()
    await screen.findByText('2.926')

    expect(screen.getByRole('link', { name: /Proje Firmaları/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Proje Firması Kullanıcıları/ })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Gaz Dağıtım Kullanıcıları/ }),
    ).not.toBeInTheDocument()
  })

  it('kapsam bilgisi her kartta "Tüm bölgeler için" yazar', async () => {
    renderPage()

    expect((await screen.findAllByText('Tüm bölgeler için')).length).toBeGreaterThan(0)
  })
})

// KK-4 — Bugün kartı
describe('KK-4 bugün kartı', () => {
  it('üç sayaç görünür ve sıfır gizlenmez', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Bugün' })

    expect(within(card).getByText('Yeni Proje')).toBeInTheDocument()
    expect(within(card).getByText('11')).toBeInTheDocument()
    expect(within(card).getByText('Onaylanmış')).toBeInTheDocument()
    expect(within(card).getByText('3')).toBeInTheDocument()
    // Sıfır değer "0" olarak GÖRÜNÜR.
    expect(within(card).getByText('Reddedilen')).toBeInTheDocument()
    expect(within(card).getByText('0')).toBeInTheDocument()
  })

  /**
   * Sayaçların kapsamı ekranda YAZILI ve veri o gün için isteniyor: gün dönünce
   * anahtar değişip yeni günün (henüz boş) kayıtları geldiği için sayaçlar
   * kendiliğinden sıfırlanıyor.
   */
  it('sayaçların ait olduğu gün kartta yazar', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Bugün' })
    const today = new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date())

    expect(within(card).getByText(today)).toBeInTheDocument()
  })

  it('veri İÇİNDE BULUNULAN gün için istenir', async () => {
    renderPage()

    await screen.findByRole('region', { name: 'Bugün' })
    expect(dashboardApi.getDashboardSummary).toHaveBeenCalledWith(
      toDayKey(new Date()),
      null,
      expect.anything(),
    )
  })
})

// KK-5 — Bölge bazlı yoğunluk
describe('KK-5 bölge bazlı yoğunluk', () => {
  it('en fazla beş bölge, büyükten küçüğe, çubuk en yükseğe oranlı', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Bölge Bazlı Yoğunluk' })

    const labels = within(card)
      .getAllByRole('term')
      .map((node) => node.textContent)
    expect(labels).toEqual(['Marmara', 'Akdeniz', 'Karadeniz', 'İç Anadolu', 'Ege'])

    const bars = card.querySelectorAll('progress')
    expect(bars).toHaveLength(5)
    // En yüksek değer çubuğu tam dolu: value === max.
    expect(bars[0].getAttribute('value')).toBe(bars[0].getAttribute('max'))
    expect(within(card).getByText('Bugün gelen projeler')).toBeInTheDocument()
  })
})

// KK-6 — Duyurular
describe('KK-6 duyurular', () => {
  it('iki duyuru yeniden eskiye, tarih ve kaynakla görünür', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Duyurular' })

    const items = within(card).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Planlı Bakım Bildirimi')
    expect(items[0]).toHaveTextContent('11.07.2026 • Sistem')
    expect(items[1]).toHaveTextContent('ZetaCAD 3.0 Versiyon 3469 Yayında')
  })

  it('"Tümünü Gör" duyuru listesine giden bağlantıdır', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Duyurular' })

    expect(within(card).getByRole('link', { name: 'Tümünü Gör' })).toHaveAttribute(
      'href',
      ANNOUNCEMENTS_PATH,
    )
  })

  it('sistem kaynaklı duyuru amber sol kenarlıkla ayrışır', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Duyurular' })
    const items = within(card).getAllByRole('listitem')

    expect(items[0].className).toContain('border-warning')
    expect(items[1].className).not.toContain('border-warning')
  })
})

// KK-7 — Hızlı işlemler
describe('KK-7 hızlı işlemler', () => {
  it('dört kısayol iki sütunlu ızgarada görünür', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Hızlı İşlemler' })

    expect(await within(card).findByText('Gaz Dağıtım Firması Ekle')).toBeInTheDocument()
    expect(within(card).getByText('Proje Firması Ekle')).toBeInTheDocument()
    expect(within(card).getByText('Kullanıcı Oluştur')).toBeInTheDocument()
    expect(within(card).getByText('Projeleri Görüntüle')).toBeInTheDocument()
    // Kart dar ekranda tek sütuna iner ama İÇERİĞİ 2x2 kalır.
    expect(card.querySelector('.grid-cols-2')).not.toBeNull()
  })

  it('her kısayol tıklanabilir bir bağlantıdır', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Hızlı İşlemler' })

    expect(
      await within(card).findByRole('link', { name: /Gaz Dağıtım Firması Ekle/ }),
    ).toBeInTheDocument()
    expect(within(card).getAllByRole('link')).toHaveLength(4)
  })

  it('ekranı hazır olmayan kısayol "Yakında" rozetiyle işaretlenir', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Hızlı İşlemler' })

    const comingSoon = await within(card).findByRole('link', { name: /Proje Firması Ekle/ })
    expect(comingSoon).toHaveTextContent('Yakında')
    // Hazır ekranın kısayolunda rozet YOK.
    expect(within(card).getByRole('link', { name: /Gaz Dağıtım Firması Ekle/ })).not.toHaveTextContent(
      'Yakında',
    )
  })

  it('ekranı olmayan kısayol "bu ekran gelecektir" sayfasını açar', async () => {
    const user = userEvent.setup()
    renderPage()
    const card = await screen.findByRole('region', { name: 'Hızlı İşlemler' })

    await user.click(await within(card).findByRole('link', { name: /Kullanıcı Oluştur/ }))

    expect(screen.getByRole('heading', { name: 'Kullanıcı Oluştur' })).toBeInTheDocument()
    expect(screen.getByText('Bu ekran gelecektir.')).toBeInTheDocument()
  })

  it('yetkisi olmayan kısayol listede yer almaz', async () => {
    renderPage({ permissions: ['firm.create'] })
    const card = await screen.findByRole('region', { name: 'Hızlı İşlemler' })

    await within(card).findByText('Gaz Dağıtım Firması Ekle')
    expect(within(card).queryByText('Proje Firması Ekle')).not.toBeInTheDocument()
    expect(within(card).queryByText('Kullanıcı Oluştur')).not.toBeInTheDocument()
    // İzin aranmayan kısayol her hâlde durur.
    expect(within(card).getByText('Projeleri Görüntüle')).toBeInTheDocument()
  })
})

// "Duyuru Yayınla" — kullanıcı ekranlarındaki duyuru alanına içerik girme formu
describe('duyuru yayınlama', () => {
  it('düğme formu diyalog olarak açar', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Duyuru Yayınla' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Duyuru Yayınla')
    expect(within(dialog).getByLabelText('Başlık')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Duyuru Metni')).toBeInTheDocument()
  })

  it('boş formda başlık ve metin zorunlu, odak ilk hatalı alana gider', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Duyuru Yayınla' }))
    await user.click(screen.getByRole('button', { name: 'Yayınla' }))

    expect(screen.getByText('Duyuru başlığı zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Duyuru metni zorunludur.')).toBeInTheDocument()
    expect(screen.getByLabelText('Başlık')).toHaveFocus()
    expect(dashboardApi.publishAnnouncement).not.toHaveBeenCalled()
  })

  // Kapsam seçicisi kalktığı için form "tüm bölgeler" ile açılır (K31);
  // duyurunun KENDİ bölgesi kutuda seçilmeye devam ediyor.
  it('form tüm bölgeler kapsamıyla açılır', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Duyuru Yayınla' }))

    expect(screen.getByLabelText('Kapsam')).toHaveValue('')
  })

  it('geçerli form yayınlanır ve sonuç bildirilir', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillAnnouncementForm(user)
    await user.click(screen.getByRole('button', { name: 'Yayınla' }))

    expect(dashboardApi.publishAnnouncement).toHaveBeenCalledWith({
      title: 'Yeni Duyuru',
      body: 'Duyuru gövdesi.',
      region: null,
      isSystem: false,
    })
    // Diyalog kapanır, sayfada olumlu bildirim kalır.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('duyurusu yayınlandı')
  })

  it('sistem duyurusu işaretlenince uca öyle gider', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillAnnouncementForm(user)
    await user.click(screen.getByLabelText(/Sistem duyurusu/))
    await user.click(screen.getByRole('button', { name: 'Yayınla' }))

    expect(dashboardApi.publishAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ isSystem: true }),
    )
  })

  it('sunucu hatasında diyalog açık kalır ve yazılan metin korunur', async () => {
    const user = userEvent.setup()
    renderPage()
    dashboardApi.publishAnnouncement.mockRejectedValueOnce(new Error('Sunucu 500 döndü.'))

    await fillAnnouncementForm(user)
    await user.click(screen.getByRole('button', { name: 'Yayınla' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sunucu 500 döndü.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Başlık')).toHaveValue('Yeni Duyuru')
  })

  it('Vazgeç diyaloğu kapatır, duyuru gönderilmez', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillAnnouncementForm(user)
    await user.click(screen.getByRole('button', { name: 'Vazgeç' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(dashboardApi.publishAnnouncement).not.toHaveBeenCalled()
  })

  it('Esc ile kapanır ve odak tetikleyen düğmeye döner', async () => {
    const user = userEvent.setup()
    renderPage()

    const trigger = await screen.findByRole('button', { name: 'Duyuru Yayınla' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
