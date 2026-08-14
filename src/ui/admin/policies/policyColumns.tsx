import { Link } from 'react-router-dom'

import { POLICY_METHOD_LABELS, type PolicyRow, type PolicySortKey } from '../../../api/policies'
import type { DataTableColumn } from '../DataTable'
import { EmptyValue } from '../EmptyValue'
import { formatCurrency, formatPlainDate } from '../adminFormat'
import { projectDetailPath } from '../adminNavItems'
import { ADMIN_CELL_LINK } from '../adminVariants'

export const POLICY_TABLE_CAPTION =
  'Poliçe listesi. Poliçe no ve başlangıç tarihi başlıkları sıralamayı değiştirir.'

/** Dokuz sütun dar ekrana sığmaz; bu eşiğin altında tablo yatay kaydırılır. */
export const POLICY_TABLE_MIN_WIDTH_CLASS = 'min-w-280'

interface PolicyColumnsOptions {
  /** Sayfa başlangıcı; "No" sütunu sayfa 2'de 31'den devam etsin diye. */
  rowOffset: number
}

/**
 * "Birim" ve "Ödeme" sütunu YOK: sihirbaz ikisini de sormuyor ve poliçe ucu
 * gelmeden değerleri uydurmak listeyi olduğundan dolu gösterirdi
 * (docs/api-eksikleri-policeler.md, madde 2).
 */
export function buildPolicyColumns({
  rowOffset,
}: PolicyColumnsOptions): DataTableColumn<PolicyRow, PolicySortKey>[] {
  return [
    {
      key: 'no',
      label: 'No',
      cellClassName: 'tabular-nums text-ink-muted',
      cell: (_policy, index) => rowOffset + index + 1,
    },
    {
      key: 'policyNumber',
      label: 'Poliçe No',
      sortKey: 'policyNumber',
      cellClassName: 'font-mono',
      cell: (policy) => policy.policyNumber,
    },
    {
      key: 'insuranceCompany',
      label: 'Sigorta Şirketi',
      cell: (policy) => policy.insuranceCompanyName,
    },
    { key: 'agency', label: 'Acente', cell: (policy) => policy.agencyName },
    {
      key: 'projectName',
      label: 'Proje Adı',
      cell: (policy) =>
        policy.projectName === null ? (
          <EmptyValue />
        ) : (
          <Link to={projectDetailPath(policy.projectId)} className={ADMIN_CELL_LINK}>
            {policy.projectName}
          </Link>
        ),
    },
    {
      key: 'projectPId',
      label: 'ProjeId',
      cellClassName: 'font-mono tabular-nums',
      cell: (policy) => (policy.projectPId === null ? <EmptyValue /> : policy.projectPId),
    },
    {
      key: 'amount',
      label: 'Teminat Tutarı',
      cellClassName: 'text-right tabular-nums',
      cell: (policy) => formatCurrency(policy.amount) ?? <EmptyValue />,
    },
    {
      key: 'startDate',
      label: 'Başlangıç',
      sortKey: 'startDate',
      cell: (policy) => formatPlainDate(policy.startDate) ?? <EmptyValue />,
    },
    {
      key: 'endDate',
      label: 'Bitiş',
      cell: (policy) => formatPlainDate(policy.endDate) ?? <EmptyValue />,
    },
    {
      key: 'method',
      label: 'Yöntem',
      cell: (policy) => POLICY_METHOD_LABELS[policy.method],
    },
  ]
}
