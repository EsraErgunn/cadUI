import {
  Building2,
  Factory,
  FileText,
  FolderKanban,
  House,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

import { ADMIN_PARAM_KEYS } from './adminUrlParams'
import { DEFAULT_PROJECT_STATUS, type ProjectStatus } from '../../api/projects'
import { ROLE_CODES, type RoleCode } from '../../api/roles'
import { PROJECT_LIST_PATH } from '../../pages/useCloseEditor'

/** Yönetici kabuğunun kökü; Anasayfa bu yolun index route'u (router.tsx). */
export const ADMIN_HOME_PATH = '/admin'

/**
 * Proje firması kullanıcısının anasayfası. `/admin` ile PAYLAŞILMADI: o yol
 * yönetim ekranlarının kökü ve rol kapısı oraya bağlı — aynı adrese rolüne göre
 * farklı ekran basmak, korumayı rota ağacından çıkarıp bileşenin içine gömerdi.
 */
export const FIRM_HOME_PATH = '/firm'

/**
 * Gaz dağıtım firması kullanıcısının anasayfası. `/admin` ile PAYLAŞILMADI:
 * `FIRM_HOME_PATH` ile aynı gerekçe — `/admin` yönetim ekranlarının kökü ve rol
 * kapısı oraya bağlı. Yol adı `gas-distribution-firms` / `gas-distribution-users`
 * sabitleriyle aynı sözcüğü kullanıyor.
 */
export const GAS_DISTRIBUTION_HOME_PATH = '/gas-distribution'

/**
 * Rolü yetmeyen kullanıcının düştüğü ekran. Sessizce anasayfaya yönlendirmek
 * yerine ayrı bir yol: yanlış yapılandırılmış bir menü maddesi ya da eskimiş bir
 * yer imi "hiçbir şey olmadı" gibi değil, sebebiyle görünsün.
 */
export const FORBIDDEN_PATH = '/forbidden'

/**
 * Gaz dağıtım GRUP firmaları (AKSA, ENERYA…). Salt okuma listesi: uçta yazma
 * işlemleri yalnız Admin'e açık (`POST/PUT/DELETE /api/gasdistributiongroups`)
 * ve o ekranlar için gereksinim yok. `GET` her role açık.
 */
export const GAS_DISTRIBUTION_GROUPS_PATH = `${ADMIN_HOME_PATH}/gas-distribution-groups`

/**
 * Grup firmalarını GÖREN roller. Sol menüde maddesi YOK — üst bardan açılıyor
 * (`AdminTopBar`): kapsam seçicisi bu iki rolde çizilmediği için üst barın sol
 * yuvası zaten boş, ekran oraya oturuyor. Yönetici bu ekranı kullanmıyor;
 * grupları kendi firma formundan ve kapsam seçicisinden yönetiyor.
 */
export const GAS_DISTRIBUTION_GROUPS_VIEWER_ROLES: readonly RoleCode[] = [
  ROLE_CODES.projectFirmUser,
  ROLE_CODES.gasDistributionUser,
]

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
 * Güncelleme rotasının KALIBI (router için). `/new` statik olduğu için
 * react-router onu bu dinamik segmentin önünde sıralar; ekleme adresi
 * kimlik sanılmaz.
 */
export const PROJECT_FIRM_UPDATE_ROUTE = `${PROJECT_FIRMS_PATH}/:firmId`

/** Bir kaydın güncelleme ekranının adresi (`ProjectFirmUpdatePage`). */
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

/**
 * Gaz dağıtım firmalarının kullanıcıları. `PROJECT_FIRM_USERS_PATH` ile aynı
 * gerekçe: yol hangi firmanın kullanıcısı olduğunu söylüyor.
 */
export const GAS_DISTRIBUTION_USERS_PATH = `${ADMIN_HOME_PATH}/gas-distribution-users`

export const GAS_DISTRIBUTION_USER_CREATE_PATH = `${GAS_DISTRIBUTION_USERS_PATH}/new`

/**
 * Oluşturma ile AYNI ekran; kimlik varsa form güncelleme modunda açılır —
 * proje firması kullanıcılarındaki desen (KK-25).
 *
 * Bir süre güncelleme rotası YOKTU: gerekçe "liste satırı rol/firma bağını
 * taşımıyor, yarım bir form sunucudaki dolu alanları silerdi" idi. O engel
 * kalktı — kayıt `GET /api/users/{id}` ile TAM okunuyor ve gövde
 * `toUserPayload` ile okunan kayıttan türetiliyor, yani düzenlenmeyen alanlar
 * olduğu gibi geri gidiyor.
 */
export function gasDistributionUserUpdatePath(userId: number): string {
  return `${GAS_DISTRIBUTION_USERS_PATH}/${userId}`
}

export const DOCUMENTS_PATH = `${ADMIN_HOME_PATH}/documents`
export const POLICIES_PATH = `${ADMIN_HOME_PATH}/policies`

/** Proje detayındaki "Evrak Ekle" hedefi (KK-9). */
export const DOCUMENT_CREATE_PATH = `${DOCUMENTS_PATH}/new`

/**
 * "Bu ekran hangi projeye bağlı açıldı" anahtarı — bugün yalnız Evrak Ekle
 * kullanıyor. Poliçe Oluşturma kimliği YOLDA taşıyor (K68).
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

/**
 * "Poliçelendir" hedefi. Yol POLİÇELER altında DEĞİL, projenin altında (K68):
 * sihirbaz tek bir projenin işlemi ve `/admin/policies/new` adresindeyken sol
 * menü "Poliçeler" maddesini işaretliyordu — kullanıcı, bütün poliçelerin
 * listelendiği bölüme geçmiş gibi görünüyordu. Kimlik de bu yüzden yolda:
 * adres zaten projeye bağlıyken ayrıca `?project=` taşımak ikinci bir kaynak
 * olurdu.
 */
const POLICY_CREATE_SEGMENT = 'policies/new'

/** Rota kalıbı; `policyCreatePath` ile aynı parçadan türer ki ikisi ayrışmasın. */
export const POLICY_CREATE_ROUTE = `${PROJECT_LIST_PATH}/:projectId/${POLICY_CREATE_SEGMENT}`

export function policyCreatePath(projectId: number): string {
  return `${PROJECT_LIST_PATH}/${projectId}/${POLICY_CREATE_SEGMENT}`
}

/**
 * Adresteki proje kimliği (Evrak Ekle'de query, Poliçe Oluşturma'da yol
 * parçası). Elle düzenlenmiş ya da eksik değer `undefined` döner; ekran o zaman
 * veri çekmek yerine sebebini yazar.
 */
export function parseProjectParam(raw: string | null): number | undefined {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

/** Kişi Bilgileri ekranı; sol menüde madde YOK, üst bardaki kullanıcı
    menüsünden açılıyor (kişisel ayar, yönetim bölümü değil). */
export const PROFILE_PATH = `${ADMIN_HOME_PATH}/profile`

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

/**
 * YÖNETİM ekranlarını görebilen roller — hem sol menünün süzgeci hem
 * `RequireRole`'ün listesi buradan okur, ikisi ayrışmasın.
 *
 * Yalnız `Admin`. Gaz dağıtım kullanıcısı bir süre burada GEÇİCİ olarak
 * duruyordu (ekran kümesi kararlaşmamıştı); kararlaştı ve çıkarıldı: o rol
 * firma/kullanıcı yönetmiyor, projeleri ONAYLIYOR. Kendi ekranları
 * `ALL_ROLES` maddeleri + `GAS_DISTRIBUTION_HOME_PATH`.
 */
export const MANAGEMENT_SCREEN_ROLES: readonly RoleCode[] = [ROLE_CODES.admin]

/**
 * Proje İÇERİĞİNİ yazabilen roller: proje, evrak ve poliçe oluşturma /
 * güncelleme / silme.
 *
 * Sunucudaki sınırın birebir karşılığı — üç controller'da da AYNI öznitelik:
 * `POST/PUT/DELETE /api/projects`, `/api/docs` ve `/api/policies` hepsi
 * `[Authorize(Roles = Admin, ProjectFirmUser)]`. Okuma uçları (`GET`) rol
 * kısıtı taşımıyor; kapsamı `WhereVisibleTo` veriyor.
 *
 * Gaz dağıtım kullanıcısı bu içeriği GÖRÜR, YAZMAZ — onun eylemi onay/ret
 * (`ProjectApprovalController`: approve/reject `Admin, GasDistributionUser`).
 */
export const PROJECT_CONTENT_WRITER_ROLES: readonly RoleCode[] = [
  ROLE_CODES.admin,
  ROLE_CODES.projectFirmUser,
]

/**
 * Üç rolün de gördüğü ekranlar. `MANAGEMENT_SCREEN_ROLES`'ten TÜRETİLMİYOR:
 * eskiden `[...MANAGEMENT_SCREEN_ROLES, projectFirmUser]` idi ve yönetim listesi
 * daralınca gaz dağıtım kullanıcısı buradan da sessizce düşerdi. İki liste ayrı
 * sorulara cevap veriyor, biri ötekinin alt kümesi diye yazılmamalı.
 */
const ALL_ROLES: readonly RoleCode[] = [
  ROLE_CODES.admin,
  ROLE_CODES.gasDistributionUser,
  ROLE_CODES.projectFirmUser,
]

/**
 * Proje listesinin belirli bir DURUM sekmesi — anasayfa kartlarının hedefi.
 *
 * Varsayılan sekme adrese YAZILMAZ (CLAUDE.md: varsayılan değer URL'e girmez,
 * adres temiz kalır); bu yüzden bağlantıyı üreten tarafın da varsayılanı bilmesi
 * gerekiyor ve sabit `api/projects.ts`'te, sıralama varsayılanlarının yanında.
 */
export function projectListPathForStatus(status: ProjectStatus): string {
  if (status === DEFAULT_PROJECT_STATUS) return PROJECT_LIST_PATH

  return `${PROJECT_LIST_PATH}?${ADMIN_PARAM_KEYS.tab}=${status}`
}

export interface AdminNavItem {
  key: string
  label: string
  icon: LucideIcon
  path: string
  /** Maddeyi GÖREN roller. Boş bırakılmaz: rolsüz madde herkese açık demektir. */
  roles: readonly RoleCode[]
  /**
   * `NavLink end` — madde YALNIZ tam eşleşmede işaretlensin. Anasayfalarda şart:
   * `/admin` diğer yönetici yollarının ön eki, `end` olmadan her alt yolda iki
   * madde birden işaretli görünür.
   */
  shouldMatchExact?: boolean
  /**
   * Bir üst maddenin ALTINDA çizilen maddeler. Ayrı bir üst seviye satır
   * olmadıkları için girintili görünürler; rota ve etkin-durum davranışları
   * üst maddeyle AYNI kurallardan geçer (`AdminNavEntry`).
   *
   * Alt madde kendi rolünü taşır: üstünü gören her rol altını da görmek zorunda
   * değil.
   */
  children?: AdminNavItem[]
}

/**
 * Sol menünün TEK kaynağı: sıra, etiket ve yol burada durur. Yeni yönetici ekranı
 * eklenince yalnız bu dizi ve router.tsx değişir, AdminSidebar'a dokunulmaz.
 *
 * Her maddenin yolu VAR ve hepsinin ekranı yazıldı. Ekranı olmayan bir madde
 * gerekirse pasif düğme YAPILMAZ, karşılama sayfasına bağlanır: `disabled` düğme
 * odaklanamadığı için o madde klavye ve ekran okuyucu kullanıcısına hiç
 * görünmezdi.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // Geçici karşılama ekranı (AdminHomePage). Kendi yolu var; "Projeler" maddesiyle
  // aynı ekranı göstermesin diye proje listesine DEĞİL, /admin'e bakar.
  {
    key: 'home',
    label: 'Anasayfa',
    icon: House,
    path: ADMIN_HOME_PATH,
    roles: MANAGEMENT_SCREEN_ROLES,
    shouldMatchExact: true,
  },
  // İki Anasayfa maddesi var ama aynı anda YALNIZ BİRİ görünür: yol rolden
  // türetilmiyor, madde rolün kendi maddesi. Tek maddeye rolüne göre farklı yol
  // vermek, menüyü yolun tek kaynağı olmaktan çıkarırdı.
  {
    key: 'firmHome',
    label: 'Anasayfa',
    icon: House,
    path: FIRM_HOME_PATH,
    roles: [ROLE_CODES.projectFirmUser],
    shouldMatchExact: true,
  },
  {
    key: 'gasDistributionHome',
    label: 'Anasayfa',
    icon: House,
    path: GAS_DISTRIBUTION_HOME_PATH,
    roles: [ROLE_CODES.gasDistributionUser],
    shouldMatchExact: true,
  },
  {
    key: 'projects',
    label: 'Projeler',
    icon: FolderKanban,
    path: PROJECT_LIST_PATH,
    roles: ALL_ROLES,
  },
  {
    key: 'gasDistributionFirms',
    label: 'Gaz Dağıtım Firmaları',
    icon: Factory,
    path: GAS_DISTRIBUTION_FIRMS_PATH,
    roles: MANAGEMENT_SCREEN_ROLES,
    // Kullanıcılar ekranı firmaların ALTINDA: ikisi aynı konunun iki yüzü ve
    // ayrı üst seviye satır olarak durduklarında menüde ilişkisiz görünüyorlardı.
    // Yol DEĞİŞMEDİ — `/admin/gas-distribution-users` hâlâ doğrudan açılabiliyor
    // ve etkin durumu kendi maddesinden okuyor.
    children: [
      {
        key: 'gasDistributionUsers',
        label: 'Gaz Dağıtım Kullanıcıları',
        icon: UsersRound,
        path: GAS_DISTRIBUTION_USERS_PATH,
        // Ekran YÖNETİME özel. Gaz dağıtım kullanıcısı bir süre bu listeyi kendi
        // firmasıyla sınırlı görüyordu; çıkarıldı çünkü o rolün kendi ekranı var
        // (`GAS_DISTRIBUTION_HOME_PATH`) ve işi kullanıcı yönetmek değil proje
        // ONAYLAMAK. Liste ucu sunucuda yine `WhereVisibleTo` ile daraltılıyor —
        // buradaki değişiklik yalnız GÖRÜNÜRLÜK, yetki sınırı değil.
        roles: MANAGEMENT_SCREEN_ROLES,
      },
    ],
  },
  {
    key: 'projectFirms',
    label: 'Proje Firmaları',
    icon: Building2,
    path: PROJECT_FIRMS_PATH,
    roles: MANAGEMENT_SCREEN_ROLES,
  },
  {
    key: 'projectFirmUsers',
    label: 'Proje Firması Kullanıcıları',
    icon: Users,
    path: PROJECT_FIRM_USERS_PATH,
    roles: MANAGEMENT_SCREEN_ROLES,
  },
  { key: 'documents', label: 'Evraklar', icon: FileText, path: DOCUMENTS_PATH, roles: ALL_ROLES },
  {
    key: 'policies',
    label: 'Poliçeler',
    icon: ShieldCheck,
    path: POLICIES_PATH,
    roles: ALL_ROLES,
  },
]

/**
 * Rolün göreceği menü. Sıra korunuyor: süzgeç diziyi yeniden dizmez, yalnız
 * eler — proje firması kullanıcısında Anasayfa / Projeler / Evraklar / Poliçeler
 * sırası bu yüzden yönetici menüsündeki sırayla aynı.
 *
 * Tanınmayan (ya da olmayan) rol BOŞ menü alır. Varsayılan olarak yönetim
 * maddelerini göstermek, rol adı sunucuda değişince paneli herkese açardı.
 */
export function getNavItemsForRole(roleCode: RoleCode | undefined): AdminNavItem[] {
  if (roleCode === undefined) return []

  // Alt maddeler de KENDİ rollerinden süzülüyor: üstünü gören her rol altını da
  // görmek zorunda değil. Alt maddesi elenen üst madde kendi başına kalır.
  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(roleCode)).map((item) =>
    item.children === undefined
      ? item
      : { ...item, children: item.children.filter((child) => child.roles.includes(roleCode)) },
  )
}
