import { z } from 'zod'

import { requestJson } from './http'

/**
 * Evrak tipleri — GERÇEK uç: `GET /api/codes/by-group-name/DocumentType`.
 *
 * Liste bir süre istemcide sabit duruyordu (18 uydurma kod). Kod grubu
 * mekanizması sunucuda zaten vardı; sabit liste yeni bir tip eklendiğinde
 * sessizce eskiyor ve o tiple yüklenmiş evrak arayüzde ham kodla görünüyordu.
 *
 * `api/codes.ts` KULLANILMIYOR: orası yalnız `{ id, name }` okuyor, burada
 * `codeValue` de gerekiyor — satırın taşıdığı tip anahtarı o.
 */

export interface DocumentType {
  /** Sunucudaki kod kimliği; evrak uçlarına `docTypeCodeId` olarak gider. */
  id: number
  /** `Code.CodeValue` — satırdaki `docTypeCode` bununla eşleşir. */
  code: string
  label: string
}

const GROUP_NAME = 'DocumentType'

/**
 * "Favori Evrak" (`FavoriteDocument`) LİSTEDEN ÇIKARILIR: favori kavramı kapsam
 * dışı ve seçilebilen ama hiçbir şey yapmayan bir tip kullanıcıya olmayan bir
 * özellik vaat ederdi. Karar sunucudan önce de böyleydi; uç bağlanınca geri
 * gelmesin diye eleme burada duruyor.
 */
const EXCLUDED_CODE_VALUES = new Set(['FavoriteDocument'])

const documentTypeDtoSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    codeValue: z.string(),
    name: z.string(),
  }),
)

/**
 * Liste filtresinin ve Evrak Ekle dropdown'ının ORTAK kaynağı (gereksinim 3):
 * iki ekran ayrı liste tutsaydı filtrede hiç görünmeyen bir tiple evrak
 * yüklenebilirdi.
 *
 * Sıralama Türkçe ve İSTEMCİDE: sunucunun sırası 'Ç' harfini 'D'den sonra
 * veriyor ve dropdown'da yanlış görünüyordu.
 */
export async function getDocumentTypes(signal?: AbortSignal): Promise<DocumentType[]> {
  const dto = await requestJson(
    { method: 'GET', path: `/api/codes/by-group-name/${GROUP_NAME}`, signal },
    documentTypeDtoSchema,
  )

  return dto
    .filter((code) => !EXCLUDED_CODE_VALUES.has(code.codeValue))
    .map((code) => ({ id: code.id, code: code.codeValue, label: code.name }))
    .sort((left, right) => left.label.localeCompare(right.label, 'tr'))
}

/** Satırdaki kodun ekranda görünecek karşılığı; tanınmayan kod HAM gösterilir —
    listeye sonradan eklenen bir tip yüzünden hücre boşalmasın. */
export function resolveDocumentTypeLabel(code: string, types: DocumentType[]): string {
  return types.find((type) => type.code === code)?.label ?? code
}

/** Filtre kodunu uca gidecek KİMLİĞE çevirir; tanınmayan kod `null` (filtre yok). */
export function resolveDocumentTypeId(
  code: string | null,
  types: DocumentType[],
): number | null {
  if (code === null) return null
  return types.find((type) => type.code === code)?.id ?? null
}
