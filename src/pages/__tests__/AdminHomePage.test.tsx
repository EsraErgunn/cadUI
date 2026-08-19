import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { toDayKey } from '../../api/dayKey'
import {
  ANNOUNCEMENTS_PATH,
  PROJECT_FIRM_CREATE_PATH,
  PROJECT_FIRM_USER_CREATE_PATH,
} from '../../ui/admin/adminNavItems'
import { AdminHomePage } from '../AdminHomePage'
import { ComingSoonPage } from '../ComingSoonPage'

const dashboardApi = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
  publishAnnouncement: vi.fn(),
}))
const permissionsApi = vi.hoisted(() => ({ getMyPermissions: vi.fn() }))
/** Kapsam kimliğini ADA çeviren listeler; başlıktaki kapsam adı buradan geliyor.
    Firma listesi de gerekiyor: kapsam tek bir gaz dağıtım firması olabilir. */
const firmsApi = vi.hoisted(() => ({ getFirmGroups: vi.fn(), fetchAllFirms: vi.fn() }))

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
  densityBy: 'group',
  density: [
    { id: 2, name: 'AKSA', projectCount: 28 },
    { id: 3, name: 'ÇEDAŞ', projectCount: 22 },
    { id: 5, name: 'ENERYA', projectCount: 16 },
    { id: 4, name: 'DOĞUGAZ', projectCount: 12 },
    { id: 1, name: 'AKMERCAN', projectCount: 8 },
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

function renderPage({ route = '/admin', permissions = ALL_PERMISSIONS, summary = SUMMARY } = {}) {
  dashboardApi.getDashboardSummary.mockResolvedValue(summary)
  dashboardApi.publishAnnouncement.mockResolvedValue(PUBLISHED)
  permissionsApi.getMyPermissions.mockResolvedValue(permissions)
  firmsApi.getFirmGroups.mockResolvedValue([
    { id: 1, name: 'AKMERCAN' },
    { id: 2, name: 'AKSA' },
  ])
  firmsApi.fetchAllFirms.mockResolvedValue([
    { id: 20, dfirmNo: 1204, groupId: 2, groupName: 'AKSA', name: 'AKSA-Ankara' },
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
          <Route path={PROJECT_FIRM_USER_CREATE_PATH} element={<ComingSoonPage title="Kullanıcı Oluştur" />} />
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
  it('kırılım ve başlık görünür', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Genel Bakış' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anasayfa' })).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    // Başlık altı YALNIZ ana başlığı söyler; tarih "Bugün" kartında, kapsam adı
    // özet kartlarının altında yazıyor.
    expect(screen.getByText('Sistem geneli durum')).toBeInTheDocument()
  })

  it('sağ üstte "Duyuru Yayınla" bulunur ve etkindir', async () => {
    renderPage()

    const button = await screen.findByRole('button', { name: 'Duyuru Yayınla' })
    expect(button).toBeEnabled()
  })
})

/**
 * KK-2 — kapsam üst bardan geliyor: grup `group`, tek firma `gdfirm` anahtarında
 * (docs/kararlar.md K44). Coğrafi bölge kavramı kalktı, `region` okunmuyor.
 */
describe('kapsam', () => {
  it('kapsam yokken sistem genelini ister ve öyle yazar', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Genel Bakış' })

    expect(dashboardApi.getDashboardSummary).toHaveBeenCalledWith(
      expect.any(String),
      { type: 'global' },
      expect.anything(),
    )
    expect((await screen.findAllByText('Tüm gruplar ve firmalar için')).length).toBeGreaterThan(0)
  })

  it('grup kapsamını uca geçirir', async () => {
    renderPage({ route: '/admin?group=2' })

    await screen.findByRole('heading', { name: 'Genel Bakış' })

    expect(dashboardApi.getDashboardSummary).toHaveBeenCalledWith(
      expect.any(String),
      { type: 'group', groupId: 2 },
      expect.anything(),
    )
  })

  // Firma kapsamı ayrı bir hâl: uca `gdFirmId` gidiyor, `gdGroupId` DEĞİL.
  it('firma kapsamını uca geçirir', async () => {
    renderPage({ route: '/admin?gdfirm=20' })

    await screen.findByRole('heading', { name: 'Genel Bakış' })

    expect(dashboardApi.getDashboardSummary).toHaveBeenCalledWith(
      expect.any(String),
      { type: 'firm', firmId: 20 },
      expect.anything(),
    )
  })

  // Sayılar süzülmüşken "tüm gruplar ve firmalar" demek yanlış olurdu.
  it('seçili grubun adını kartlara yazar', async () => {
    renderPage({ route: '/admin?group=2' })

    // Grup listesi sonra çözülüyor; ilk kare hâlâ kapsamsız metni gösteriyor.
    expect((await screen.findAllByText('AKSA için')).length).toBeGreaterThan(0)
  })

  it('seçili firmanın adını kartlara yazar', async () => {
    renderPage({ route: '/admin?gdfirm=20' })

    expect((await screen.findAllByText('AKSA-Ankara için')).length).toBeGreaterThan(0)
  })

  // Eski anahtar sessizce kapsam kurmasın: adres çubuğunda kalmış olabilir.
  it('eski `region` anahtarını yok sayar', async () => {
    renderPage({ route: '/admin?region=Ege' })

    await screen.findByRole('heading', { name: 'Genel Bakış' })

    expect(dashboardApi.getDashboardSummary).toHaveBeenCalledWith(
      expect.any(String),
      { type: 'global' },
      expect.anything(),
    )
    expect((await screen.findAllByText('Tüm gruplar ve firmalar için')).length).toBeGreaterThan(0)
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

  it('kapsam bilgisi her kartta "Tüm gruplar ve firmalar için" yazar', async () => {
    renderPage()

    expect(
      (await screen.findAllByText('Tüm gruplar ve firmalar için')).length,
    ).toBeGreaterThan(0)
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
      { type: 'global' },
      expect.anything(),
    )
  })
})

// KK-5 — kırılım bazlı yoğunluk
describe('KK-5 yoğunluk kartı', () => {
  it('en fazla beş satır, büyükten küçüğe, çubuk en yükseğe oranlı', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Grup Bazlı Yoğunluk' })

    const labels = within(card)
      .getAllByRole('term')
      .map((node) => node.textContent)
    expect(labels).toEqual(['AKSA', 'ÇEDAŞ', 'ENERYA', 'DOĞUGAZ', 'AKMERCAN'])

    const bars = card.querySelectorAll('progress')
    expect(bars).toHaveLength(5)
    // En yüksek değer çubuğu tam dolu: value === max.
    expect(bars[0].getAttribute('value')).toBe(bars[0].getAttribute('max'))
    expect(within(card).getByText('Bugün gelen projeler')).toBeInTheDocument()
  })

  /** Başlık kırılımın boyutundan geliyor: firma kapsamında sunucu firmaları
      döndürüyor ve kart bunu söylemeli. */
  it('firma kırılımında başlık firmayı söyler', async () => {
    renderPage({ summary: { ...SUMMARY, densityBy: 'firm' } })

    expect(
      await screen.findByRole('region', { name: 'Firma Bazlı Yoğunluk' }),
    ).toBeInTheDocument()
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

  // Rozet KALDIRILDI: "Proje Firması Ekle" ekranı yazıldığı hâlde "Yakında"
  // diyordu, yani çalışan bir ekranı hazır değil gösteriyordu.
  it('hiçbir kısayol "Yakında" rozeti taşımaz', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Hızlı İşlemler' })

    await within(card).findByRole('link', { name: /Gaz Dağıtım Firması Ekle/ })
    for (const link of within(card).getAllByRole('link')) {
      expect(link).not.toHaveTextContent('Yakında')
    }
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

  // Form kapsamsız açılır; duyurunun KENDİ kapsamı kutuda seçilmeye devam ediyor.
  it('form kapsamsız açılır', async () => {
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
      scopeName: null,
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
