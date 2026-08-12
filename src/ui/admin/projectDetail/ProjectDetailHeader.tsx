import { Check, FileDown, X } from 'lucide-react'

import { MockValue } from './MockValue'
import { ProjectStatusChip } from './ProjectStatusChip'
import type { ProjectDetail, ProjectDetailStatus } from '../../../api/projectDetail'
import { PROJECT_LIST_PATH } from '../../../pages/useCloseEditor'
import { Breadcrumb } from '../Breadcrumb'
import { ADMIN_HOME_PATH } from '../adminNavItems'
import { adminButtonVariants } from '../adminVariants'

const DRAFT_ACTION_HINT = 'Taslak proje işleme alınamaz; firma tarafından gönderilmesi gerekir.'

interface ProjectDetailHeaderProps {
  detail: ProjectDetail
  status: ProjectDetailStatus | null
  canApprove: boolean
  isDraft: boolean
  isSubmitting: boolean
  onApprove: () => void
  onReject: () => void
  onDownloadPdf: () => void
}

/**
 * Başlık bloğu: kırılım, proje adı + durum çipi, künye ve sağ üstteki üç aksiyon
 * (KK-1). `PageHeader` kullanılmadı — o başlığın yanına çip, altına künye satırı
 * almıyor; ortak olan konum izi `Breadcrumb` olarak paylaşılıyor.
 */
export function ProjectDetailHeader({
  detail,
  status,
  canApprove,
  isDraft,
  isSubmitting,
  onApprove,
  onReject,
  onDownloadPdf,
}: ProjectDetailHeaderProps) {
  const { server, extras } = detail

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <Breadcrumb
          items={[
            { label: 'Anasayfa', to: ADMIN_HOME_PATH },
            { label: 'Projeler', to: PROJECT_LIST_PATH },
            { label: 'Proje Detay' },
          ]}
        />

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">{server.name}</h1>
          {status !== null && <ProjectStatusChip status={status} />}
        </div>

        {/* Künye: Proje ID, Tesisat No, gaz dağıtım firması (KK-1). */}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          <span>
            Proje ID: <span className="text-ink">{server.pId}</span>
          </span>
          <span aria-hidden>•</span>
          <span>
            Tesisat No:{' '}
            {extras === null ? (
              <span className="text-ink">—</span>
            ) : (
              <MockValue>
                <span className="text-ink">{extras.general.installationNo}</span>
              </MockValue>
            )}
          </span>
          <span aria-hidden>•</span>
          {extras === null ? (
            <span className="text-ink">—</span>
          ) : (
            <MockValue>
              <span className="text-ink">{extras.general.gasFirmName}</span>
            </MockValue>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDownloadPdf}
          className={adminButtonVariants({ tone: 'secondary' })}
        >
          <FileDown aria-hidden className="size-4" />
          PDF İndir
        </button>

        {/* Onay/ret YALNIZ yetkili kontrol mühendisine (KK-2); yetkisizde hiç
            render edilmiyor, pasif de gösterilmiyor. */}
        {canApprove && (
          <>
            <button
              type="button"
              onClick={onReject}
              disabled={isDraft || isSubmitting}
              title={isDraft ? DRAFT_ACTION_HINT : undefined}
              className={adminButtonVariants({ tone: 'danger' })}
            >
              <X aria-hidden className="size-4" />
              Reddet
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={isDraft || isSubmitting}
              title={isDraft ? DRAFT_ACTION_HINT : undefined}
              className={adminButtonVariants({ tone: 'primary' })}
            >
              <Check aria-hidden className="size-4" />
              Onayla
            </button>
          </>
        )}
      </div>
    </div>
  )
}
