import {
  GAS_DISTRIBUTION_FIRMS_PATH,
  GAS_DISTRIBUTION_USERS_PATH,
  PROJECT_FIRMS_PATH,
  PROJECT_FIRM_USERS_PATH,
} from './adminNavItems'
import { PROJECT_LIST_PATH } from '../../pages/useCloseEditor'

/**
 * Üst bardaki genel aramanın YERİNDE çalıştığı liste ekranları.
 *
 * Kural sunucudan geliyor, arayüz tercihinden değil: bu dört ekranın beslendiği
 * uç `q` parametresini alıp Elastic üzerinden arıyor (cadapi —
 * `ProjectManager`, `ProjectFirmManager`, `GasDistributionFirmManager`,
 * `UserManager`). İki KULLANICI ekranı aynı ucu (`GET /api/users`) ve aynı
 * `users` dizinini kullandığı için ikisi de burada.
 *
 * Adres KALIBI eşleşiyor, tam eşitlik değil: `/projects` altındaki detay ve
 * editör YOLLARI listeye ait değil (`/projects/42`), oralarda arama projelere
 * yönlenmeli. Bu yüzden karşılaştırma "tam eşit" ile yapılıyor.
 */
const IN_PLACE_SEARCH_PATHS: readonly string[] = [
  PROJECT_LIST_PATH,
  PROJECT_FIRMS_PATH,
  GAS_DISTRIBUTION_FIRMS_PATH,
  GAS_DISTRIBUTION_USERS_PATH,
  PROJECT_FIRM_USERS_PATH,
]

/** Sondaki eğik çizgi adresi başka bir ekran yapmaz (`/projects/` = `/projects`). */
function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

/**
 * Arama bulunulan ekranda mı yapılacak?
 *
 * `false` dönen her ekranda arama PROJE listesine taşınır — o ekranların ucu
 * metin araması almıyor ve kutuyu sessizce etkisiz bırakmak, kullanıcıya
 * "aradım, sonuç yok" dedirtirdi.
 */
export function isInPlaceSearchPath(pathname: string): boolean {
  return IN_PLACE_SEARCH_PATHS.includes(normalizePath(pathname))
}
