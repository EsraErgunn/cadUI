import { Building2 } from 'lucide-react'

import { InfoCard } from './InfoCard'
import type { ProjectFirmInfo } from '../../../api/projectDetail'
import { InfoRow } from '../InfoRow'

const CARD_TITLE = 'Proje Firma Bilgileri'

/** "Vergi D. / Vergi No" tek satırda gösteriliyor (mockup); ikisi de boşsa satır boş. */
function joinTaxInfo(office: string | null, number: string | null): string | null {
  if (office === null && number === null) return null
  return `${office ?? '—'} • ${number ?? '—'}`
}

/**
 * Kartın TAMAMI mock. Projeyi firmaya bağlayan alan uçta
 * `projectFirmAuthorizationId` ve o yetki kayıtlarını çözen bir uç YOK
 * (K49'daki sabitin sebebi de bu); `GET /api/projectfirms/{id}` var ama hangi
 * firmayı soracağımızı bilmiyoruz. Firma mühendisi ve Yeter No zaten hiçbir
 * uçta yok.
 */
export function ProjectFirmCard({ firm }: { firm: ProjectFirmInfo | null }) {
  const isMock = firm !== null

  return (
    <InfoCard title={CARD_TITLE} icon={Building2}>
      <InfoRow label="Firma Mühendisi" value={firm?.engineerName ?? null} isMock={isMock} />
      <InfoRow
        label="Müh. GDF Kayıt No"
        value={firm?.engineerRegistrationNo ?? null}
        isMock={isMock}
      />
      <InfoRow label="Ünvanı" value={firm?.title ?? null} isMock={isMock} />
      <InfoRow label="Adres" value={firm?.address ?? null} isMock={isMock} />
      <InfoRow label="Telefon" value={firm?.phone ?? null} isMock={isMock} />
      <InfoRow label="Yeter No" value={firm?.competencyNo ?? null} isMock={isMock} />
      <InfoRow
        label="Vergi D. / Vergi No"
        value={firm === null ? null : joinTaxInfo(firm.taxOffice, firm.taxNumber)}
        isMock={isMock}
      />
    </InfoCard>
  )
}
