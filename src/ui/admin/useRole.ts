import { MANAGEMENT_SCREEN_ROLES, PROJECT_CONTENT_WRITER_ROLES } from './adminNavItems'
import { ROLE_CODES, type RoleCode } from '../../api/roles'
import { useAuthSession } from '../../api/useAuthSession'

/**
 * Sunucudan gelen HAM rol metnini bilinen bir role çevirir.
 *
 * Tanınmayan kod `undefined` olur ve hiçbir role eşlenmez. Bilinmeyeni "en
 * azından şu role sayalım" diye bir kovaya koymak, yetkisiz kullanıcıya yetkili
 * ekran açmanın en sessiz yoludur; rol adı sunucuda değişirse arayüz kapıyı
 * açmak yerine kapatsın.
 *
 * `Object.values(...).find` seçildi ki dönüş tipi zaten `RoleCode | undefined`
 * olsun — `includes` + `as RoleCode` aynı işi yapardı ama denetimi kapatırdı.
 */
export function toRoleCode(value: string | undefined): RoleCode | undefined {
  return Object.values(ROLE_CODES).find((code) => code === value)
}

/** Rol listesi üyeliği; `RequireRole` ile görünürlük kararları AYNI kapıdan geçsin. */
export function hasAnyRole(
  roleCode: RoleCode | undefined,
  allowed: readonly RoleCode[],
): boolean {
  return roleCode !== undefined && allowed.includes(roleCode)
}

/**
 * Oturumdaki rol — rol kararlarının TEK kaynağı.
 *
 * Kaynak yine `useAuthSession`: ikinci bir kimlik/rol sistemi kurulmuyor, bu
 * dosya yalnız login yanıtındaki `roleCode`'u tipli hâle getiriyor. Oturum
 * yoksa `undefined` döner — o hâli `RequireAuth` zaten girişe yönlendiriyor.
 */
export function useRoleCode(): RoleCode | undefined {
  return toRoleCode(useAuthSession()?.roleCode)
}

export function useIsProjectFirmUser(): boolean {
  return useRoleCode() === ROLE_CODES.projectFirmUser
}

export function useIsGasDistributionUser(): boolean {
  return useRoleCode() === ROLE_CODES.gasDistributionUser
}

/**
 * Kullanıcı YÖNETİM görünümünü mü kullanıyor?
 *
 * Rol adı yerine bu soruyu sormak, ekranların "admin mi" diye tek tek
 * kontrol etmesini engelliyor: yönetim rolleri listesi bir gün değişince
 * (bkz. `MANAGEMENT_SCREEN_ROLES`'ün TODO'su) yalnız o dizi güncellenecek.
 *
 * Ekranlarda yönetim ALANLARINI (başka firmaların adı, firma süzgeci, kapsam
 * seçicisi) göstermek için kullanılır — veri kapsamı için DEĞİL: onu sunucu
 * belirliyor.
 */
export function useIsManagementUser(): boolean {
  return hasAnyRole(useRoleCode(), MANAGEMENT_SCREEN_ROLES)
}

/**
 * Proje içeriğini (proje, evrak, poliçe) YAZABİLİR mi — ekleme, güncelleme,
 * silme.
 *
 * Kümenin gerekçesi `PROJECT_CONTENT_WRITER_ROLES`'te: sunucudaki üç
 * controller'ın yazma uçları da aynı iki role açık. Burada gizlenen her düğme
 * sunucuda da reddedilirdi; arayüz o sınırı tekrar etmiyor, GÖSTERİYOR.
 *
 * Tanınmayan rol `false` alır (`hasAnyRole`) — yazma yüzeyleri fail-closed.
 */
export function useCanWriteProjectContent(): boolean {
  return hasAnyRole(useRoleCode(), PROJECT_CONTENT_WRITER_ROLES)
}
