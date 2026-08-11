import { MOCK_LATENCY_MS, delay, fetchAllFirms } from './adminFirms'
import type { PagedResult } from './listQuery'
import type {
  FirmReference,
  ProjectFirmUserDetail,
  ProjectFirmUserQuery,
  ProjectFirmUserRow,
} from './projectFirmUserDto'
import {
  findMockProjectFirmUser,
  queryMockProjectFirmUsers,
  seedProjectFirmUsers,
} from './projectFirmUsersMock'
import { getProjectFirmList } from './projectFirms'
import { isEndpointImplemented } from './unimplementedEndpoints'

/**
 * API SÖZLEŞMESİ — Proje firması kullanıcıları.
 *
 * KULLANICI UÇLARI SUNUCUDA YOK. cadapi'de kullanıcı controller'ı bulunmuyor;
 * `AuthController` yalnız login/register/me/logout taşıyor ve `User` tablosu
 * kullanıcı başına TEK (proje firması, G.D. firması) ikilisi tutuyor — yani
 * "her yetki ayrı satır" (KK-11) şemada ifade edilemiyor. Eksiklerin dökümü ve
 * önerilen sözleşme: docs/api-eksikleri-kullanicilar.md
 *
 * FİRMALAR İSE GERÇEK UÇTAN GELİYOR:
 * - `GET /api/gasdistributionfirms` → yetki satırının G.D. firması seçenekleri
 * - `GET /api/projectfirms`         → proje firması seçenekleri
 *
 * Kullanıcı satırları bu iki gerçek listeden TOHUMLANIYOR (`seedProjectFirmUsers`).
 * Böylece formdaki seçeneklerle listedeki kayıtlar aynı firmaları gösteriyor;
 * uydurulan tek şey kullanıcının kendisi.
 *
 * Mock'a düşme kararı `hasApiBaseUrl`'e değil UÇ BAZLI bayrağa bağlı
 * (`unimplementedEndpoints.ts`, docs/kararlar.md K46).
 */

export const PROJECT_FIRM_USER_PAGE_SIZE = 30

/** G.D. firmasının seçim kutusundaki etiketi; grup adı varsa ayırt etsin diye eklenir. */
function toGasFirmLabel(firm: { name: string; groupName: string | null }): string {
  return firm.groupName === null ? firm.name : `${firm.groupName} — ${firm.name}`
}

/**
 * Yetki satırının G.D. firması seçenekleri — GERÇEK uç.
 * Sıralama istemcide ve Türkçe: sunucu 'Ç'yi 'D'den sonra veriyor.
 */
export async function getCompetencyGasFirms(signal?: AbortSignal): Promise<FirmReference[]> {
  const firms = await fetchAllFirms(signal)

  return firms
    .map((firm) => ({ id: firm.id, name: toGasFirmLabel(firm) }))
    .sort((left, right) => left.name.localeCompare(right.name, 'tr'))
}

/**
 * Proje firması seçenekleri — GERÇEK uç.
 *
 * KK-20 listeyi "seçilen G.D. firmasında yeterliliği olan" firmalarla
 * sınırlandırmak istiyor ama sunucuda bu bağı veren bir uç YOK: `ProjectFirmAuthorization`
 * tablosu proje firmasını GDF-bölgesine bağlıyor, onu okuyan bir uç açılmamış.
 * Bu yüzden bugün TÜM proje firmaları listeleniyor. Daraltma yapılmadığı için
 * kutu yine de firma seçilmeden PASİF kalıyor — sıra kuralı korunuyor, sessizce
 * yanlış bir daraltma uydurulmuyor.
 */
export async function getAuthorizedProjectFirms(
  // Bugün kullanılmıyor; daraltmayı veren uç açılınca imza değişmeden sunucuya geçecek.
  _gasDistributionFirmId: number,
  signal?: AbortSignal,
): Promise<FirmReference[]> {
  const firms = await getProjectFirmList(signal)

  return firms
    .map((firm) => ({ id: firm.id, name: firm.name }))
    .sort((left, right) => left.name.localeCompare(right.name, 'tr'))
}

/** Kullanıcı satırlarının dayandığı gerçek firma listeleri; ikisi paralel çekilir. */
async function seedFromRealFirms(signal?: AbortSignal): Promise<void> {
  const [gasFirms, projectFirms] = await Promise.all([
    getCompetencyGasFirms(signal),
    getAuthorizedProjectFirms(0, signal),
  ])

  seedProjectFirmUsers(gasFirms, projectFirms)
}

/**
 * Sayfalama SUNUCU tarafında (madde 7, KK-12). Uç açılana kadar mock aynı
 * sözleşmeyi taklit ediyor: sorgu parametre olarak gider, yanıt yalnız o
 * sayfayı ve filtrelenmiş toplamı taşır — istemcide dilimleyen bir ara katman
 * yazılmadı (K46).
 */
export async function getProjectFirmUserList(
  query: ProjectFirmUserQuery,
  signal?: AbortSignal,
): Promise<PagedResult<ProjectFirmUserRow>> {
  if (!isEndpointImplemented('firmUserList')) {
    await seedFromRealFirms(signal)
    await delay(MOCK_LATENCY_MS, signal)
    return queryMockProjectFirmUsers(query)
  }

  throw new Error('getProjectFirmUserList: uç bağlandı ama gövdesi yazılmadı.')
}

/** Güncelleme ekranını dolduran kayıt (KK-25). */
export async function getProjectFirmUser(
  userId: number,
  signal?: AbortSignal,
): Promise<ProjectFirmUserDetail> {
  if (!isEndpointImplemented('firmUserDetail')) {
    // Doğrudan güncelleme adresine gelen kullanıcı için satırlar henüz
    // tohumlanmamış olabilir; liste ekranından geçmek şart olmasın.
    await seedFromRealFirms(signal)
    await delay(MOCK_LATENCY_MS, signal)

    const user = findMockProjectFirmUser(userId)
    if (user === null) throw new Error('Kullanıcı bulunamadı.')
    return user
  }

  throw new Error('getProjectFirmUser: uç bağlandı ama gövdesi yazılmadı.')
}
