import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { AdminSidebar } from './AdminSidebar'
import { AdminTopBar } from './AdminTopBar'

/**
 * Tüm yönetici ekranlarının ortak kabuğu (sol menü + üst bar). Sayfalar route
 * çocuğu olarak <Outlet/>'e girer — kabuk sayfanın içine gömülmez, sayfa
 * değişince yeniden kurulmaz.
 */
export function AdminLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    // Kabuk viewport'a KİLİTLİ DEĞİL: `h-screen + overflow-hidden` iken sayfa her
    // zaman tam 100vh'ti ve kaydırma içerideki <main>'e düşüyordu — kısa listede
    // sayfalamanın altında bir ekran boyu ölü alan kalıyor, uzun listede pencere
    // ve konteyner iki ayrı çubukla kayıyordu. `min-h-screen` yalnız ALT sınır
    // koyar: içerik kısaysa sayfa viewport kadar (kaydırmasız), uzunsa içerik
    // kadar uzar ve TEK çubukla pencere kayar.
    <div className="flex min-h-screen bg-surface-sunken">
      <AdminSidebar isOpen={isMenuOpen} onClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar onOpenMenu={() => setIsMenuOpen(true)} />
        {/* Telefonda 32 px'lik yan boşluk içeriğe yer bırakmıyordu. */}
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 3xl:px-10 4xl:px-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
