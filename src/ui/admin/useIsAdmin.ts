import { ROLE_CODES } from '../../api/roles'
import { useAuthSession } from '../../api/useAuthSession'

/**
 * Oturumdaki kullanıcı Admin mi.
 *
 * Bu YALNIZCA bir GÖRÜNÜRLÜK kararıdır — hangi alanın render edileceğini seçer.
 * Yetki denetimi sunucunun sorumluluğudur: istemci gövdeye firma kimliği koymasa
 * bile uç, token'daki role bakarak reddetmek zorundadır.
 *
 * Rol `usePermission` yerine oturumdan okunuyor: `api/permissions.ts` hâlâ mock
 * bir izin listesi döndürüyor (gerçek uç yok), oysa `roleCode` login yanıtından
 * geliyor ve senkron. İzin listesi gerçek uca bağlanırsa yalnız bu fonksiyonun
 * gövdesi değişir, çağıranlar değişmez.
 */
export function useIsAdmin(): boolean {
  return useAuthSession()?.roleCode === ROLE_CODES.admin
}
