import { Link } from 'react-router-dom'

import type { PolicyRow } from '../../../api/policies'
import type { DataTableColumn } from '../DataTable'
import { EmptyValue } from '../EmptyValue'
import { formatCurrency, formatPlainDate } from '../adminFormat'
import { projectDetailPath } from '../adminNavItems'
import { ADMIN_CELL_LINK, adminButtonVariants } from '../adminVariants'

/** Sıralamadan söz ETMİYOR: uç `SortBy`/`SortDir` almıyor, sıra sunucuda sabit
    (başlangıç tarihi azalan). */
export const POLICY_TABLE_CAPTION = 'Poliçe listesi.'

/** Sütunlar dar ekrana sığmaz; bu eşiğin altında tablo yatay kaydırılır. */
export const POLICY_TABLE_MIN_WIDTH_CLASS = 'min-w-240'

/** Eylem sütunu içeriği kadar dursun (proje listesiyle aynı gerekçe). */
const NARROW_COLUMN_CLASS = 'w-px whitespace-nowrap'

interface PolicyColumnsOptions {
  /** Sayfa başlangıcı; "No" sütunu sayfa 2'de 31'den devam etsin diye. */
  rowOffset: number
  /** İsteği süren satır; o satırın düğmesi kilitlenir. */
  pendingPolicyId: number | null
  /**
   * Poliçe silinebilir mi (`useCanWriteProjectContent`). Sunucu da
   * `DELETE /api/policies/{id}` ucunu `Admin, ProjectFirmUser`'a açıyor; gaz
   * dağıtım kullanıcısı poliçeyi GÖRÜR, silemez. Yetkisizde sütun HİÇ
   * üretilmez — boş bir "Aksiyonlar" başlığı eylem varmış gibi görünürdü.
   */
  canDelete: boolean
  onDelete: (policyId: number) => void
}

/**
 * Sunucuda karşılığı olmayan sütun BIRAKILMADI: "Acente" (acente kavramı yok),
 * "Yöntem" (`PolicyAddDto`'da alan yok) ve "ProjeId" (`PolicyDto` bina kodu
 * taşımıyor) kaldırıldı — hepsi ya boş ya uydurma bir değer gösterirdi.
 *
 * "Ödeme" de yok ve olmayacak: sistemde ödeme akışı bulunmuyor. "Birim" sütunu
 * eklenebilir (`PolicyDto.UnitNumber` sunucudan geliyor) ama bu turda istenmedi.
 *
 * Başlıklar sıralanabilir DEĞİL: uç sıralama parametresi almıyor.
 */
export function buildPolicyColumns({
  rowOffset,
  pendingPolicyId,
  canDelete,
  onDelete,
}: PolicyColumnsOptions): DataTableColumn<PolicyRow>[] {
  const columns: DataTableColumn<PolicyRow>[] = [
    {
      key: 'no',
      label: 'No',
      cellClassName: 'tabular-nums text-ink-muted',
      cell: (_policy, index) => rowOffset + index + 1,
    },
    {
      key: 'policyNumber',
      label: 'Poliçe No',
      cellClassName: 'font-mono',
      cell: (policy) => policy.policyNumber ?? <EmptyValue />,
    },
    {
      key: 'insuranceCompany',
      label: 'Sigorta Şirketi / Poliçe Firması',
      cell: (policy) => policy.insuranceCompanyName ?? <EmptyValue />,
    },
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
      key: 'amount',
      label: 'Teminat Tutarı',
      cellClassName: 'text-right tabular-nums',
      cell: (policy) => formatCurrency(policy.amount) ?? <EmptyValue />,
    },
    {
      key: 'startDate',
      label: 'Başlangıç',
      cell: (policy) => formatPlainDate(policy.startDate) ?? <EmptyValue />,
    },
    {
      key: 'endDate',
      label: 'Bitiş',
      cell: (policy) => formatPlainDate(policy.endDate) ?? <EmptyValue />,
    },
  ]

  if (canDelete) {
    columns.push({
      key: 'actions',
      label: 'Aksiyonlar',
      cellClassName: `${NARROW_COLUMN_CLASS} text-right`,
      headerClassName: `${NARROW_COLUMN_CLASS} text-right`,
      cell: (policy) => (
        <button
          type="button"
          onClick={() => onDelete(policy.id)}
          disabled={pendingPolicyId === policy.id}
          aria-busy={pendingPolicyId === policy.id}
          className={adminButtonVariants({ tone: 'danger', size: 'sm' })}
        >
          Sil
        </button>
      ),
    })
  }

  return columns
}
