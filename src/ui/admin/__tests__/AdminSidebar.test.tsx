import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { setAuthSession } from '../../../api/authToken'
import { ROLE_CODES, type RoleCode } from '../../../api/roles'
import { AdminSidebar } from '../AdminSidebar'
import { FIRM_HOME_PATH, getNavItemsForRole } from '../adminNavItems'

/**
 * Menü artık ROLE göre süzülüyor, bu yüzden oturum kurulmadan render edilemez:
 * rolü okunamayan kullanıcı hiçbir madde görmez (kasıtlı — bilinmeyen rol
 * paneli açmasın).
 */
function renderSidebar(route = '/admin', roleCode: RoleCode = ROLE_CODES.admin) {
  setAuthSession({
    token: 'jwt-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    fullName: 'Kullanıcı',
    roleCode,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <AdminSidebar isOpen onClose={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ADMIN_NAV_ITEMS = getNavItemsForRole(ROLE_CODES.admin)

/** Proje firması kullanıcısına KAPALI maddeler. */
const MANAGEMENT_LABELS = [
  'Gaz Dağıtım Firmaları',
  'Proje Firmaları',
  'Proje Firması Kullanıcıları',
  'Gaz Dağıtım Kullanıcıları',
]

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
})

describe('AdminSidebar', () => {
  /**
   * Eskiden ekranı olmayan madde `disabled` düğmeydi; `disabled` düğme
   * odaklanamadığı için klavye ve ekran okuyucu kullanıcısı o maddeleri hiç
   * göremiyordu. Artık hepsi bağlantı, hedefinde karşılama sayfası var.
   */
  it('her madde bağlantıdır, pasif düğme kalmadı', () => {
    renderSidebar()

    expect(screen.getAllByRole('link')).toHaveLength(ADMIN_NAV_ITEMS.length)
    for (const item of ADMIN_NAV_ITEMS) {
      expect(screen.getByRole('link', { name: new RegExp(item.label) })).toBeInTheDocument()
    }
  })

  /**
   * "Yakında" rozeti KALKTI: menüdeki her maddenin ekranı yazıldı ve rozet,
   * çalışan bir ekranı "hazır değil" gösteriyordu. Test regresyon koruması —
   * rozet geri gelirse burası kırmızıya döner.
   */
  it('hiçbir menü maddesi "Yakında" rozeti taşımaz', () => {
    renderSidebar()

    for (const item of ADMIN_NAV_ITEMS) {
      const link = screen.getByRole('link', { name: new RegExp(item.label) })
      expect(link).not.toHaveTextContent('Yakında')
    }
  })

  it('bulunulan sayfanın maddesi işaretlenir', () => {
    renderSidebar('/admin/documents')

    expect(screen.getByRole('link', { name: /Evraklar/ })).toHaveTextContent('(bulunulan sayfa)')
  })

  /**
   * `end` YALNIZ Anasayfa'da: alt yolda açılan ekranlar (proje detayı, Evrak
   * Ekle, Poliçe Oluşturma) menüde geldikleri maddeyi işaretli tutmalı — aksi
   * hâlde kırılımda "Poliçeler / Poliçe Oluşturma" yazarken sol menüde hiçbir
   * madde işaretli olmaz ve kullanıcı nerede olduğunu kaybeder.
   */
  const subRoutes: [route: string, label: string][] = [
    ['/projects/123', 'Projeler'],
    ['/projects/123/editor', 'Projeler'],
    ['/admin/documents/new', 'Evraklar'],
    // Poliçe sihirbazı poliçe bölümünün altında DEĞİL (K68): projenin işlemi
    // olduğu için menüde "Projeler" işaretli kalmalı.
    ['/projects/123/policies/new', 'Projeler'],
    ['/admin/policies', 'Poliçeler'],
  ]

  it.each(subRoutes)('%s adresinde "%s" maddesi işaretli kalır', (route, label) => {
    renderSidebar(route)

    expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveTextContent(
      '(bulunulan sayfa)',
    )
  })

  /**
   * Anasayfa'nın `end`'i KALMALI: `/admin` diğer yönetici yollarının ön eki,
   * kaldırılsaydı her alt yolda İKİ madde birden işaretli görünürdü.
   */
  it.each(subRoutes)('%s adresinde Anasayfa işaretlenmez', (route) => {
    renderSidebar(route)

    expect(screen.getByRole('link', { name: /Anasayfa/ })).not.toHaveTextContent(
      '(bulunulan sayfa)',
    )
    // Tek madde işaretli: menü iki yer birden göstermez.
    expect(screen.getAllByText('(bulunulan sayfa)')).toHaveLength(1)
  })

  it('/admin adresinde yalnız Anasayfa işaretlidir', () => {
    renderSidebar('/admin')

    expect(screen.getByRole('link', { name: /Anasayfa/ })).toHaveTextContent('(bulunulan sayfa)')
    expect(screen.getAllByText('(bulunulan sayfa)')).toHaveLength(1)
  })
})

/**
 * Rol ayrımı. Menüden gizlemek TEK BAŞINA yetmiyor (rota koruması ayrı,
 * `RequireRole`) ama yönetim maddelerinin proje firması kullanıcısına hiç
 * görünmemesi bu ekranın işi.
 */
describe('AdminSidebar rol bazlı menü', () => {
  it('proje firması kullanıcısına yalnız dört madde gösterir', () => {
    renderSidebar(FIRM_HOME_PATH, ROLE_CODES.projectFirmUser)

    const labels = screen.getAllByRole('link').map((link) => link.textContent)
    expect(labels).toEqual([
      expect.stringContaining('Anasayfa'),
      expect.stringContaining('Projeler'),
      expect.stringContaining('Evraklar'),
      expect.stringContaining('Poliçeler'),
    ])
  })

  it.each(MANAGEMENT_LABELS)('proje firması kullanıcısı "%s" maddesini görmez', (label) => {
    renderSidebar(FIRM_HOME_PATH, ROLE_CODES.projectFirmUser)

    expect(screen.queryByRole('link', { name: new RegExp(label) })).not.toBeInTheDocument()
  })

  // Anasayfa maddesi rolün KENDİ yoluna gider; /admin ona kapalı.
  it('proje firması kullanıcısının Anasayfa maddesi /firm adresine gider', () => {
    renderSidebar(FIRM_HOME_PATH, ROLE_CODES.projectFirmUser)

    expect(screen.getByRole('link', { name: /Anasayfa/ })).toHaveAttribute('href', FIRM_HOME_PATH)
    expect(screen.getByRole('link', { name: /Anasayfa/ })).toHaveTextContent('(bulunulan sayfa)')
  })

  it('kabuğun başlığı rolden gelir', () => {
    renderSidebar(FIRM_HOME_PATH, ROLE_CODES.projectFirmUser)

    expect(screen.getByText('Firma Paneli')).toBeInTheDocument()
    expect(screen.queryByText('Yönetici Paneli')).not.toBeInTheDocument()
  })

  // Yönetici menüsü BOZULMADI: sekiz maddenin hepsi yerinde.
  it('yönetici menüsü tüm yönetim maddelerini göstermeye devam eder', () => {
    renderSidebar('/admin')

    for (const label of MANAGEMENT_LABELS) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument()
    }
  })

  /**
   * Rolü tanınmayan kullanıcı BOŞ menü görür. Varsayılan olarak yönetim
   * maddelerini göstermek, rol adı sunucuda değişince paneli herkese açardı.
   */
  it('tanınmayan rol hiçbir madde görmez', () => {
    setAuthSession({
      token: 'jwt-token',
      expiresAt: '2099-01-01T00:00:00.000Z',
      fullName: 'Kullanıcı',
      roleCode: 'BilinmeyenRol',
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/admin']}>
          <AdminSidebar isOpen onClose={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
