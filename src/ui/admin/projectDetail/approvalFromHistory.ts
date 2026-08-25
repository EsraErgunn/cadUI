import type { ProjectApprovalInfo, ProjectHistoryRow } from '../../../api/projectDetail'

/** Onay kaydının işlem kodu; geçmiş satırları bu kodla işaretleniyor. */
const APPROVAL_OPERATION = 'projeOnay'

/**
 * Onay künyesini İŞLEM GEÇMİŞİNDEN türetir.
 *
 * Sunucuda "onay bilgileri" diye ayrı bir uç ya da alan YOK; onay, işlem
 * geçmişine düşen bir satır (`GET /api/projects/{id}/history` →
 * `OperationHistoryListItemDto`). Kart bir süre tümüyle boştu çünkü kimse o
 * satırı okumuyordu.
 *
 * EN SON onay alınıyor: proje reddedilip yeniden onaylanabiliyor ve künye
 * yürürlükteki kararı göstermeli. Geçmiş sunucudan en yeni önce geliyor ama
 * buna GÜVENİLMİYOR — sıra değişirse künye sessizce eskir, o yüzden damgaya
 * bakılıyor.
 *
 * `approvalCode` HER ZAMAN `null`: `POST /api/projects/{id}/approve` yanıtında
 * bir kod dönüyor ama geçmiş satırında saklanmıyor, yani sayfa yenilendikten
 * sonra okunabileceği bir yer yok. Uydurmak yerine boş bırakılıyor.
 */
export function buildApprovalFromHistory(rows: ProjectHistoryRow[]): ProjectApprovalInfo | null {
  const approvals = rows.filter((row) => row.operation === APPROVAL_OPERATION)
  if (approvals.length === 0) return null

  const latest = approvals.reduce((newest, row) =>
    Date.parse(row.createdAt) > Date.parse(newest.createdAt) ? row : newest,
  )

  return {
    approvedAt: latest.createdAt,
    approverName: latest.userName,
    approvalCode: null,
    note: latest.description,
  }
}
