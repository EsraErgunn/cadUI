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
 * Rol oturumdan okunuyor: `roleCode` login yanıtından geliyor ve senkron.
 * Mock bir izin listesine bakan eski geçit (`usePermission` + `api/permissions.ts`)
 * SİLİNDİ — gerçek uç (`GET /api/me/permissions`) hiç açılmadı ve üretim
 * derlemesinde boş dizi döndüğü için yetkili kullanıcıya da kapalı görünüyordu.
 */
export function useIsAdmin(): boolean {
  return useRoleCode() === ROLE_CODES.admin
}
