import { ShieldPlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { InfoBanner } from './InfoBanner'
import type { ProjectPolicyRow } from '../../../api/projectDetail'
import { DataTable, type DataTableColumn } from '../DataTable'
import { EmptyValue } from '../EmptyValue'
import { NoticeBar } from '../NoticeBar'
import { QueryLoading } from '../QueryStates'
import { formatCurrency, formatPlainDate } from '../adminFormat'
import { policyCreatePath } from '../adminNavItems'
import { adminButtonVariants } from '../adminVariants'
import { PolicyEditDialog } from '../policies/PolicyEditDialog'
import { usePolicyActions } from '../policies/usePolicyActions'
import { useCanWriteProjectContent } from '../useRole'
import { detailBadgeVariants } from './projectDetailVariants'

const EMPTY_MESSAGE = 'Proje Poliçe Kaydı Bulunamamıştır.'

const DELETED_UNIT_LABEL = 'Silinmiş Birim'
const DELETED_UNIT_TITLE =
  'Poliçenin bağlı olduğu bağımsız bölüm çizimden silindi. Poliçe iptal edilmedi, kaydı duruyor.'

const TABLE_CAPTION = 'Projeye bağlı poliçeler.'

/** Eylem sütunu içeriği kadar dursun (liste ekranlarıyla aynı gerekçe). */
const NARROW_COLUMN_CLASS = 'w-px whitespace-nowrap'

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

function buildColumns(
  canWriteContent: boolean,
  onEdit: (policy: ProjectPolicyRow) => void,
): DataTableColumn<ProjectPolicyRow>[] {
  // Yetkisizde sütun HİÇ üretilmez — boş bir "Aksiyonlar" başlığı eylem varmış
  // gibi görünürdü (poliçe listesiyle aynı gerekçe).
  if (!canWriteContent) return COLUMNS

  return [
    ...COLUMNS,
    {
      key: 'actions',
      label: 'Aksiyonlar',
      cellClassName: `${NARROW_COLUMN_CLASS} text-right`,
      headerClassName: `${NARROW_COLUMN_CLASS} text-right`,
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onEdit(row)}
            className={adminButtonVariants({ tone: 'secondary', size: 'sm' })}
          >
            Düzenle
          </button>
        </div>
      ),
    },
  ]
}

/**
 * Projeye bağlı poliçeler: listeleme + oluşturma + güncelleme.
 *
 * Güncelleme poliçe LİSTESİYLE aynı diyaloğu ve hook'u kullanıyor
 * (`PolicyEditDialog` + `usePolicyActions`); satır tipleri farklı ama ikisi de
 * `PolicyEditTarget` alanlarını taşıyor. İkinci bir diyalog, gövdeyi eksik
 * gönderme riskini (K159) iki yerde birden taşımak demekti.
 *
 * SİLME burada YOK: sekmenin kapsamı proje bağlamındaki bakım, iptal poliçe
 * listesinin işi.
 */
export function ProjectPolicyTab({
  projectId,
  policies,
}: {
  /** Oluşturulan poliçe GELİNEN projeyle ilişkilendirilir (KK-15); ekran
      kimliksiz açılamaz, o yüzden bağlantı kimliği taşır. */
  projectId: number
  policies: ProjectPolicyRow[] | undefined
}) {
  // Poliçe OLUŞTURMA ve GÜNCELLEME sunucuda `Admin, ProjectFirmUser`'a açık
  // (`POST /api/policies`, `PUT /api/policies/{id}`); gaz dağıtım kullanıcısı
  // poliçeleri görür, yazamaz.
  const canWriteContent = useCanWriteProjectContent()
  // Kimlik veriliyor: kayıttan sonra bu projenin sekmesi de tazelensin.
  const policyActions = usePolicyActions(projectId)

  const columns = buildColumns(canWriteContent, policyActions.requestEdit)

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

      {policyActions.notice !== null && (
        <NoticeBar
          tone={policyActions.notice.tone}
          message={policyActions.notice.message}
          onDismiss={policyActions.dismissNotice}
        />
      )}

      {policies === undefined ? (
        <QueryLoading message="Poliçeler yükleniyor…" />
      ) : policies.length === 0 ? (
        <InfoBanner message={EMPTY_MESSAGE} />
      ) : (
        <DataTable
          rows={policies}
          columns={columns}
          rowKey={(row) => row.id}
          caption={TABLE_CAPTION}
          emptyMessage={EMPTY_MESSAGE}
        />
      )}

      {policyActions.editTarget !== null && (
        <PolicyEditDialog
          policy={policyActions.editTarget}
          isSaving={policyActions.isSaving}
          error={policyActions.editError}
          onDismissError={policyActions.dismissEditError}
          onSave={policyActions.confirmEdit}
          onClose={policyActions.cancelEdit}
        />
      )}
    </div>
  )
}
