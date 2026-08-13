import { ShieldPlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { InfoBanner } from './InfoBanner'
import { MissingSourceNotice } from '../MissingSourceNotice'
import { formatCurrency, formatPlainDate } from './projectDetailFormat'
import type { Sourced } from '../../../api/mockGate'
import type { ProjectPolicyRow } from '../../../api/projectDetail'
import { DataTable, type DataTableColumn } from '../DataTable'
import { EmptyValue } from '../EmptyValue'
import { POLICY_CREATE_PATH } from '../adminNavItems'
import { adminButtonVariants } from '../adminVariants'
import { detailBadgeVariants } from './projectDetailVariants'

const EMPTY_MESSAGE = 'Proje Poliçe Kaydı Bulunamamıştır.'

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
    key: 'isPaid',
    label: 'Ödeme',
    cell: (row) => (
      <span className={detailBadgeVariants({ tone: row.isPaid ? 'success' : 'warning' })}>
        {row.isPaid ? 'Ödendi' : 'Bekliyor'}
      </span>
    ),
  },
]

export function ProjectPolicyTab({
  policies,
}: {
  policies: Sourced<ProjectPolicyRow[]> | undefined
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to={POLICY_CREATE_PATH} className={adminButtonVariants({ tone: 'primary' })}>
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
