import { Building2 } from 'lucide-react'

import { InfoCard } from './InfoCard'
import type { ProjectFirmInfo } from '../../../api/projectDetail'
import { InfoRow } from '../InfoRow'

const CARD_TITLE = 'Proje Firma Bilgileri'

/** "Vergi D. / Vergi No" tek satırda gösteriliyor (mockup); ikisi de boşsa satır boş. */
/**
 * "Vergi Dairesi • Vergi No". Biri yoksa YALNIZ öteki yazılır: eksik yarım için
 * satır içine "—" koymak, dolu olan numarayı da eksikmiş gibi gösteriyordu.
 * Vergi DAİRESİ bugün her zaman boş — sunucuda karşılığı yok.
 */
function joinTaxInfo(office: string | null, number: string | null): string | null {
  const parts = [office, number].filter((part): part is string => part !== null)
  return parts.length === 0 ? null : parts.join(' • ')
}

/**
 * Firma künyesi — GERÇEK uçtan (`GET /api/projectfirms/{id}`).
 *
 * Kart bir süre TÜMÜYLE boştu; gerekçe "hangi firmayı soracağımızı bilmiyoruz"
 * idi. Artık biliyoruz: `GET /api/projects/{id}` yanıtı `projectFirmId`
 * taşıyor (yetki kaydından türetiliyor).
 *
 * Dört alan doluyor: ünvan, adres, telefon, vergi no. Kalan dördünün sunucuda
 * KARŞILIĞI YOK ve uydurulmuyor — firma mühendisi ve sicil numarası
 * (`ContactPerson` YETKİLİ KİŞİ, mühendis değil), Yeter No (K102'de kaldırıldı)
 * ve vergi dairesi.
 */
export function ProjectFirmCard({ firm }: { firm: ProjectFirmInfo | null }) {
  return (
    <InfoCard title={CARD_TITLE} icon={Building2}>
      <InfoRow label="Firma Mühendisi" value={firm?.engineerName ?? null} />
      <InfoRow
        label="Müh. GDF Kayıt No"
        value={firm?.engineerRegistrationNo ?? null}
      />
      <InfoRow label="Ünvanı" value={firm?.title ?? null} />
      <InfoRow label="Adres" value={firm?.address ?? null} />
      <InfoRow label="Telefon" value={firm?.phone ?? null} />
      <InfoRow label="Yeter No" value={firm?.competencyNo ?? null} />
      <InfoRow
        label="Vergi D. / Vergi No"
        value={firm === null ? null : joinTaxInfo(firm.taxOffice, firm.taxNumber)}
      />
    </InfoCard>
  )
}
