import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { mockedData } from './mockGate'
import type { ProjectFirmUserPayload } from './projectFirmUserDto'
import {
  createMockProjectFirmUser,
  findMockTakenFields,
  updateMockProjectFirmUser,
  type MockTakenFields,
} from './projectFirmUsersMock'
import { isEndpointImplemented } from './unimplementedEndpoints'

/**
 * API SÖZLEŞMESİ — Proje firma kullanıcısı oluştur/güncelle (HENÜZ YOK).
 *
 * `POST /api/auth/register`'a BAĞLANMADI. O gövde (`RegisterRequest`) yalnız
 * `fullName`, `email`, `username`, `password`, `phone`, `roleCode` ve TEK bir
 * `projectFirmId` + `gasDistributionFirmId` ikilisi taşıyor:
 *
 * - `Aktif` (KK-18) ve `GDF Kayıt No` (KK-9) alanları yok,
 * - yetki satırı ÇOKLU olamıyor (KK-11/19/22),
 * - kullanıcıyı geri okuyacak liste/detay ucu da yok.
 *
 * Yarım bağlanırsa listelenemeyen ve güncellenemeyen kayıt üretilirdi; kaydın
 * tamamı bu yüzden mock'ta tutuluyor ve kullanıcıya "sunucuya yazılmadı" uyarısı
 * gösteriliyor (`arePersisted`). Register genişletilecek mi yoksa ayrı bir admin
 * ucu mu açılacak — açık soru, bkz. docs/api-eksikleri-kullanicilar.md
 */

export type ProjectFirmUserSaveResult =
  | {
      ok: true
      userId: number
      /**
       * Kayıt gerçekten sunucuya yazıldı mı. Bugün HER ZAMAN `false`: uç yok.
       * Karar burada veriliyor, arayüzde değil — uç açılınca koşulsuz `true`
       * olacak ve ekranlarda hiçbir şey değişmeyecek.
       */
      isPersisted: boolean
    }
  /** Üretim derlemesi: yazacak uç da yok, sahte kayıt üretme izni de (K50). */
  | { ok: false; reason: 'unavailable' }

/**
 * Oluşturma ve güncelleme TEK giriş: ekran da tek (KK-25). `userId` doluysa
 * güncelleme, `null` ise oluşturma.
 */
export async function saveProjectFirmUser(
  payload: ProjectFirmUserPayload,
  userId: number | null,
): Promise<ProjectFirmUserSaveResult> {
  const endpoint = userId === null ? 'firmUserCreate' : 'firmUserUpdate'

  if (isEndpointImplemented(endpoint)) {
    throw new Error('saveProjectFirmUser: uç bağlandı ama gövdesi yazılmadı.')
  }

  await delay(MOCK_LATENCY_MS)

  // Yazma da mock kapısından geçiyor (K50): üretimde kaydın gideceği bir yer
  // yok — bellekteki depoya yazmak, kullanıcıya yapılmamış bir işi yapılmış
  // göstermek olurdu. Liste ve detay orada zaten "kaynağı yok" diyor.
  const written = mockedData(() => {
    if (userId === null) return createMockProjectFirmUser(payload)

    updateMockProjectFirmUser(userId, payload)
    return userId
  })

  if (written.source === 'unavailable') return { ok: false, reason: 'unavailable' }
  return { ok: true, userId: written.data, isPersisted: false }
}

export type ProjectFirmUserTakenFields = MockTakenFields

/**
 * E-posta ve kullanıcı adı benzersizliği. Gereksinim (KK-16) denetimin
 * SUNUCUDA çalışmasını istiyor; uç açılana kadar mock aynı sözleşmeyi taklit
 * ediyor. İstemcide tam liste üzerinde arama YAPILMIYOR — 25 bin kayıtlık bir
 * listeyi benzersizlik için indirmek, sunucunun işini istemciye taşımak olurdu.
 */
export async function findTakenProjectFirmUserFields(
  email: string,
  username: string,
  excludedUserId: number | null,
): Promise<ProjectFirmUserTakenFields> {
  if (!isEndpointImplemented('firmUserAvailability')) {
    await delay(MOCK_LATENCY_MS)
    return findMockTakenFields(email, username, excludedUserId)
  }

  throw new Error('findTakenProjectFirmUserFields: uç bağlandı ama gövdesi yazılmadı.')
}
