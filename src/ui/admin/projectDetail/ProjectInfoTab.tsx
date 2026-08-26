import { QueryLoading } from '../QueryStates'
import { ProjectApprovalCard } from './ProjectApprovalCard'
import { ProjectFirmCard } from './ProjectFirmCard'
import { ProjectGeneralCard } from './ProjectGeneralCard'
import { ProjectSpecsCard } from './ProjectSpecsCard'
import { UnitDeviceTable } from './UnitDeviceTable'
import type {
  ProjectApprovalInfo,
  ProjectDetail,
  ProjectFirmInfo,
  ProjectUnitRow,
} from '../../../api/projectDetail'

interface ProjectInfoTabProps {
  detail: ProjectDetail
  units: ProjectUnitRow[] | undefined
  /** `GET /api/projectfirms/{id}`; gelmeden `null` ve kart boş satır çizer. */
  firm: ProjectFirmInfo | null
  /** İşlem geçmişinden türetiliyor; onay yoksa `null`. */
  approval: ProjectApprovalInfo | null
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
export function ProjectInfoTab({
  detail,
  units,
  firm,
  approval,
}: ProjectInfoTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <ProjectGeneralCard detail={detail} />
          <ProjectFirmCard firm={firm} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <ProjectApprovalCard approval={approval} />
          <ProjectSpecsCard specs={detail.extras?.specs ?? null} />
        </div>
      </div>

      {units === undefined ? (
        <QueryLoading message="Birim ve cihaz bilgileri yükleniyor…" />
      ) : (
        <UnitDeviceTable units={units} />
      )}
    </div>
  )
}
