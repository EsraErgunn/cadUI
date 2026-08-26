import { FileText } from 'lucide-react'

import { InfoCard } from './InfoCard'
import { InfoRow } from '../InfoRow'
import { ProjectStatusChip } from './ProjectStatusChip'
import { formatYesNo } from './projectDetailFormat'
import type { ProjectDetail } from '../../../api/projectDetail'
import { formatShortDate } from '../adminFormat'

const CARD_TITLE = 'Proje Genel Bilgileri'

interface ProjectGeneralCardProps {
  detail: ProjectDetail
}

/** "İl / İlçe" tek satırda; ikisinden biri boşsa satır yine de boş sayılmaz. */
function joinCityDistrict(city: string | null, district: string | null): string | null {
  if (city === null && district === null) return null
  return `${city ?? '—'} / ${district ?? '—'}`
}

export function ProjectGeneralCard({ detail }: ProjectGeneralCardProps) {
  const { server, extras } = detail

  return (
    <InfoCard title={CARD_TITLE} icon={FileText}>
      {/* İki AYRI alan: kimlik sunucunun `Id`si, kod ise projenin kendi
          bina/proje kodu (`buildingCode`). Bir süre ikisi tek satırda
          birleşikti ve kodu olmayan projede kimlik "kod" diye gösteriliyordu. */}
      <InfoRow label="Proje ID" value={String(server.id)} />
      <InfoRow label="Proje Kodu" value={server.buildingCode} />
      <InfoRow label="Proje Adı" value={server.name} />

      <InfoRow label="Proje Tarihi" value={formatShortDate(server.createdAt)} />

      <InfoRow
        label="Proje Durumu"
        value={
          extras === null || extras.general.status === null ? null : (
            <ProjectStatusChip status={extras.general.status} />
          )
        }
      />

      <InfoRow
        label="G.D Firması"
        value={extras?.general.gasFirmName ?? null}
      />

      <InfoRow label="İl / İlçe" value={joinCityDistrict(server.cityName, server.districtName)} />
      <InfoRow label="Adres" value={server.addressLine} />

      <InfoRow
        label="Proje Tipi"
        value={extras?.general.projectType ?? null}
      />
      <InfoRow
        label="Isınma Tipi"
        value={extras?.general.heatingType ?? null}
      />
      <InfoRow
        label="Ruhsat"
        value={extras === null ? null : formatYesNo(extras.general.hasLicense)}
      />
    </InfoCard>
  )
}
