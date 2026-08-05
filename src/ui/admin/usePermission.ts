import { useQuery } from '@tanstack/react-query'

import { getMyPermissions, type Permission } from '../../api/permissions'

const PERMISSION_STALE_MS = 5 * 60 * 1000

/**
 * Düz izin listesine bakan eski yetki geçidi. YENİ KODDA KULLANILMAZ — rol
 * modeli kesinleşti (üç rol, tek rol, `Role.Code`) ve görünürlük kararı
 * `useIsAdmin` ile veriliyor. Bu hook `GET /api/me/permissions` uca bağlanana
 * kadar mock liste döndürür; ikisini birden taşımak iki ayrı yetki kaynağı
 * demek (bkz. knowledge/access-control.md).
 *
 * Liste gelmeden `false` döner: yetkisiz kullanıcıya butonun bir an görünüp
 * kaybolması, hiç görünmemesinden daha yanlış bir beklenti yaratır.
 */
export function usePermission(permission: Permission): boolean {
  const { data } = useQuery({
    queryKey: ['permissions'],
    queryFn: getMyPermissions,
    staleTime: PERMISSION_STALE_MS,
  })

  return data?.includes(permission) ?? false
}
