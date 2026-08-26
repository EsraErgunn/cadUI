import { Check, FileDown, PencilRuler, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'

import { ProjectStatusChip } from './ProjectStatusChip'
import type { ProjectDetail, ProjectDetailStatus } from '../../../api/projectDetail'
import { prefetchEditorPage } from '../../../app/editorChunk'
import { PROJECT_LIST_PATH } from '../../../pages/useCloseEditor'
import { Breadcrumb } from '../Breadcrumb'
import { projectEditorPath } from '../adminNavItems'
import { adminButtonVariants } from '../adminVariants'
import { useHomePath } from '../useHomePath'

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
  const homePath = useHomePath()

  // Kullanıcı buradaysa editöre girmesi kuvvetle muhtemel: parçayı düğmeye
  // basmadan indir. Soğuk geçiş 2220 ms, ısıtılmış geçiş 16 ms (K101).
  useEffect(prefetchEditorPage, [])

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <Breadcrumb
          items={[
            { label: 'Anasayfa', to: homePath },
            { label: 'Projeler', to: PROJECT_LIST_PATH },
            { label: 'Proje Detay' },
          ]}
        />

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {/* `break-words`: proje adı boşluksuz uzun bir kod olabiliyor ve
              sarılmadığında başlık bloğu satırı taşırıyordu. */}
          <h1 className="min-w-0 break-words text-xl font-semibold text-ink sm:text-2xl">
            {server.name}
          </h1>
          {status !== null && <ProjectStatusChip status={status} />}
        </div>

        {/* Künye: Proje ID, gaz dağıtım firması (KK-1). "Tesisat No" KALDIRILDI
            — ucun gövdesinde karşılığı yok. */}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          <span>
            Proje ID: <span className="text-ink">{server.id}</span>
          </span>
          <span aria-hidden>•</span>
          {/* Gaz dağıtım firması artık GERÇEK: uç ünvanı gövdede taşıyor,
              mock işareti kalktı. */}
          <span className="text-ink">{extras?.general.gasFirmName ?? '—'}</span>
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-2 sm:items-end">
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

        {/*
          Çizim editörüne TEK giriş noktası (K53): proje listesindeki ad artık
          detaya geliyor, editöre buradan giriliyor.

          Projenin durumundan BAĞIMSIZ ve her zaman görünür — yeni projenin
          henüz çizimi yok ve ilk çizim de buradan yapılacak. `secondary` tonda:
          gereksinim "Onayla (birincil)" diyor, ikinci bir birincil düğme o
          vurguyu böler.
        */}
        <Link
          to={projectEditorPath(server.id)}
          className={adminButtonVariants({ tone: 'secondary' })}
        >
          <PencilRuler aria-hidden className="size-4" />
          Çizim Editöründe Aç
        </Link>
      </div>
    </div>
  )
}
