import { z } from 'zod'

import { MOCK_LATENCY_MS, delay, gasDistributionFirmSchema } from './adminFirms'
import {
  createMockFirm,
  findMockFirm,
  isMockDfirmNoTaken,
  nextMockDfirmNo,
  updateMockFirm,
} from './adminFirmsMock'
import { ApiError } from './http'

/**
 * API SÖZLEŞMESİ — Gaz dağıtım firma ekle / güncelle ekranı.
 * (Liste uçları `adminFirms.ts` içinde.)
 *
 * GET /api/admin/gas-distribution-firms/next-no → { dfirmNo }
 * - Sıradaki uygun numara SUNUCUDA hesaplanır; istemci listeden türetemez
 *   çünkü sayfalama sunucu taraflı ve tek sayfada 30 kayıt var.
 * - Silinen kayıtların boşlukları DOLDURULMAZ (belge: numaralar yeniden
 *   düzenlenmez), en büyüğün bir fazlası verilir.
 *
 * GET /api/admin/gas-distribution-firms/:id → GasDistributionFirmDetail
 * - Güncelleme ekranı formu bu yanıtla doldurur.
 *
 * POST /api/admin/gas-distribution-firms   (gövde = GasDistributionFirmPayload)
 * 201 → { id }
 * 409 → firma numarası çakışması
 *
 * PUT /api/admin/gas-distribution-firms/:id   (gövde = GasDistributionFirmPayload)
 * 200 → { id }
 *
 * Benzersizliğe SUNUCU karar verir; istemci ön kontrolü YOKTUR — yarış durumu
 * istemcide kapatılamaz. Çakışma `DfirmNoTakenError` olarak yükselir ve arayüzde
 * Firma No alanına bağlanır. Hata mesaj METNİNE göre eşleştirilmez.
 * TODO(esra): 409 gövdesindeki ayırt edici kodun adı backend'le doğrulanacak.
 */

const NOT_FOUND = 404

/**
 * Tekil firma: liste satırının taşımadığı alanlar burada. Liste üç sütun
 * gösteriyor, bu alanları her satır için taşımak boşuna yük olurdu.
 * `phone` HAM rakam (maskesiz) — maskeyi arayüz `core/phone.ts` ile kurar.
 */
const gasDistributionFirmDetailSchema = gasDistributionFirmSchema.extend({
  description: z.string().nullable(),
  contactPerson: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string(),
})

const savedFirmSchema = z.object({ id: z.number().int().positive() })

const nextDfirmNoSchema = z.object({ dfirmNo: z.number().int().positive() })

export type GasDistributionFirmDetail = z.infer<typeof gasDistributionFirmDetailSchema>

/**
 * Ekleme/güncelleme istek gövdesi.
 *
 * `region` BİLEREK yok: form böyle bir alan taşımıyor (belge de tanımlamıyor) ve
 * üst bardaki bölge seçimi bir FİLTRE, kayıt verisi değil. Yeni kaydın bölgeyi
 * nasıl aldığı açık soru — varsayımla gövdeye konmadı.
 */
export interface GasDistributionFirmPayload {
  dfirmNo: number
  name: string
  groupName: string | null
  description: string | null
  contactPerson: string | null
  address: string | null
  /** Ham rakamlar: "05551234567". Maskeli metin GÖNDERİLMEZ. */
  phone: string
}

/**
 * Firma numarası çakışması. Ayrı bir hata tipi: arayüz bunu mesaj metnine
 * bakarak değil `instanceof` ile tanır, böylece sunucunun mesajı değişince
 * eşleştirme sessizce kırılmaz.
 */
export class DfirmNoTakenError extends Error {
  constructor() {
    super('Firma numarası kullanımda.')
    this.name = 'DfirmNoTakenError'
  }
}

/**  gerçek `GET /api/admin/gas-distribution-firms/next-no`. */
export async function getNextDfirmNo(signal?: AbortSignal): Promise<number> {
  await delay(MOCK_LATENCY_MS, signal)
  return nextDfirmNoSchema.parse({ dfirmNo: nextMockDfirmNo() }).dfirmNo
}

/**  gerçek `GET /api/admin/gas-distribution-firms/:id`. */
export async function getGasDistributionFirm(
  id: number,
  signal?: AbortSignal,
): Promise<GasDistributionFirmDetail> {
  await delay(MOCK_LATENCY_MS, signal)

  const firm = findMockFirm(id)
  if (firm === null) throw new ApiError(NOT_FOUND, 'Firma bulunamadı.')

  return gasDistributionFirmDetailSchema.parse(firm)
}

/**  gerçek `POST /api/admin/gas-distribution-firms`; 409 → DfirmNoTakenError. */
export async function createGasDistributionFirm(
  payload: GasDistributionFirmPayload,
): Promise<number> {
  await delay(MOCK_LATENCY_MS)

  if (isMockDfirmNoTaken(payload.dfirmNo, null)) throw new DfirmNoTakenError()

  return savedFirmSchema.parse({ id: createMockFirm(payload).id }).id
}

/**  gerçek `PUT /api/admin/gas-distribution-firms/:id`. */
export async function updateGasDistributionFirm(
  id: number,
  payload: GasDistributionFirmPayload,
): Promise<number> {
  await delay(MOCK_LATENCY_MS)

  // Kaydın KENDİSİ dışlanarak kontrol ediliyor: numara güncellemede salt okunur
  // olsa da dışlama olmasaydı her güncelleme kendi numarasına takılırdı.
  if (isMockDfirmNoTaken(payload.dfirmNo, id)) throw new DfirmNoTakenError()

  const updated = updateMockFirm(id, payload)
  if (updated === null) throw new ApiError(NOT_FOUND, 'Firma bulunamadı.')

  return savedFirmSchema.parse({ id: updated.id }).id
}
