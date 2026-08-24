import { useRoleCode } from './useRole'
import { resolveHomePath } from './workspaceIdentity'

/**
 * Bulunulan rolün anasayfası — kırılımın ("Anasayfa / …") ilk maddesi.
 *
 * Üç rolün de kullandığı ekranlar bunu çağırır; sabit `ADMIN_HOME_PATH` yazan
 * bir kırılım, proje firması kullanıcısını rol kapısının arkasındaki yönetim
 * panosuna, yani "yetkiniz yok" ekranına götürürdü. Yönetim ekranlarının kendi
 * kırılımları sabiti kullanmaya devam ediyor: onlara zaten yalnız o roller
 * giriyor.
 */
export function useHomePath(): string {
  return resolveHomePath(useRoleCode())
}
