import { BadgeCheck } from 'lucide-react'

import { InfoCard } from './InfoCard'
import type { ProjectApprovalInfo } from '../../../api/projectDetail'
import { InfoRow } from '../InfoRow'
import { formatDateTime } from '../adminFormat'

const CARD_TITLE = 'Proje Onay Bilgileri'

/**
 * Karar kartı. Proje hakkında henüz karar verilmemişse alanların TAMAMI "—"
 * görünür (KK-5) — bu bir eksiklik değil, kartın doğru hâli; o yüzden ayrıca
 * bir "onaylanmadı" kutusu gösterilmiyor.
 *
 * Etiketler NÖTR ("Karar …"), çünkü kart onayı da reddi de gösteriyor
 * (`buildApprovalFromHistory` en yeni kararı alıyor): "Onay Açıklama" derken
 * ret gerekçesi yazmak satırı yanlış okuturdu.
 *
 * Amber sol kenarlık `InfoCard`'ın `isAccented` varyantından geliyor (KK-4).
 */
export function ProjectApprovalCard({ approval }: { approval: ProjectApprovalInfo | null }) {
  return (
    <InfoCard title={CARD_TITLE} icon={BadgeCheck} isAccented>
      <InfoRow
        label="Karar Tarihi"
        value={approval?.approvedAt === undefined || approval.approvedAt === null
          ? null
          : formatDateTime(approval.approvedAt)}
      />
      <InfoRow label="Kararı Veren" value={approval?.approverName ?? null} />
      <InfoRow label="Karar Açıklaması" value={approval?.note ?? null} />
    </InfoCard>
  )
}
