import { z } from 'zod'

import { MOCK_LATENCY_MS, delay, fetchAllFirms } from './adminFirms'
import {
  createMockFirm,
  deactivateMockFirm,
  findMockFirm,
  isMockDfirmNoTaken,
  updateMockFirm,
} from './adminFirmsMock'
import {
  firmDetailDtoSchema,
  firmMessageDtoSchema,
  toFirmDetail,
  toFirmPayloadDto,
} from './gasFirmDto'
import { ApiError, hasApiBaseUrl, requestJson, requestVoid } from './http'

/**
 * API SÖZLEŞMESİ — Gaz dağıtım firmasının YAZMA uçları (ekle / güncelle /
 * pasifleştir).
 * (Liste uçları `adminFirms.ts` içinde ve HÂLÂ mock: sunucuda sayfalama/arama yok.)
 *
 * Taban yol `/api/gasdistributionfirms` — `/admin/` yok, tire yok.
 *
 * GET    /api/gasdistributionfirms/:id → FirmDetailDto
 * POST   /api/gasdistributionfirms     → 200 (201 DEĞİL) + FirmDetailDto
 * PUT    /api/gasdistributionfirms/:id → { message }   (kimlik dönmez)
 * DELETE /api/gasdistributionfirms/:id → 200, GÖVDESİZ; 404 kayıt yoksa
 *
 * **DELETE fiziksel silme DEĞİL, pasifleştirme (soft-delete).** Kayıt sunucuda
 * duruyor, yalnız listelerde görünmüyor. Arayüzün dili yine de "Sil" (ekip
 * kararı); kaydın korunduğu bilgisi onay diyaloğunun açıklamasında.
 *
 * Gövde alanları sunucunun adlarıyla: `title`, `companyNumber`, `groupId`,
 * `description`, `contactPerson`, `phone`, `address`. Bölge alanı YOK.
 * Dönüşüm `gasFirmDto.ts`'te.
 *
 * Hata gövdesi her durumda `{ "message": "..." }`; `http.ts` bunu okuyup
 * `ApiError`e çeviriyor. Firma numarası çakışması **409** ile geliyor ve
 * DURUM KODUNA göre tanınıyor — mesaj metnine göre eşleştirme YAPILMAZ.
 *
 * `VITE_API_URL` tanımlı değilse tüm uçlar mock gövdeye düşer (`hasApiBaseUrl`).
 */

const CONFLICT = 409
const NOT_FOUND = 404

const FIRMS_PATH = '/api/gasdistributionfirms'

/**
 * Tekil firma — arayüz alan adlarıyla. Liste satırından TÜRETİLMEZ: tekil yanıt
 * açıklama/telefon/adres/yetkili kişi de taşıyor, liste satırı taşımıyor.
 * `phone` null olabilir (sunucu boş bırakabiliyor).
 */
const gasDistributionFirmDetailSchema = z.object({
  id: z.number().int().positive(),
  dfirmNo: z.number().int(),
  name: z.string(),
  groupId: z.number().int().nullable(),
  groupName: z.string().nullable(),
  description: z.string().nullable(),
  contactPerson: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
})

export type GasDistributionFirmDetail = z.infer<typeof gasDistributionFirmDetailSchema>

/**
 * Ekleme/güncelleme istek gövdesi (ARAYÜZ adlarıyla; sunucuya `toFirmPayloadDto`
 * ile çevrilir). Grup artık adla değil KİMLİKLE gönderiliyor.
 *
 * Bölge alanı YOK: kavram sunucudan tümüyle kalktı, formda da hiç olmadı.
 */
export interface GasDistributionFirmPayload {
  dfirmNo: number
  name: string
  groupId: number | null
  description: string | null
  contactPerson: string | null
  address: string | null
  /** Ham rakamlar: "05551234567". Maskeli metin GÖNDERİLMEZ. */
  phone: string
}

/**
 * Firma numarası çakışması. Ayrı bir hata tipi: arayüz bunu mesaj metnine
 * bakarak değil `instanceof` ile tanır, böylece sunucunun metni değişince
 * eşleştirme sessizce kırılmaz.
 */
export class DfirmNoTakenError extends Error {
  constructor() {
    super('Firma numarası kullanımda.')
    this.name = 'DfirmNoTakenError'
  }
}

/** 409'u çakışma hatasına çevirir, gerisini olduğu gibi geçirir. */
function rethrowAsDfirmNoTaken(error: unknown): never {
  if (error instanceof ApiError && error.status === CONFLICT) throw new DfirmNoTakenError()
  throw error
}

/** Hiç kayıt yokken ilk firma numarası. */
const FIRST_DFIRM_NO = 1

/**
 * Sıradaki uygun numara: MEVCUT firma numaralarının en büyüğü + 1 (boşluklar
 * doldurulmaz). Sunucuda hazır bir uç YOK, ama sayı da uydurulmuyor —
 * `fetchAllFirms` listenin TÜM sayfalarını topluyor, yani en büyük numara ilk
 * sayfayla sınırlı kalmıyor (liste ekranının sayfalaması değişmedi).
 *
 * TODO(esra): `GET /api/gasdistributionfirms/next-no` açılınca bu gövde
 * `requestJson`'a döner, imza değişmez.
 */
export async function getNextDfirmNo(signal?: AbortSignal): Promise<number> {
  const firms = await fetchAllFirms(signal)

  return firms.reduce((largest, firm) => Math.max(largest, firm.dfirmNo), 0) + FIRST_DFIRM_NO
}

export async function getGasDistributionFirm(
  id: number,
  signal?: AbortSignal,
): Promise<GasDistributionFirmDetail> {
  if (!hasApiBaseUrl()) return getMockFirmDetail(id, signal)

  const dto = await requestJson(
    { method: 'GET', path: `${FIRMS_PATH}/${id}`, signal },
    firmDetailDtoSchema,
  )

  return gasDistributionFirmDetailSchema.parse(toFirmDetail(dto))
}

/** Ekleme yanıtı tam detay nesnesi döndürüyor; çağıranın ihtiyacı olan kimlik. */
export async function createGasDistributionFirm(
  payload: GasDistributionFirmPayload,
): Promise<number> {
  if (!hasApiBaseUrl()) return createMockGasFirm(payload)

  try {
    const dto = await requestJson(
      {
        method: 'POST',
        path: FIRMS_PATH,
        rawJsonBody: JSON.stringify(toFirmPayloadDto(payload)),
      },
      firmDetailDtoSchema,
    )
    return dto.id
  } catch (error) {
    rethrowAsDfirmNoTaken(error)
  }
}

/** `PUT` kimlik döndürmüyor; çağıranın elindeki kimlik geri verilir. */
export async function updateGasDistributionFirm(
  id: number,
  payload: GasDistributionFirmPayload,
): Promise<number> {
  if (!hasApiBaseUrl()) return updateMockGasFirm(id, payload)

  try {
    await requestJson(
      {
        method: 'PUT',
        path: `${FIRMS_PATH}/${id}`,
        rawJsonBody: JSON.stringify(toFirmPayloadDto(payload)),
      },
      firmMessageDtoSchema,
    )
    return id
  } catch (error) {
    rethrowAsDfirmNoTaken(error)
  }
}

/**
 * Firmayı PASİFLEŞTİRİR (sunucu soft-delete yapıyor). Ad bilerek
 * `deleteGasDistributionFirm` değil: çağıran taraf kaydın silinmediğini
 * fonksiyon adından görsün.
 *
 * Yanıt GÖVDESİZ; bu yüzden `requestJson` değil `requestVoid` kullanılıyor —
 * boş gövdede `response.json()` patlar ve işlem sunucuda BAŞARILIYKEN kullanıcı
 * hata görürdü.
 *
 * 404 dışında bir iş kuralı hatası bildirilmedi, o yüzden durum kodunu ayrı
 * hata tipine çeviren bir eşleme de yok: `ApiError` olduğu gibi çağırana çıkar.
 */
export async function deactivateGasDistributionFirm(id: number): Promise<void> {
  if (!hasApiBaseUrl()) {
    await deactivateMockGasFirm(id)
    return
  }

  await requestVoid({ method: 'DELETE', path: `${FIRMS_PATH}/${id}` })
}

/* ------------------------------------------------------------------ */
/* VITE_API_URL yokken kullanılan mock gövdeler. Backend ayakta değilken
   ekranın komple ölmesi yerine mock veriyle çalışmaya devam eder.     */

async function getMockFirmDetail(
  id: number,
  signal?: AbortSignal,
): Promise<GasDistributionFirmDetail> {
  await delay(MOCK_LATENCY_MS, signal)

  const firm = findMockFirm(id)
  if (firm === null) throw new ApiError(NOT_FOUND, 'Gaz dağıtım firması bulunamadı.')

  return gasDistributionFirmDetailSchema.parse(firm)
}

async function createMockGasFirm(payload: GasDistributionFirmPayload): Promise<number> {
  await delay(MOCK_LATENCY_MS)
  if (isMockDfirmNoTaken(payload.dfirmNo, null)) throw new DfirmNoTakenError()

  return createMockFirm(payload).id
}

async function updateMockGasFirm(
  id: number,
  payload: GasDistributionFirmPayload,
): Promise<number> {
  await delay(MOCK_LATENCY_MS)
  // Kaydın KENDİSİ dışlanır, yoksa her güncelleme kendi numarasına takılırdı.
  if (isMockDfirmNoTaken(payload.dfirmNo, id)) throw new DfirmNoTakenError()

  const updated = updateMockFirm(id, payload)
  if (updated === null) throw new ApiError(NOT_FOUND, 'Gaz dağıtım firması bulunamadı.')

  return updated.id
}

async function deactivateMockGasFirm(id: number): Promise<void> {
  await delay(MOCK_LATENCY_MS)

  if (!deactivateMockFirm(id)) {
    throw new ApiError(NOT_FOUND, 'Gaz dağıtım firması bulunamadı.')
  }
}
