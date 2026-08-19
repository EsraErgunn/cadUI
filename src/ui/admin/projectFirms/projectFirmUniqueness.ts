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
 * YALNIZ vergi numarası bakılıyor. Seri no kontrolü KALKTI (K102) — alan
 * tümüyle kaldırıldı. T.C. kimlik numarası da BURADA DEĞİL: liste satırı onu
 * taşımıyor ve sunucu zaten 409 döndürüyor (silinmiş firma bile numarayı
 * rezerve tutuyor), yani ön kontrol hem yapılamaz hem gereksiz.
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
  // Şahıs firmasında vergi numarası gövdeye hiç girmiyor; kontrol de gereksiz.
  if (values.isSoleProprietorship) return errors

  const taxNumber = values.taxNumber.trim()
  const others = firms.filter((firm) => firm.id !== excludeFirmId)

  if (taxNumber !== '' && others.some((firm) => matchesCode(firm.taxNumber, taxNumber))) {
    errors.taxNumber = PROJECT_FIRM_ERRORS.taxNumberTaken
  }

  return errors
}

/** Kodlar harf içerebiliyor; karşılaştırma Türkçe duyarsız (bkz. turkishText). */
function matchesCode(existing: string | null, candidate: string): boolean {
  return existing !== null && normalizeTr(existing.trim()) === normalizeTr(candidate)
}
