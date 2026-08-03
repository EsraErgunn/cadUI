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
  /** Ekranı henüz olmayan maddede null — madde görünür ama tıklanamaz. */
  path: string | null
}

/**
 * Sol menünün TEK kaynağı: sıra, etiket ve yol burada durur. Yeni yönetici ekranı
 * eklenince yalnız bu dizi ve router.tsx değişir, AdminLayout'a dokunulmaz.
 *
 *  path'i null olan maddeler kendi issue'larında route alacak.
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
  { key: 'projectFirms', label: 'Proje Firmaları', icon: Building2, path: null },
  { key: 'firmUsers', label: 'Firma Kullanıcıları', icon: Users, path: null },
  { key: 'projects', label: 'Projeler', icon: FolderKanban, path: PROJECT_LIST_PATH },
  { key: 'documents', label: 'Evraklar', icon: FileText, path: null },
  { key: 'policies', label: 'Poliçeler', icon: ShieldCheck, path: null },
]
