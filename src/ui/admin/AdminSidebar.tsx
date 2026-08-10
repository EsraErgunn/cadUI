import { Moon, Sun } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { ComingSoonBadge } from './ComingSoonBadge'
import { ADMIN_NAV_ITEMS, type AdminNavItem } from './adminNavItems'
import { adminIconButtonVariants, adminNavItemVariants } from './adminVariants'
import { useTheme } from './useTheme'
import logo from '../../assets/brand/logo3.png'

/**
 * Menü maddesi. Ekranı yazılmamış madde de bağlantı: hedefinde "bu ekran
 * gelecektir" karşılaması var. Eskiden `disabled` düğmeydi ve o hâlde
 * odaklanamadığı için klavye kullanıcısı maddeyi hiç göremiyordu.
 */
function AdminNavEntry({ item }: { item: AdminNavItem }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      end
      className={({ isActive }) => adminNavItemVariants({ tone: isActive ? 'active' : 'plain' })}
    >
      {({ isActive }) => (
        <>
          <Icon aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">{item.label}</span>
          {item.isComingSoon === true && <ComingSoonBadge />}
          {isActive && <span className="sr-only">(bulunulan sayfa)</span>}
        </>
      )}
    </NavLink>
  )
}

export function AdminSidebar() {
  const { theme, toggleTheme } = useTheme()

  return (
    // Zemin ana içerikle aynı (surface-sunken); ikisi yalnızca sağ kenarlıkla ayrılır.
    // `overflow-y-auto` YOK: kendi kaydırma kabı olsaydı sayfada ikinci bir dikey
    // çubuk oluşurdu. Menü uzarsa pencereyle birlikte kayar.
    <nav
      aria-label="Yönetici menüsü"
      className="flex w-64 shrink-0 flex-col border-r border-edge bg-surface-sunken text-ink"
    >
      <div className="flex items-center gap-2 border-b border-edge px-5 py-4">
        <img src={logo} alt="" aria-hidden className="h-8 w-auto shrink-0" />
        <span className="text-base font-semibold">StarCAD</span>
        <span className="rounded-md border border-edge bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
          Admin
        </span>
      </div>

      <div className="px-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
          Sistem Yönetimi
        </p>
        <h2 className="mt-1 text-base font-semibold">Yönetici Paneli</h2>
      </div>

      <ul className="mt-4 flex flex-col gap-1 px-3 pb-5">
        {ADMIN_NAV_ITEMS.map((item) => (
          <li key={item.key}>
            <AdminNavEntry item={item} />
          </li>
        ))}
      </ul>

      <div className="mt-auto border-t border-edge px-3 py-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Temayı değiştir"
          aria-pressed={theme === 'dark'}
          className={adminIconButtonVariants({ surface: 'sunken' })}
        >
          {theme === 'dark' ? (
            <Sun aria-hidden className="size-5" />
          ) : (
            <Moon aria-hidden className="size-5" />
          )}
        </button>
      </div>
    </nav>
  )
}
