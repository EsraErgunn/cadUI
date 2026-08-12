import { BadgeCheck } from 'lucide-react'

import { InfoCard } from './InfoCard'
import { InfoRow } from './InfoRow'
import type { ProjectApprovalInfo } from '../../../api/projectDetail'
import { formatDateTime } from '../adminFormat'

const CARD_TITLE = 'Proje Onay Bilgileri'

/**
 * Onay kartı. Proje onaylanmamışsa alanların TAMAMI "—" görünür (KK-5) — bu
 * bir eksiklik değil, kartın doğru hâli; o yüzden ayrıca bir "onaylanmadı"
 * kutusu gösterilmiyor.
 *
 * Amber sol kenarlık `InfoCard`'ın `isAccented` varyantından geliyor (KK-4).
 */
export function ProjectApprovalCard({ approval }: { approval: ProjectApprovalInfo | null }) {
  // Onaylanmamış projede alanlar zaten boş; mock işareti yalnız DOLU bir onay
  // kaydında anlamlı — boş satıra kesikli çizgi koymak gürültü olurdu.
  const isMock = approval !== null && approval.approvalCode !== null

  return (
    <InfoCard title={CARD_TITLE} icon={BadgeCheck} isAccented>
      <InfoRow
        label="Onay Tarihi"
        value={approval?.approvedAt === undefined || approval.approvedAt === null
          ? null
          : formatDateTime(approval.approvedAt)}
        isMock={isMock}
      />
      <InfoRow label="Onay Mühendisi" value={approval?.approverName ?? null} isMock={isMock} />
      <InfoRow label="Onay Kodu" value={approval?.approvalCode ?? null} isMock={isMock} />
      <InfoRow label="Onay Açıklama" value={approval?.note ?? null} isMock={isMock} />
    </InfoCard>
  )
}
