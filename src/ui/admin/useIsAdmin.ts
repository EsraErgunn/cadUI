import { useRoleCode } from './useRole'
import { ROLE_CODES } from '../../api/roles'

/**
 * Oturumdaki kullanıcı Admin mi.
 *
 * Bu YALNIZCA bir GÖRÜNÜRLÜK kararıdır — hangi alanın render edileceğini seçer.
 * Yetki denetimi sunucunun sorumluluğudur: istemci gövdeye firma kimliği koymasa
 * bile uç, token'daki role bakarak reddetmek zorundadır.
 *
 * Gövde `useRole.ts`'e devredildi: rol kodunu okuyan tek yer orası olsun,
 * "bilinmeyen kod hiçbir role sayılmaz" kuralı her çağıran için aynı işlesin.
 * İmza değişmedi, çağıranların hiçbiri etkilenmiyor.
 *
 * Rol `usePermission` yerine oturumdan okunuyor: `api/permissions.ts` hâlâ mock
 * bir izin listesi döndürüyor (gerçek uç yok), oysa `roleCode` login yanıtından
 * geliyor ve senkron.
 */
export function useIsAdmin(): boolean {
  return useRoleCode() === ROLE_CODES.admin
}
