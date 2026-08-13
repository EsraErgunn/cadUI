import { MissingSourceNotice } from '../MissingSourceNotice'
import { ProjectApprovalCard } from './ProjectApprovalCard'
import { ProjectFirmCard } from './ProjectFirmCard'
import { ProjectGeneralCard } from './ProjectGeneralCard'
import { ProjectSpecsCard } from './ProjectSpecsCard'
import { UnitDeviceTable } from './UnitDeviceTable'
import type { Sourced } from '../../../api/mockGate'
import type { ProjectDetail, ProjectUnitRow } from '../../../api/projectDetail'

interface ProjectInfoTabProps {
  detail: ProjectDetail
  units: Sourced<ProjectUnitRow[]> | undefined
  onDownloadZpd: () => void
}

/**
 * İki kolonlu kart düzeni (mockup): solda Proje Genel + Proje Firma, sağda
 * Proje Onay + Detay Bilgileri, altta tam genişlikte Birim/Cihaz tablosu.
 *
 * Kolonlar `lg:` altında alt alta iner. Tek bir `grid-cols-2` yerine iki ayrı
 * dikey yığın kullanıldı: grid hücreleri satır yüksekliğini eşitlediği için
 * kısa olan kart (Onay) uzun olanın (Genel) boyuna uzayıp altında boşluk
 * bırakıyordu.
 */
export function ProjectInfoTab({ detail, units, onDownloadZpd }: ProjectInfoTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <ProjectGeneralCard detail={detail} onDownloadZpd={onDownloadZpd} />
          <ProjectFirmCard firm={detail.extras?.firm ?? null} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <ProjectApprovalCard approval={detail.extras?.approval ?? null} />
          <ProjectSpecsCard specs={detail.extras?.specs ?? null} />
        </div>
      </div>

      {units === undefined || units.source === 'unavailable' ? (
        <MissingSourceNotice endpointHint="GET /api/projects/{id}/units" />
      ) : (
        <UnitDeviceTable units={units.data} />
      )}
    </div>
  )
}
