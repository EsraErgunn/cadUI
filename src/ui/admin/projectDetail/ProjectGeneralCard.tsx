import { FileText } from 'lucide-react'

import { InfoCard } from './InfoCard'
import { InfoRow } from '../InfoRow'
import { ProjectStatusChip } from './ProjectStatusChip'
import { formatYesNo } from './projectDetailFormat'
import type { ProjectDetail } from '../../../api/projectDetail'
import { formatShortDate } from '../adminFormat'
import { ADMIN_CELL_LINK } from '../adminVariants'

const CARD_TITLE = 'Proje Genel Bilgileri'

interface ProjectGeneralCardProps {
  detail: ProjectDetail
  onDownloadZpd: () => void
}

/** "İl / İlçe" tek satırda; ikisinden biri boşsa satır yine de boş sayılmaz. */
function joinCityDistrict(city: string | null, district: string | null): string | null {
  if (city === null && district === null) return null
  return `${city ?? '—'} / ${district ?? '—'}`
}

export function ProjectGeneralCard({ detail, onDownloadZpd }: ProjectGeneralCardProps) {
  const { server, extras } = detail

  return (
    <InfoCard title={CARD_TITLE} icon={FileText}>
      <InfoRow label="Proje ID" value={server.pId} />
      <InfoRow label="Proje Adı" value={server.name} />

      <InfoRow
        label="Zetacad Proje Dosyası"
        isMock={extras !== null}
        value={
          extras === null ? null : (
            // Dosyayı veren uç yok; düğme yine de GERÇEK bir eylem çağırıyor ve
            // eksikliği söylüyor — `<a download>` yazılsaydı tıklama sessizce
            // hiçbir şey yapmazdı.
            <button type="button" onClick={onDownloadZpd} className={ADMIN_CELL_LINK}>
              {extras.general.zpdFileName}
            </button>
          )
        }
      />

      <InfoRow label="Proje Tarihi" value={formatShortDate(server.createdAt)} />

      <InfoRow
        label="Proje Durumu"
        isMock={extras !== null}
        value={extras === null ? null : <ProjectStatusChip status={extras.general.status} />}
      />

      <InfoRow
        label="G.D Firması"
        isMock={extras !== null}
        value={extras?.general.gasFirmName ?? null}
      />
      <InfoRow
        label="Tesisat No"
        isMock={extras !== null}
        value={extras?.general.installationNo ?? null}
      />

      <InfoRow label="İl / İlçe" value={joinCityDistrict(server.cityName, server.districtName)} />
      <InfoRow
        label="Mahalle"
        isMock={extras !== null}
        value={extras?.general.neighborhood ?? null}
      />
      <InfoRow
        label="Sokak / Kapı No"
        isMock={extras !== null}
        value={extras?.general.streetDoorNo ?? null}
      />
      <InfoRow label="Adres" value={server.addressLine} />

      <InfoRow
        label="Proje Tipi"
        isMock={extras !== null}
        value={extras?.general.projectType ?? null}
      />
      <InfoRow
        label="Isınma Tipi"
        isMock={extras !== null}
        value={extras?.general.heatingType ?? null}
      />
      <InfoRow
        label="Müstakil"
        isMock={extras !== null}
        value={extras === null ? null : formatYesNo(extras.general.isDetached)}
      />
      <InfoRow
        label="Ruhsat"
        isMock={extras !== null}
        value={extras === null ? null : formatYesNo(extras.general.hasLicense)}
      />
    </InfoCard>
  )
}
