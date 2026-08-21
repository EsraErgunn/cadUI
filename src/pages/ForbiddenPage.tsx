import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

import { adminButtonVariants } from '../ui/admin/adminVariants'
import { useRoleCode } from '../ui/admin/useRole'
import { resolveHomePath } from '../ui/admin/workspaceIdentity'

const TITLE = 'Bu sayfaya erişim yetkiniz yok'
const DESCRIPTION =
  'Açmaya çalıştığınız ekran başka bir kullanıcı tipine ait. Yanlış bir bağlantıyı ' +
  'takip ettiğinizi düşünüyorsanız yöneticinizle görüşün.'

/**
 * Rol kapısının (`RequireRole`) hedefi.
 *
 * Kabuğun İÇİNDE duruyor: sol menü açık kalsın ki kullanıcı yetkisi olan bir
 * ekrana tek tıkla geçebilsin. Kabuksuz tam sayfa bir hata ekranı, kullanıcıyı
 * geri tuşundan başka çıkışı olmayan bir köşeye sıkıştırırdı.
 *
 * Anasayfa bağlantısı rolden türüyor — rolü tanınmayan kullanıcıda `homePath`
 * bu sayfanın kendisi olduğu için düğme hiç çizilmiyor; kendine götüren bir
 * düğme kullanıcıyı yalnız yanıltırdı.
 */
export function ForbiddenPage() {
  const roleCode = useRoleCode()
  const homePath = resolveHomePath(roleCode)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger/10 text-danger-ink">
        <ShieldAlert aria-hidden className="size-7" />
      </span>

      {/* `role="alert"` DEĞİL: sayfa yüklenirken zaten okunuyor, ikinci bir
          duyuru ekran okuyucuda başlığı tekrar ettirirdi. */}
      <h1 className="text-xl font-semibold text-ink">{TITLE}</h1>
      <p className="max-w-prose text-sm text-ink-muted">{DESCRIPTION}</p>

      {roleCode !== undefined && (
        <Link to={homePath} className={adminButtonVariants({ tone: 'primary' })}>
          Anasayfaya dön
        </Link>
      )}
    </div>
  )
}
