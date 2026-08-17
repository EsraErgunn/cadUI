import {
  PROJECT_FIRM_ERRORS,
  type ProjectFirmErrors,
  type ProjectFirmParsedValues,
} from './projectFirmSchema'
import type { ProjectFirm } from '../../../api/projectFirmDto'
import { normalizeTr } from '../../../api/turkishText'

/**
 * Benzersizlik ÖN KONTROLÜ (belge madde 22-24, KK-8).
 *
 * ASSUMPTION: Gaz dağıtım firma formunda benzersizliğe SUNUCU karar veriyordu.
 * Sunucu bu kuralı denetlemiyor ve 409 döndürmüyor; liste ucu ise TÜM kayıtları
 * tek seferde verdiği için karşılaştırma istemcide yapılabiliyor — ek istek
 * doğurmaz, liste ekranıyla aynı önbelleği okur. Yarış durumunu KAPATMAZ; sunucu
 * kuralı gelince bu kontrol ikinci savunma hattına düşer, kaldırılmaz.
 *
 * Seri no bugün liste satırında `null` (uç onu yalnız DETAY yanıtında veriyor,
 * bkz. knowledge/project-firm-list.md). Karşılaştırma yine de yazıldı: aynı
 * oturumda eklenen kayıt seri numarasını taşıyor ve alan liste DTO'suna
 * eklendiği gün kontrol kendiliğinden çalışmaya başlar.
 */
export function findTakenProjectFirmErrors(
  firms: readonly ProjectFirm[],
  values: ProjectFirmParsedValues,
  /**
   * Güncellenen kaydın kimliği. Kayıt KENDİSİYLE karşılaştırılmaz: aksi hâlde
   * hiçbir alanı değiştirmeden "Kaydet" demek bile "bu vergi numarası zaten
   * kullanılmaktadır" hatası verir ve güncelleme ekranı hiç kaydedilemezdi.
   * Ekleme yolunda `null` geçilir.
   */
  excludeFirmId: number | null = null,
): ProjectFirmErrors {
  const errors: ProjectFirmErrors = {}
  const taxNumber = values.taxNumber.trim()
  const serialNumber = values.serialNumber.trim()
  const others = firms.filter((firm) => firm.id !== excludeFirmId)

  if (taxNumber !== '' && others.some((firm) => matchesCode(firm.taxNumber, taxNumber))) {
    errors.taxNumber = PROJECT_FIRM_ERRORS.taxNumberTaken
  }

  if (
    serialNumber !== '' &&
    others.some((firm) => matchesCode(firm.serialNumber, serialNumber))
  ) {
    errors.serialNumber = PROJECT_FIRM_ERRORS.serialNumberTaken
  }

  return errors
}

/** Kodlar harf içerebiliyor; karşılaştırma Türkçe duyarsız (bkz. turkishText). */
function matchesCode(existing: string | null, candidate: string): boolean {
  return existing !== null && normalizeTr(existing.trim()) === normalizeTr(candidate)
}
