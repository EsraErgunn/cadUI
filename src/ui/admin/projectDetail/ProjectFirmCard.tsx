import { Building2 } from 'lucide-react'

import { InfoCard } from './InfoCard'
import type { ProjectFirmInfo } from '../../../api/projectDetail'
import { InfoRow } from '../InfoRow'

const CARD_TITLE = 'Proje Firma Bilgileri'

/**
 * Firma künyesi — GERÇEK uçtan (`GET /api/projectfirms/{id}`).
 *
 * Kart bir süre TÜMÜYLE boştu; gerekçe "hangi firmayı soracağımızı bilmiyoruz"
 * idi. Artık biliyoruz: `GET /api/projects/{id}` yanıtı `projectFirmId`
 * taşıyor (yetki kaydından türetiliyor).
 *
 * Kartın ÜÇ satırı var ve üçü de dolu: ünvan, adres, telefon.
 *
 * "Firma Mühendisi", "Müh. GDF Kayıt No", "Yeter No" ve "Vergi D." sunucuda
 * karşılıkları olmadığı için kaldırılmıştı (`ContactPerson` YETKİLİ KİŞİ,
 * mühendis değil); "Vergi No" ise karşılığı OLDUĞU hâlde ekranda istenmedi.
 * Bu adlarla yeni satır eklenmez.
 */
export function ProjectFirmCard({ firm }: { firm: ProjectFirmInfo | null }) {
  return (
    <InfoCard title={CARD_TITLE} icon={Building2}>
      <InfoRow label="Ünvanı" value={firm?.title ?? null} />
      <InfoRow label="Adres" value={firm?.address ?? null} />
      <InfoRow label="Telefon" value={firm?.phone ?? null} />
    </InfoCard>
  )
}
