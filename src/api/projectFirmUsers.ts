import { MOCK_LATENCY_MS, delay, fetchAllFirms } from './adminFirms'
import type { PagedResult } from './listQuery'
import { isMockDataAllowed, mockedData, type Sourced } from './mockGate'
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
 * - `GET /api/gasdistributionfirms`        → yetki satırının G.D. firması seçenekleri
 * - `GET /api/project-firm-authorizations` → proje firması seçenekleri (KK-20 daraltması)
 * - `GET /api/projectfirms`                → mock kullanıcı tohumu (daraltmasız tam liste)
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
 * Kullanıcı satırlarının dayandığı gerçek firma listeleri; ikisi paralel çekilir.
 *
 * Proje firmaları burada YETKİ ucundan değil `getProjectFirmList`'ten geliyor:
 * tohum tüm firmaları istiyor, oysa yetki ucu bir G.D. firmasına daraltılmadan
 * anlamlı değil.
 */
async function seedFromRealFirms(signal?: AbortSignal): Promise<void> {
  const [gasFirms, projectFirms] = await Promise.all([
    getCompetencyGasFirms(signal),
    getProjectFirmList(signal),
  ])

  seedProjectFirmUsers(
    gasFirms,
    projectFirms.map((firm) => ({ id: firm.id, name: firm.name })),
  )
}

/**
 * Sayfalama SUNUCU tarafında (madde 7, KK-12). Uç açılana kadar mock aynı
 * sözleşmeyi taklit ediyor: sorgu parametre olarak gider, yanıt yalnız o
 * sayfayı ve filtrelenmiş toplamı taşır — istemcide dilimleyen bir ara katman
 * yazılmadı (K46).
 *
 * `Sourced` zarfı ŞART (K51): satırların KULLANICI kısmı uydurma ve ekran bunu
 * söylemek zorunda. Üretim derlemesinde liste hiç kurulmaz — uydurma bir
 * kullanıcı kadrosu bir demoda gerçek sanılırdı; orada ekran "kaynağı yok" der.
 */
export async function getProjectFirmUserList(
  query: ProjectFirmUserQuery,
  signal?: AbortSignal,
): Promise<Sourced<PagedResult<ProjectFirmUserRow>>> {
  if (isEndpointImplemented('firmUserList')) {
    throw new Error('getProjectFirmUserList: uç bağlandı ama gövdesi yazılmadı.')
  }

  // Tohum GERÇEK firma uçlarından geliyor; üretimde onu da çekmenin anlamı yok.
  if (!isMockDataAllowed()) return mockedData(() => queryMockProjectFirmUsers(query))

  await seedFromRealFirms(signal)
  await delay(MOCK_LATENCY_MS, signal)
  return mockedData(() => queryMockProjectFirmUsers(query))
}

/**
 * Güncelleme ekranını dolduran kayıt (KK-25).
 *
 * Listeyle AYNI zarf (K51): uydurma bir kişinin adı, e-postası ve telefonu
 * doldurulmuş bir form, tablodaki uydurma satırdan daha inandırıcı görünür.
 * Üretim derlemesinde kayıt hiç kurulmaz, ekran "kaynağı yok" der.
 */
export async function getProjectFirmUser(
  userId: number,
  signal?: AbortSignal,
): Promise<Sourced<ProjectFirmUserDetail>> {
  if (isEndpointImplemented('firmUserDetail')) {
    throw new Error('getProjectFirmUser: uç bağlandı ama gövdesi yazılmadı.')
  }

  if (!isMockDataAllowed()) return { source: 'unavailable', data: null }

  // Doğrudan güncelleme adresine gelen kullanıcı için satırlar henüz
  // tohumlanmamış olabilir; liste ekranından geçmek şart olmasın.
  await seedFromRealFirms(signal)
  await delay(MOCK_LATENCY_MS, signal)

  const user = findMockProjectFirmUser(userId)
  // Bulunamayan kayıt "kaynak yok" DEĞİL gerçek bir hata: adres yanlış.
  if (user === null) throw new Error('Kullanıcı bulunamadı.')
  return mockedData(() => user)
}
