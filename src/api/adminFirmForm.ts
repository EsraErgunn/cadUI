import { z } from 'zod'

import { MOCK_LATENCY_MS, delay } from './adminFirms'
import {
  createMockFirm,
  findMockFirm,
  isMockDfirmNoTaken,
  nextMockDfirmNo,
  updateMockFirm,
} from './adminFirmsMock'
import {
  firmDetailDtoSchema,
  firmMessageDtoSchema,
  toFirmDetail,
  toFirmPayloadDto,
} from './gasFirmDto'
import { ApiError, hasApiBaseUrl, requestJson } from './http'

/**
 * API SÖZLEŞMESİ — Gaz dağıtım firma ekle / güncelle ekranı.
 * (Liste uçları `adminFirms.ts` içinde ve HÂLÂ mock: sunucuda sayfalama/arama yok.)
 *
 * Taban yol `/api/gasdistributionfirms` — `/admin/` yok, tire yok.
 *
 * GET  /api/gasdistributionfirms/:id → FirmDetailDto
 * POST /api/gasdistributionfirms     → 200 (201 DEĞİL) + FirmDetailDto
 * PUT  /api/gasdistributionfirms/:id → { message }   (kimlik dönmez)
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
 * Tekil firma — arayüz alan adlarıyla. Liste satırından TÜRETİLMEZ: sunucunun
 * tekil yanıtında bölge (`region`) yok, liste şeması ise onu taşıyor.
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
 * `region` yok: form böyle bir alan taşımıyor ve sunucunun sözleşmesinde de
 * bölge bulunmuyor — daha önce açık soru olarak işaretlenen madde bu turda
 * kapandı.
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

/**
 * Sıradaki uygun numara. Sunucuda karşılığı HENÜZ YOK — mock hesaplıyor
 * (en büyük numaranın bir fazlası, boşluklar doldurulmaz).
 * backend `GET /api/gasdistributionfirms/next-no` açacak; uç
 * gelince bu gövde `requestJson`'a döner, imza değişmez.
 */
export async function getNextDfirmNo(signal?: AbortSignal): Promise<number> {
  await delay(MOCK_LATENCY_MS, signal)
  return nextMockDfirmNo()
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
