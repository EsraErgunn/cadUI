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

/**
 * Proje firması güncelleme ekranının yolu. Ekranı HENÜZ YOK — uçları
 * (`PUT /api/projectfirms/{id}`) hazır ama route'u kendi issue'sunda gelecek;
 * gaz dağıtım firması güncelleme ekranı da bir dönem böyleydi.
 */
export function projectFirmUpdatePath(firmId: number): string {
  return `${PROJECT_FIRMS_PATH}/${firmId}`
}

/**
 * Sistemde gaz dağıtım firması kullanıcıları da olduğu için ekran hem yolda hem
 * menüde "proje firması" der (belge madde 1): "firm-users" hangi firmanın
 * kullanıcısı olduğunu söylemiyordu.
 */
export const PROJECT_FIRM_USERS_PATH = `${ADMIN_HOME_PATH}/project-firm-users`
export const PROJECT_FIRM_USER_CREATE_PATH = `${PROJECT_FIRM_USERS_PATH}/new`

/** Oluşturma ile AYNI ekran; kimlik varsa form güncelleme modunda açılır (KK-25). */
export function projectFirmUserUpdatePath(userId: number): string {
  return `${PROJECT_FIRM_USERS_PATH}/${userId}`
}

export const DOCUMENTS_PATH = `${ADMIN_HOME_PATH}/documents`
export const POLICIES_PATH = `${ADMIN_HOME_PATH}/policies`

/** Proje detayındaki "Evrak Ekle" ve "Poliçelendir" hedefleri (KK-9). */
export const DOCUMENT_CREATE_PATH = `${DOCUMENTS_PATH}/new`
export const POLICY_CREATE_PATH = `${POLICIES_PATH}/new`

/**
 * "Bu ekran hangi projeye bağlı açıldı" anahtarı. İki ekran da (Evrak Ekle,
 * Poliçe Oluşturma) GELİNEN projeyle ilişkilendiriliyor ve kimliksiz
 * açılamıyor; iki ayrı sabit, aynı anahtarın iki adı olurdu.
 */
export const PROJECT_PARAM = 'project'

/**
 * Kimlik yola değil query'ye konuldu (K61): `/admin/documents/new` sabiti ve ona
 * bağlı rota zaten vardı, proje kimliği için yolu `/projects/:id/documents/new`
 * yapmak hem sabiti hem rotayı taşımak olurdu.
 */
export function documentCreatePath(projectId: number): string {
  return `${DOCUMENT_CREATE_PATH}?${PROJECT_PARAM}=${projectId}`
}

/** Poliçe Oluşturma ekranı; kimlik K61'in aynı gerekçesiyle query'de. */
export function policyCreatePath(projectId: number): string {
  return `${POLICY_CREATE_PATH}?${PROJECT_PARAM}=${projectId}`
}

/**
 * Adresteki proje kimliği. Elle düzenlenmiş ya da eksik değer `undefined`
 * döner; ekran o zaman veri çekmek yerine sebebini yazar.
 */
export function parseProjectParam(raw: string | null): number | undefined {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

/** Duyuru listesi ekranı; anasayfadaki "Tümünü Gör" buraya gider. */
export const ANNOUNCEMENTS_PATH = `${ADMIN_HOME_PATH}/announcements`

export const PROJECT_CREATE_PATH = `${PROJECT_LIST_PATH}/new`

/**
 * Tablodaki proje adının hedefi: artık proje DETAY ekranı (K50). Eskiden
 * doğrudan çizim editörü açılıyordu ve buradaki TODO detay ekranını bekliyordu.
 */
export function projectDetailPath(projectId: number): string {
  return `${PROJECT_LIST_PATH}/${projectId}`
}

/**
 * Çizim editörü. Detay ekranı `/projects/:id` adresini devraldığı için editör
 * alt yola taşındı; editöre giriş artık detay ekranından.
 */
export function projectEditorPath(projectId: number): string {
  return `${PROJECT_LIST_PATH}/${projectId}/editor`
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
  { key: 'projectFirms', label: 'Proje Firmaları', icon: Building2, path: PROJECT_FIRMS_PATH },
  {
    key: 'projectFirmUsers',
    label: 'Proje Firması Kullanıcıları',
    icon: Users,
    path: PROJECT_FIRM_USERS_PATH,
  },
  { key: 'projects', label: 'Projeler', icon: FolderKanban, path: PROJECT_LIST_PATH },
  { key: 'documents', label: 'Evraklar', icon: FileText, path: DOCUMENTS_PATH },
  {
    key: 'policies',
    label: 'Poliçeler',
    icon: ShieldCheck,
    path: POLICIES_PATH,
    isComingSoon: true,
  },
]
