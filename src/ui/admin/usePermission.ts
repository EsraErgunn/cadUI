import { useQuery } from '@tanstack/react-query'

import { getMyPermissions, type Permission } from '../../api/permissions'

const PERMISSION_STALE_MS = 5 * 60 * 1000

/**
 * Yetki kontrolünün tek geçiş noktası. Rol/sahiplik modeli hakkında varsayım
 * yapmaz (knowledge/access-control.md açık soru) — yalnız sunucudan gelen izin
 * listesine bakar.
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
