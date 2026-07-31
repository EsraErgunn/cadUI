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

export const GAS_DISTRIBUTION_FIRMS_PATH = '/admin/gas-distribution-firms'
export const GAS_FIRM_CREATE_PATH = `${GAS_DISTRIBUTION_FIRMS_PATH}/new`

/** Firma güncelleme ekranının yolu. TODO(esra): ekran kendi issue'sunda gelecek. */
export function gasFirmUpdatePath(firmId: number): string {
  return `${GAS_DISTRIBUTION_FIRMS_PATH}/${firmId}`
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
  { key: 'home', label: 'Anasayfa', icon: House, path: PROJECT_LIST_PATH },
  {
    key: 'gasDistributionFirms',
    label: 'Gaz Dağıtım Firmaları',
    icon: Factory,
    path: GAS_DISTRIBUTION_FIRMS_PATH,
  },
  { key: 'projectFirms', label: 'Proje Firmaları', icon: Building2, path: null },
  { key: 'firmUsers', label: 'Firma Kullanıcıları', icon: Users, path: null },
  { key: 'projects', label: 'Projeler', icon: FolderKanban, path: null },
  { key: 'documents', label: 'Evraklar', icon: FileText, path: null },
  { key: 'policies', label: 'Poliçeler', icon: ShieldCheck, path: null },
]
