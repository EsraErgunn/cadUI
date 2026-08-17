import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AdminSidebar } from '../AdminSidebar'
import { ADMIN_NAV_ITEMS } from '../adminNavItems'

function renderSidebar(route = '/admin') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <AdminSidebar isOpen onClose={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

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
