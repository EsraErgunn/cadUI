import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthSession } from '../api/useAuthSession'

export const LOGIN_PATH = '/login'

/**
 * Giriş koruması SADECE burada (CLAUDE.md dizin sahipliği): sayfalar kendi
 * içinde oturum kontrolü yapmaz, yoksa yeni bir sayfa eklendiğinde korumayı
 * yazmayı unutmak sessizce açık kapı bırakır.
 *
 * Oturum düşünce (http.ts 401'de token'ı atıyor) bu bileşen yeniden render
 * olup girişe yönlendirir — abonelik useAuthSession üzerinden.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useAuthSession()
  const location = useLocation()

  if (!session) {
    // Nereden geldiği taşınır: giriş sonrası kullanıcı istediği sayfaya döner.
    return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />
  }

  return children
}
