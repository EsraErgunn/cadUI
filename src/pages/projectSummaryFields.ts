import type { ProjectHistoryRow } from '../api/projectDetail'
import { ROLE_CODES } from '../api/roles'

/**
 * Projeyi OLUŞTURAN işlem. Geçmiş satırlarının kodu sunucuda parametrik
 * (`OperationHistory.OperationCode`); bu iki kod bugün tanımlı olanlar.
 */
const CREATE_OPERATION = 'projeKayit'
const APPROVE_OPERATION = 'projeOnay'

/**
 * Geçmiş satırındaki rolün SİSTEM YÖNETİCİSİNE ait olduğunu söyleyen değerler.
 *
 * ⚠️ Bu bir METİN eşleştirmesi ve kırılgan. `OperationHistoryDto` yalnız
 * `roleSnapshot` (serbest metin) taşıyor, `roleCode` taşımıyor — oysa
 * `roles.ts` rol kontrolünün ad metniyle DEĞİL kodla yapılmasını söylüyor.
 * Kullanıcı kaydından bildiğimiz iki değer de (`roleCode: "Admin"`,
 * `roleName: "Yönetici"`) burada listeli, çünkü sunucunun hangisini
 * gönderdiğini görmedik.
 *
 * TODO(esra): `OperationHistoryDto`ya `roleCode` eklenince bu liste silinip
 * kontrol `ROLE_CODES.admin` ile yapılacak.
 */
const ADMIN_ROLE_SNAPSHOTS: readonly string[] = [ROLE_CODES.admin, 'Yönetici']

function isAdminRole(roleSnapshot: string): boolean {
  const normalized = roleSnapshot.trim().toLocaleLowerCase('tr')
  return ADMIN_ROLE_SNAPSHOTS.some(
    (candidate) => candidate.toLocaleLowerCase('tr') === normalized,
  )
}

/**
 * Kodu eşleşen satırlardan EN ERKENİ. Sunucunun sıralamasına güvenilmiyor:
 * geçmiş listesi ekranda yeniden sıralanabiliyor ve dizinin ilk elemanı en eski
 * olmayabilir.
 */
function findEarliest(
  rows: readonly ProjectHistoryRow[],
  operation: string,
): ProjectHistoryRow | undefined {
  return rows
    .filter((row) => row.operation === operation)
    .reduce<ProjectHistoryRow | undefined>(
      (earliest, row) =>
        earliest === undefined || row.createdAt < earliest.createdAt ? row : earliest,
      undefined,
    )
}

/** Kodu eşleşen satırlardan EN GEÇİ — proje yeniden onaylanmış olabilir. */
function findLatest(
  rows: readonly ProjectHistoryRow[],
  operation: string,
): ProjectHistoryRow | undefined {
  return rows
    .filter((row) => row.operation === operation)
    .reduce<ProjectHistoryRow | undefined>(
      (latest, row) => (latest === undefined || row.createdAt > latest.createdAt ? row : latest),
      undefined,
    )
}

/**
 * Ekranda boş kullanıcı adı için basılan yer tutucu. KÂĞITTA kullanılmaz:
 * kapakta "Bilinmeyen kullanıcı" yazmak, boş bırakmaktan daha yanlış olur.
 */
const UNKNOWN_USER_LABEL = 'Bilinmeyen kullanıcı'

function toPrintableName(value: string | null | undefined): string {
  const trimmed = value?.trim()
  if (trimmed === undefined || trimmed === '' || trimmed === UNKNOWN_USER_LABEL) return ''
  return trimmed
}

/**
 * Kapaktaki "PROJE TASARIMCISI" satırı (K159).
 *
 * Kaynak proje GEÇMİŞİDİR, oturumdaki kullanıcı değil: projeyi A çizip B
 * bastırdığında kapakta B'nin adı yazardı ve aynı belge her basımda farklı bir
 * isim taşırdı. Geçmişteki `projeKayit` satırı kim bastırırsa bastırsın aynı
 * kalıyor — sunucuya yeni bir alan eklemeden.
 *
 * Kural tek cümleye iniyor: **oluşturan kişi bir proje firması kullanıcısıysa
 * onun adı, değilse proje firmasının YETKİLİSİ.** İkinci dala iki yol düşüyor:
 *
 * - Projeyi SİSTEM YÖNETİCİSİ oluşturmuş. Hesap bir kişi değil ("Sistem
 *   Yöneticisi") ve projenin tasarımcısı da değil (kullanıcı kararı).
 * - Geçmişte `projeKayit` satırı YOK. Ölçüldü (2026-08): admin'in açtığı
 *   projede `GET /api/projects/{id}/history` boş dizi dönüyor. Önce burada boş
 *   bırakılıyordu ve kapaktaki kaşe kutusu bomboş çıkıyordu.
 *
 * ⚠️ Yetkili UYDURMA DEĞİL: projenin bağlı olduğu firmanın kayıtlı yetkilisi,
 * yani firmanın o projeden sorumlu mühendisi.
 */
export function getProjectDesignerName(
  historyRows: readonly ProjectHistoryRow[],
  firmContactPerson: string | null,
): string {
  const created = findEarliest(historyRows, CREATE_OPERATION)
  if (created && !isAdminRole(created.roleSnapshot)) return toPrintableName(created.userName)

  return toPrintableName(firmContactPerson)
}

/**
 * Kapaktaki "ONAYLAYAN" satırı (K159). `GET /api/projects/{id}` onay bilgisi
 * döndürmüyor; onaylayanın adı yalnız geçmişteki `projeOnay` satırında var.
 *
 * Onaylanmamış projede boş kalır.
 */
export function getProjectApproverName(historyRows: readonly ProjectHistoryRow[]): string {
  return toPrintableName(findLatest(historyRows, APPROVE_OPERATION)?.userName)
}

/**
 * Tam adresten sokak adı ve kapı numarasını ayırır — vaziyet planı bu ikisini
 * ayrı yazıyor (K159).
 *
 * ⚠️ Desen üç noktada düzeltildi; eskisi ayrı bir `streetDoorNo` alanı için
 * yazılmıştı ("1.YERLİ SOKAK No:66") ve TAM ADRESTE bozuluyordu:
 *
 * - `\b` sınırı: "Bornova" içindeki "no" hecesi eşleşiyordu — ölçüldü,
 *   `"...No 12 Bornova/İzmir"` kapı numarasını `"va/İzmir"` diye okuyordu.
 * - Rakam zorunluluğu: "Nolu Sokak" gibi sözcükler tetiklemesin.
 * - Sona SABİTLENMEZ: adresin devamı (ilçe/il) numaradan sonra geliyor ve eski
 *   desen bu yüzden hiç eşleşmiyordu.
 *
 * "No" hiç yoksa tamamı sokak adı sayılır ve kapı numarası BOŞ kalır — tahmin
 * etmektense boş bırakmak doğru, paftaya yanlış numara yazmaktan iyidir.
 */
export function splitStreetDoorNo(value: string): {
  streetName: string
  doorNumber: string
} {
  const match = /^(.*?)[\s,]*\bno[.:]?\s*([0-9][\w/-]*)/i.exec(value)
  if (!match) return { streetName: value.trim(), doorNumber: '' }

  return { streetName: match[1].trim(), doorNumber: match[2].trim() }
}
