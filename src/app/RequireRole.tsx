import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import type { RoleCode } from '../api/roles'
import { FORBIDDEN_PATH } from '../ui/admin/adminNavItems'
import { hasAnyRole, useRoleCode } from '../ui/admin/useRole'

/**
 * YETKİLENDİRME kapısı — kimlik doğrulamayla (`RequireAuth`) bilerek ayrı
 * bileşen. İkisi tek yerde toplansaydı "oturum var mı" ile "rolü yetiyor mu"
 * aynı koşula bağlanır, birini değiştiren öbürünü sessizce etkilerdi.
 *
 * `RequireAuth`'ın İÇİNDE kullanılır: rol oturumdan okunuyor, oturumsuz
 * kullanıcı zaten girişe yönlendirilmiş oluyor.
 *
 * Yetmeyen rol anasayfaya değil `/forbidden`'a gider: kullanıcının denediği
 * adres bir yönlendirmeyle sessizce yutulursa, yanlış yapılandırılmış bir menü
 * maddesi ya da eskimiş bir yer imi hiç fark edilmez. `replace` ile geçmişe
 * yazılmıyor — geri tuşu kullanıcıyı yetkisiz adrese geri fırlatmasın.
 *
 * Bu YALNIZ görünürlük kararıdır; asıl denetim sunucuda (fail-closed API,
 * bkz. knowledge/access-control.md).
 */
export function RequireRole({
  allowed,
  children,
}: {
  allowed: readonly RoleCode[]
  children: ReactNode
}) {
  const roleCode = useRoleCode()

  if (!hasAnyRole(roleCode, allowed)) return <Navigate to={FORBIDDEN_PATH} replace />

  return children
}
