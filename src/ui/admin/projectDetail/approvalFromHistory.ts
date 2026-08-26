import type { ProjectApprovalInfo, ProjectHistoryRow } from '../../../api/projectDetail'

/**
 * KARAR satırlarının işlem kodları.
 *
 * Sunucu geçmiş satırına AYRI bir "işlem" kodu yazmıyor; hedef DURUM kodunu
 * yazıyor (`ProjectApprovalManager.TransitionAsync` → `OperationCodeId =
 * targetCodeId`). Onay ve ret aynı kapıdan geçtiği için ikisi de burada: kart
 * yalnız onayı okusaydı reddedilen projede tarih ve gerekçe boş kalırdı.
 *
 * "Onaya gönder" (`PendingApproval`) BİLEREK yok — o bir karar değil, karar
 * TALEBİ; künyeye girseydi kimse karar vermemişken verilmiş gibi okunurdu.
 */
const DECISION_OPERATIONS: readonly string[] = ['Approved', 'Rejected']

/**
 * Karar künyesini İŞLEM GEÇMİŞİNDEN türetir.
 *
 * Sunucuda "onay bilgileri" diye ayrı bir uç ya da alan YOK; karar, işlem
 * geçmişine düşen bir satır (`GET /api/projects/{id}/history` →
 * `OperationHistoryListItemDto`). Kart bir süre tümüyle boştu çünkü kimse o
 * satırı okumuyordu.
 *
 * EN SON karar alınıyor: proje reddedilip yeniden onaylanabiliyor (ve tersi),
 * künye yürürlükteki kararı göstermeli. Geçmiş sunucudan en yeni önce geliyor
 * ama buna GÜVENİLMİYOR — sıra değişirse künye sessizce eskir, o yüzden
 * damgaya bakılıyor.
 *
 * Açıklama satırın kendi `description`'ı: RET gerekçesi
 * (`POST /api/projects/{id}/reject` gövdesindeki metin) oraya yazılıyor,
 * onayda genelde boş kalıyor.
 *
 * "Onay Kodu" alanı EKRANDAN kaldırıldı: `POST /api/projects/{id}/approve`
 * yanıtında bir kod dönüyor ama geçmiş satırında saklanmıyor, yani sayfa
 * yenilendikten sonra okunabileceği bir yer yoktu. Kod hâlâ işlemin hemen
 * ardından çıkan bildirimde yazılıyor (`useProjectDecisions`).
 */
export function buildApprovalFromHistory(rows: ProjectHistoryRow[]): ProjectApprovalInfo | null {
  const decisions = rows.filter((row) => DECISION_OPERATIONS.includes(row.operation))
  if (decisions.length === 0) return null

  const latest = decisions.reduce((newest, row) =>
    Date.parse(row.createdAt) > Date.parse(newest.createdAt) ? row : newest,
  )

  return {
    approvedAt: latest.createdAt,
    approverName: latest.userName,
    note: latest.description,
  }
}
