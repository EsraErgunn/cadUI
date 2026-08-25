import { ShieldPlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { InfoBanner } from './InfoBanner'
import type { ProjectPolicyRow } from '../../../api/projectDetail'
import { DataTable, type DataTableColumn } from '../DataTable'
import { EmptyValue } from '../EmptyValue'
import { QueryLoading } from '../QueryStates'
import { formatCurrency, formatPlainDate } from '../adminFormat'
import { policyCreatePath } from '../adminNavItems'
import { adminButtonVariants } from '../adminVariants'
import { useCanWriteProjectContent } from '../useRole'
import { detailBadgeVariants } from './projectDetailVariants'

const EMPTY_MESSAGE = 'Proje Poliçe Kaydı Bulunamamıştır.'

const DELETED_UNIT_LABEL = 'Silinmiş Birim'
const DELETED_UNIT_TITLE =
  'Poliçenin bağlı olduğu bağımsız bölüm çizimden silindi. Poliçe iptal edilmedi, kaydı duruyor.'

const TABLE_CAPTION = 'Projeye bağlı poliçeler.'

const COLUMNS: DataTableColumn<ProjectPolicyRow>[] = [
  {
    key: 'policyNumber',
    label: 'Poliçe No',
    cell: (row) => (row.policyNumber === null ? <EmptyValue /> : row.policyNumber),
  },
  {
    key: 'company',
    label: 'Sigorta Şirketi',
    cell: (row) => (row.insuranceCompanyName === null ? <EmptyValue /> : row.insuranceCompanyName),
  },
  {
    key: 'unit',
    label: 'Birim',
    // Birim silinince sunucu bağı koparıyor (`ProjectUnitId` null) ama poliçeyi
    // İPTAL ETMİYOR. Hücre boş kalsaydı kayıt eksik veriymiş gibi okunurdu;
    // rozet sebebini söylüyor.
    cell: (row) =>
      row.isUnitDeleted ? (
        <span className={detailBadgeVariants({ tone: 'warning' })} title={DELETED_UNIT_TITLE}>
          {DELETED_UNIT_LABEL}
        </span>
      ) : row.unitNumber === null ? (
        <EmptyValue />
      ) : (
        row.unitNumber
      ),
  },
  {
    key: 'amount',
    label: 'Tutar',
    cellClassName: 'text-right tabular-nums',
    cell: (row) => formatCurrency(row.amount) ?? <EmptyValue />,
  },
  {
    key: 'startDate',
    label: 'Başlangıç',
    cell: (row) => formatPlainDate(row.startDate) ?? <EmptyValue />,
  },
  {
    key: 'endDate',
    label: 'Bitiş',
    cell: (row) => formatPlainDate(row.endDate) ?? <EmptyValue />,
  },
]

export function ProjectPolicyTab({
  projectId,
  policies,
}: {
  /** Oluşturulan poliçe GELİNEN projeyle ilişkilendirilir (KK-15); ekran
      kimliksiz açılamaz, o yüzden bağlantı kimliği taşır. */
  projectId: number
  policies: ProjectPolicyRow[] | undefined
}) {
  // Poliçe OLUŞTURMA sunucuda `Admin, ProjectFirmUser`'a açık
  // (`POST /api/policies`); gaz dağıtım kullanıcısı poliçeleri görür, açamaz.
  const canWriteContent = useCanWriteProjectContent()

  return (
    <div className="flex flex-col gap-4">
      {canWriteContent && (
        <div>
          <Link
            to={policyCreatePath(projectId)}
            className={adminButtonVariants({ tone: 'primary' })}
          >
            <ShieldPlus aria-hidden className="size-4" />
            Poliçelendir
          </Link>
        </div>
      )}

      {policies === undefined ? (
        <QueryLoading message="Poliçeler yükleniyor…" />
      ) : policies.length === 0 ? (
        <InfoBanner message={EMPTY_MESSAGE} />
      ) : (
        <DataTable
          rows={policies}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          caption={TABLE_CAPTION}
          emptyMessage={EMPTY_MESSAGE}
        />
      )}
    </div>
  )
}
