import { Moon, Sun, X } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'

import { ADMIN_HOME_PATH, ADMIN_NAV_ITEMS, type AdminNavItem } from './adminNavItems'
import { adminIconButtonVariants, adminNavItemVariants } from './adminVariants'
import { useTheme } from './useTheme'
import logo from '../../assets/brand/logo3.png'

/**
 * Menü maddesi. Ekranı yazılmamış madde de bağlantı: hedefinde "bu ekran
 * gelecektir" karşılaması var. Eskiden `disabled` düğmeydi ve o hâlde
 * odaklanamadığı için klavye kullanıcısı maddeyi hiç göremiyordu.
 */
function AdminNavEntry({ item, onSelect }: { item: AdminNavItem; onSelect: () => void }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      // Çekmecede madde seçilince menü kapanır; açık kalsaydı kullanıcı gittiği
      // sayfayı göremezdi. Geniş ekranda çekmece zaten kapalı sayılıyor.
      onClick={onSelect}
      // `end` YALNIZ Anasayfa'da: `/admin` her yönetici yolunun ön eki olduğu
      // için o madde hep etkin görünürdü. Diğer maddeler alt yollarını da
      // kapsıyor — kırılımda "Poliçeler / Poliçe Oluşturma" yazarken sol menüde
      // hiçbir maddenin işaretli olmaması kullanıcıyı yolunu kaybetmiş bırakır.
      end={item.path === ADMIN_HOME_PATH}
      className={({ isActive }) => adminNavItemVariants({ tone: isActive ? 'active' : 'plain' })}
    >
      {({ isActive }) => (
        <>
          <Icon aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">{item.label}</span>
          {isActive && <span className="sr-only">(bulunulan sayfa)</span>}
        </>
      )}
    </NavLink>
  )
}

interface AdminSidebarProps {
  /** Yalnız `lg` ALTINDA anlamlı: çekmece açık mı. */
  isOpen: boolean
  onClose: () => void
}

/**
 * Sol menü. `lg` ve üstünde her zaman görünen sabit sütun; ALTINDA ekranı
 * kaplayan bir çekmece.
 *
 * Eskiden her genişlikte `w-64` sabit sütundu: 320–768 px arasında 256 px'i
 * menüye gidiyor, içeriğe kalan alanda tablolar ve formlar yatay kayıyordu.
 */
export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { theme, toggleTheme } = useTheme()

  // Esc çekmeceyi kapatır; klavye kullanıcısı menüde kilitli kalmasın.
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {/* Zemin yalnız çekmece açıkken ve yalnız dar ekranda; tıklayınca kapanır. */}
      {isOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
        />
      )}

      {/* Zemin ana içerikle aynı (surface-sunken); ikisi yalnızca sağ kenarlıkla
          ayrılır. Geniş ekranda `overflow-y-auto` YOK: kendi kaydırma kabı
          olsaydı sayfada ikinci bir dikey çubuk oluşurdu. Çekmece hâlindeyse
          kendi içinde kayar, çünkü sayfayla birlikte kayamaz. */}
      <nav
        aria-label="Yönetici menüsü"
        className={`z-50 flex w-64 shrink-0 flex-col border-r border-edge bg-surface-sunken text-ink
          max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:overflow-y-auto max-lg:transition-transform
          ${isOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}`}
      >
        <div className="flex items-center gap-2 border-b border-edge px-5 py-4">
          <img src={logo} alt="" aria-hidden className="h-8 w-auto shrink-0" />
          <span className="text-base font-semibold">StarCAD</span>
          <span className="rounded-md border border-edge bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
            Admin
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Menüyü kapat"
            className={adminIconButtonVariants({ surface: 'sunken', className: 'ml-auto lg:hidden' })}
          >
            <X aria-hidden className="size-5" />
          </button>
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
              <AdminNavEntry item={item} onSelect={onClose} />
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
    </>
  )
}
