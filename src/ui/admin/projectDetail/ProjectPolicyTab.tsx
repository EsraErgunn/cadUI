import { ShieldPlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { InfoBanner } from './InfoBanner'
import type { Sourced } from '../../../api/mockGate'
import type { ProjectPolicyRow } from '../../../api/projectDetail'
import { DataTable, type DataTableColumn } from '../DataTable'
import { EmptyValue } from '../EmptyValue'
import { MissingSourceNotice } from '../MissingSourceNotice'
import { formatCurrency, formatPlainDate } from '../adminFormat'
import { policyCreatePath } from '../adminNavItems'
import { adminButtonVariants } from '../adminVariants'
import { detailBadgeVariants } from './projectDetailVariants'

const EMPTY_MESSAGE = 'Proje Poliçe Kaydı Bulunamamıştır.'

/** Poliçenin durumu tek değerli: kayıt oluştuğu anda onaylanmış sayılıyor. */
const POLICY_STATUS_LABEL = 'Onaylandı'

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
    cell: (row) => (row.unitNumber === null ? <EmptyValue /> : row.unitNumber),
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
  {
    key: 'status',
    label: 'Durum',
    // Ödeme akışı yok: poliçe oluşturulduğu anda onaylı sayılıyor, o yüzden
    // satır başına değişen bir durum alanı da yok.
    cell: () => (
      <span className={detailBadgeVariants({ tone: 'success' })}>{POLICY_STATUS_LABEL}</span>
    ),
  },
]

export function ProjectPolicyTab({
  projectId,
  policies,
}: {
  /** Oluşturulan poliçe GELİNEN projeyle ilişkilendirilir (KK-15); ekran
      kimliksiz açılamaz, o yüzden bağlantı kimliği taşır. */
  projectId: number
  policies: Sourced<ProjectPolicyRow[]> | undefined
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          to={policyCreatePath(projectId)}
          className={adminButtonVariants({ tone: 'primary' })}
        >
          <ShieldPlus aria-hidden className="size-4" />
          Poliçelendir
        </Link>
      </div>

      {policies === undefined || policies.source === 'unavailable' ? (
        <MissingSourceNotice endpointHint="GET /api/projects/{id}/policies" />
      ) : policies.data.length === 0 ? (
        <InfoBanner message={EMPTY_MESSAGE} />
      ) : (
        <DataTable
          rows={policies.data}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          caption={TABLE_CAPTION}
          emptyMessage={EMPTY_MESSAGE}
        />
      )}
    </div>
  )
}
