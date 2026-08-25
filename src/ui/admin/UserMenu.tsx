import { useQuery } from '@tanstack/react-query'
import { ChevronDown, IdCard, KeyRound, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ChangePasswordDialog } from './ChangePasswordDialog'
import { PROFILE_PATH } from './adminNavItems'
import { ADMIN_FOCUS_RING } from './adminVariants'
import { useLogout } from './useLogout'
import { ROLE_CODES, listRoles } from '../../api/roles'
import { useAuthSession } from '../../api/useAuthSession'

/**
 * Rol KODU kullanıcıya gösterilmez. Ad artık `GET /api/roles`'ten geliyor; bu
 * sözlük YEDEK: istek dönene kadar ya da uca ulaşılamazsa menü ham kod
 * ("Admin") göstermesin diye duruyor.
 */
const ROLE_LABELS: Record<string, string> = {
  [ROLE_CODES.admin]: 'Sistem Yöneticisi',
  [ROLE_CODES.gasDistributionUser]: 'Gaz Dağıtım Kullanıcısı',
  [ROLE_CODES.projectFirmUser]: 'Proje Firması Kullanıcısı',
}

/** Roller oturum boyunca değişmiyor; tek istek yeter. */
const ROLE_STALE_MS = 60 * 60 * 1000

/**
 * Sistem yöneticisinin üst barda GÖRÜNEN adı. Yalnız gösterim: oturumdaki
 * `fullName` (sunucudaki hesap adı, ortamdan ortama "Demo" gibi değişebiliyor)
 * yerine yönetici rolünde tek ve tanınır bir ad yazılıyor. İstek gövdesine,
 * token'a ve kullanıcı modeline dokunmuyor; diğer roller kendi adlarını görür.
 */
const ADMIN_DISPLAY_NAME = 'Administrator'

/** Oturum henüz okunmamışken. */
const UNKNOWN_USER_NAME = 'Kullanıcı'

const MENU_ITEM =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken disabled:cursor-not-allowed disabled:text-ink-disabled'

/**
 * Yıkıcı menü maddesi. Tokenlar `adminButtonVariants`'ın `danger` varyantıyla
 * AYNI (`text-danger-ink`, `hover:bg-danger/10`) — yeni bir renk sistemi
 * kurulmuyor, var olan destructive dili menü satırına uyarlanıyor.
 *
 * Pasif hâl ortak sınıftan geliyor (`disabled:text-ink-disabled`): istek
 * uçarken satır kırmızı kalsaydı hâlâ basılabilir görünürdü.
 */
const MENU_ITEM_DANGER =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-ink hover:bg-danger/10 disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:bg-transparent'

/**
 * Üst bardaki kullanıcı bloğu artık bir MENÜ: adın yanında duran çıkış düğmesi
 * yerine ada tıklanınca açılan liste. Menüye ikinci bir eylem (şifre değiştirme)
 * gerekince satıra ikinci bir ikon düğmesi eklemek üst barı sıkıştırıyordu.
 *
 * Rol ve — yönetici DIŞINDAKİ rollerde — ad OTURUMDAN geliyor; eskiden ikisi de
 * sabitti ve giriş yapan kim olursa olsun aynı görünüyordu. Yönetici rolünde ad
 * yerine `ADMIN_DISPLAY_NAME` yazılıyor (bkz. o sabitin notu).
 *
 * Erişilebilirlik: tetikleyici gerçek bir `button` (`aria-haspopup`,
 * `aria-expanded`), maddeler `role="menuitem"` olan düğmeler — tıklanabilir
 * `div` yok. Esc kapatır ve odak tetikleyiciye döner; dışarı tıklamak da kapatır.
 */
export function UserMenu() {
  const session = useAuthSession()
  const { isLoggingOut, requestLogout } = useLogout()
  const [isOpen, setIsOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && containerRef.current?.contains(event.target)) return
      setIsOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      // Odak menüdeydi; kapanınca kaybolmasın diye tetikleyiciye döner.
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const fullName =
    session === undefined
      ? UNKNOWN_USER_NAME
      : session.roleCode === ROLE_CODES.admin
        ? ADMIN_DISPLAY_NAME
        : session.fullName
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: ({ signal }) => listRoles(signal),
    staleTime: ROLE_STALE_MS,
  })

  const roleLabel =
    session === undefined
      ? ''
      : ((roles ?? []).find((role) => role.code === session.roleCode)?.name ??
        ROLE_LABELS[session.roleCode] ??
        session.roleCode)

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`flex max-w-48 items-center gap-2 rounded-lg border-l border-edge py-1 pl-3 pr-2 text-left hover:bg-surface-sunken ${ADMIN_FOCUS_RING}`}
      >
        <UserRound aria-hidden className="size-5 shrink-0 text-ink-muted sm:hidden" />
        {/* Dar ekranda yalnız ikon kalır: ad + rol bloğu üst barı taşırıyordu. */}
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-sm font-semibold text-ink">{fullName}</span>
          {roleLabel !== '' && (
            <span className="block truncate text-xs text-ink-muted">{roleLabel}</span>
          )}
        </span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-muted" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Kullanıcı menüsü"
          className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-edge bg-surface py-1 shadow-lg"
        >
          {/* Dar ekranda ad tetikleyicide görünmüyor; menüde her zaman yazıyor. */}
          <p className="truncate px-3 py-2 text-xs text-ink-muted sm:hidden">{fullName}</p>

          {/* Gerçek bir bağlantı: yeni sekmede açılabilsin ve adres
              paylaşılabilsin diye `button` değil `Link`. */}
          <Link
            to={PROFILE_PATH}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className={`${MENU_ITEM} ${ADMIN_FOCUS_RING}`}
          >
            <IdCard aria-hidden className="size-4 shrink-0 text-ink-muted" />
            Kişi Bilgileri
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false)
              setIsPasswordDialogOpen(true)
            }}
            className={`${MENU_ITEM} ${ADMIN_FOCUS_RING}`}
          >
            <KeyRound aria-hidden className="size-4 shrink-0 text-ink-muted" />
            Şifre Değiştir
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false)
              requestLogout()
            }}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            className={`${MENU_ITEM_DANGER} ${ADMIN_FOCUS_RING}`}
          >
            {/* İkon da yıkıcı rengi alıyor; gri kalsaydı satır yarı kırmızı görünürdü. */}
            <LogOut aria-hidden className="size-4 shrink-0" />
            Çıkış Yap
          </button>
        </div>
      )}

      {isPasswordDialogOpen && (
        <ChangePasswordDialog onClose={() => setIsPasswordDialogOpen(false)} />
      )}
    </div>
  )
}
