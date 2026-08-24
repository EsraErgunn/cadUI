import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { login } from '../api/auth'
import { toRoleCode } from '../ui/admin/useRole'
import { resolveHomePath } from '../ui/admin/workspaceIdentity'

/**
 * Hesabın var olup olmadığını ele vermeyen GENEL mesaj (CLAUDE.md ürün kuralı):
 * sunucunun 401 gerekçesi ne olursa olsun kullanıcıya bu yazılır. "Kullanıcı
 * bulunamadı" ile "şifre yanlış"ı ayırmak kullanıcı adı sayımına izin verir.
 */
export const INVALID_CREDENTIALS_MESSAGE = 'Kullanıcı adı veya şifre hatalı.'

export type LoginForm = {
  username: string
  setUsername: (value: string) => void
  password: string
  setPassword: (value: string) => void
  error: string | undefined
  isSubmitting: boolean
  handleSubmit: (event: FormEvent) => void
}

/**
 * RequireAuth'un yönlendirdiği sayfa; doğrudan gelindiyse ROLÜN anasayfası
 * (`resolveHomePath`). Sabit `/admin` değil: o yol yönetim ekranlarının kökü ve
 * artık rol kapısının arkasında — proje firması kullanıcısı girer girmez
 * "yetkiniz yok" ekranına düşerdi.
 *
 * Rol, oturum kancasından değil `login`'in DÖNDÜRDÜĞÜ yanıttan okunuyor:
 * yönlendirme kararı isteğin hemen ardından veriliyor ve abonelikle gelecek
 * güncellemeyi beklemek gereksiz bir kare gecikmesi olurdu.
 *
 * Geldiği adres korunuyor (`from`). Kullanıcı yetkisi olmayan bir adresten
 * girişe düşmüşse oraya geri gönderilir ve `RequireRole` sebebini yazar —
 * sessizce başka bir ekrana bırakmak, adresin neden açılmadığını gizlerdi.
 */
function readReturnPath(state: unknown, roleCode: string): string {
  if (state && typeof state === 'object' && 'from' in state) {
    const { from } = state as { from: unknown }
    if (typeof from === 'string' && from.startsWith('/')) return from
  }
  return resolveHomePath(toRoleCode(roleCode))
}

export function useLoginForm(): LoginForm {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(undefined)

    login({ username: username.trim(), password })
      .then((session) =>
        navigate(readReturnPath(location.state, session.roleCode), { replace: true }),
      )
      // Ağ hatası ile hatalı şifre AYRILMIYOR: ayrımın kendisi de bir sinyal olurdu.
      .catch(() => setError(INVALID_CREDENTIALS_MESSAGE))
      .finally(() => setIsSubmitting(false))
  }

  return { username, setUsername, password, setPassword, error, isSubmitting, handleSubmit }
}
