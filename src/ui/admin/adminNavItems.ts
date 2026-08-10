import {
  Building2,
  Factory,
  FileText,
  FolderKanban,
  House,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { PROJECT_LIST_PATH } from '../../pages/useCloseEditor'

/** Yönetici kabuğunun kökü; Anasayfa bu yolun index route'u (router.tsx). */
export const ADMIN_HOME_PATH = '/admin'

export const GAS_DISTRIBUTION_FIRMS_PATH = `${ADMIN_HOME_PATH}/gas-distribution-firms`
export const GAS_FIRM_CREATE_PATH = `${GAS_DISTRIBUTION_FIRMS_PATH}/new`

/** Firma güncelleme ekranının yolu. ekran kendi issue'sunda gelecek. */
export function gasFirmUpdatePath(firmId: number): string {
  return `${GAS_DISTRIBUTION_FIRMS_PATH}/${firmId}`
}

/**
 * Ekranları HENÜZ YAZILMAMIŞ yollar. Rotalar bugün "yakında" karşılama ekranına
 * bağlı (router.tsx); yol adları şimdiden gerçek yerlerine konuldu ki ekran
 * gelince yalnız route'un element'i değişsin, bağlantılara dokunulmasın.
 */
export const PROJECT_FIRMS_PATH = `${ADMIN_HOME_PATH}/project-firms`
export const PROJECT_FIRM_CREATE_PATH = `${PROJECT_FIRMS_PATH}/new`
export const FIRM_USERS_PATH = `${ADMIN_HOME_PATH}/firm-users`
export const USER_CREATE_PATH = `${ADMIN_HOME_PATH}/users/new`
export const DOCUMENTS_PATH = `${ADMIN_HOME_PATH}/documents`
export const POLICIES_PATH = `${ADMIN_HOME_PATH}/policies`

/** Duyuru listesi ekranı; anasayfadaki "Tümünü Gör" buraya gider. */
export const ANNOUNCEMENTS_PATH = `${ADMIN_HOME_PATH}/announcements`

export const PROJECT_CREATE_PATH = `${PROJECT_LIST_PATH}/new`

/**
 * Tablodaki proje adının hedefi. Proje DETAY ekranı henüz yok; bugün doğrudan
 * çizim editörü açılıyor — editöre başka giriş noktası kalmasın diye.
 * TODO(esra): detay ekranı gelince bu fonksiyon detay yolunu döndürecek.
 */
export function projectEditorPath(projectId: number): string {
  return `${PROJECT_LIST_PATH}/${projectId}`
}

export interface AdminNavItem {
  key: string
  label: string
  icon: LucideIcon
  path: string
  /** Hedef gerçek ekran mı, yoksa "bu ekran gelecektir" karşılaması mı. */
  isComingSoon?: boolean
}

/**
 * Sol menünün TEK kaynağı: sıra, etiket ve yol burada durur. Yeni yönetici ekranı
 * eklenince yalnız bu dizi ve router.tsx değişir, AdminSidebar'a dokunulmaz.
 *
 * Her maddenin yolu VAR. Ekranı yazılmamış olanlar bugün karşılama sayfasına
 * gidiyor (`isComingSoon`), pasif düğme olarak durmuyorlar: `disabled` düğme
 * odaklanamadığı için o maddeler klavye ve ekran okuyucu kullanıcısına hiç
 * görünmüyordu.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // Geçici karşılama ekranı (AdminHomePage). Kendi yolu var; "Projeler" maddesiyle
  // aynı ekranı göstermesin diye proje listesine DEĞİL, /admin'e bakar.
  { key: 'home', label: 'Anasayfa', icon: House, path: ADMIN_HOME_PATH },
  {
    key: 'gasDistributionFirms',
    label: 'Gaz Dağıtım Firmaları',
    icon: Factory,
    path: GAS_DISTRIBUTION_FIRMS_PATH,
  },
  {
    key: 'projectFirms',
    label: 'Proje Firmaları',
    icon: Building2,
    path: PROJECT_FIRMS_PATH,
    isComingSoon: true,
  },
  {
    key: 'firmUsers',
    label: 'Firma Kullanıcıları',
    icon: Users,
    path: FIRM_USERS_PATH,
    isComingSoon: true,
  },
  { key: 'projects', label: 'Projeler', icon: FolderKanban, path: PROJECT_LIST_PATH },
  {
    key: 'documents',
    label: 'Evraklar',
    icon: FileText,
    path: DOCUMENTS_PATH,
    isComingSoon: true,
  },
  {
    key: 'policies',
    label: 'Poliçeler',
    icon: ShieldCheck,
    path: POLICIES_PATH,
    isComingSoon: true,
  },
]
