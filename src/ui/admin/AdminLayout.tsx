import { Outlet } from 'react-router-dom'

import { AdminSidebar } from './AdminSidebar'
import { AdminTopBar } from './AdminTopBar'

/**
 * Tüm yönetici ekranlarının ortak kabuğu (sol menü + üst bar). Sayfalar route
 * çocuğu olarak <Outlet/>'e girer — kabuk sayfanın içine gömülmez, sayfa
 * değişince yeniden kurulmaz.
 */
export function AdminLayout() {
  return (
    // Kabuk viewport'a KİLİTLİ DEĞİL: `h-screen + overflow-hidden` iken sayfa her
    // zaman tam 100vh'ti ve kaydırma içerideki <main>'e düşüyordu — kısa listede
    // sayfalamanın altında bir ekran boyu ölü alan kalıyor, uzun listede pencere
    // ve konteyner iki ayrı çubukla kayıyordu. `min-h-screen` yalnız ALT sınır
    // koyar: içerik kısaysa sayfa viewport kadar (kaydırmasız), uzunsa içerik
    // kadar uzar ve TEK çubukla pencere kayar.
    <div className="flex min-h-screen bg-surface-sunken">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar />
        <main className="flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
