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
        <AdminSidebar />
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

  it('ekranı hazır olmayan madde "Yakında" rozetiyle işaretlenir', () => {
    renderSidebar()

    const comingSoon = screen.getByRole('link', { name: /Evraklar/ })
    expect(comingSoon).toHaveTextContent('Yakında')
    expect(screen.getByRole('link', { name: /Anasayfa/ })).not.toHaveTextContent('Yakında')
  })

  // Ekranı yazılan madde rozetini KAYBETMELİ; rozet kalsaydı çalışan bir ekran
  // "hazır değil" görünürdü.
  it('ekranı yazılmış madde rozet taşımaz', () => {
    renderSidebar()

    expect(screen.getByRole('link', { name: /Proje Firmaları/ })).not.toHaveTextContent('Yakında')
    // Belge madde 1: menü etiketi "Firma Kullanıcıları" değil "Proje Firması
    // Kullanıcıları" — sistemde gaz dağıtım firması kullanıcıları da var.
    expect(
      screen.getByRole('link', { name: /Proje Firması Kullanıcıları/ }),
    ).not.toHaveTextContent('Yakında')
  })

  it('bulunulan sayfanın maddesi işaretlenir', () => {
    renderSidebar('/admin/documents')

    expect(screen.getByRole('link', { name: /Evraklar/ })).toHaveTextContent('(bulunulan sayfa)')
  })
})
