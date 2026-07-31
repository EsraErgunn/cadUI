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
    <div className="flex h-screen overflow-hidden bg-surface-sunken">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar />
        <main className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
