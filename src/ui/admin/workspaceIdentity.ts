import { ADMIN_HOME_PATH, FIRM_HOME_PATH, FORBIDDEN_PATH } from './adminNavItems'
import { ROLE_CODES, type RoleCode } from '../../api/roles'

/**
 * Kabuğun rolden gelen yüzü. Sol menünün başlığı eskiden sabit "Sistem Yönetimi
 * / Yönetici Paneli / Admin" yazıyordu; proje firması kullanıcısı da aynı
 * kabuğu kullandığı için bu metinler artık veri.
 *
 * React YOK — saf eşleme. Yeni rol geldiğinde tek satır eklenir.
 */
export interface WorkspaceIdentity {
  /** Menü başlığındaki küçük rozet. */
  badge: string
  /** Rozetin üstündeki bölüm etiketi (küçük, büyük harfli). */
  section: string
  title: string
  /** Girişten sonra ve "Anasayfa" maddesinin gittiği yer. */
  homePath: string
}

const IDENTITIES: Record<RoleCode, WorkspaceIdentity> = {
  [ROLE_CODES.admin]: {
    badge: 'Admin',
    section: 'Sistem Yönetimi',
    title: 'Yönetici Paneli',
    homePath: ADMIN_HOME_PATH,
  },
  // TODO(esra): rolün kendi ekranları gelene kadar yönetici kabuğunu kullanıyor
  // (bkz. MANAGEMENT_SCREEN_ROLES). Rozet yine de rolü doğru yazıyor: kullanıcıya
  // "Admin" demek, yetkisini yanlış tarif etmek olurdu.
  [ROLE_CODES.gasDistributionUser]: {
    badge: 'Gaz Dağıtım',
    section: 'Sistem Yönetimi',
    title: 'Yönetici Paneli',
    homePath: ADMIN_HOME_PATH,
  },
  [ROLE_CODES.projectFirmUser]: {
    badge: 'Firma',
    section: 'Proje Firması',
    title: 'Firma Paneli',
    homePath: FIRM_HOME_PATH,
  },
}

/**
 * Tanınmayan rolün kimliği. Menüsü zaten boş (`getNavItemsForRole`); anasayfası
 * da yetkisiz ekranı olmalı — bir çalışma alanına "varsayılan olarak" sokmak,
 * rol adı sunucuda değişince paneli herkese açmak demekti.
 */
const UNKNOWN_ROLE_IDENTITY: WorkspaceIdentity = {
  badge: 'Yetkisiz',
  section: 'StarCAD',
  title: 'Panel',
  homePath: FORBIDDEN_PATH,
}

export function getWorkspaceIdentity(roleCode: RoleCode | undefined): WorkspaceIdentity {
  return roleCode === undefined ? UNKNOWN_ROLE_IDENTITY : IDENTITIES[roleCode]
}

/** Girişten sonra gidilecek yer; `useLoginForm` ve kabuk aynı kaynaktan okusun. */
export function resolveHomePath(roleCode: RoleCode | undefined): string {
  return getWorkspaceIdentity(roleCode).homePath
}
