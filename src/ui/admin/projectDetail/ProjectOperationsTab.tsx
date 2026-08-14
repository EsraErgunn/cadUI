import { CheckCheck, FileDown, Plus, RotateCcw, ShieldPlus, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { ProjectDecision } from '../../../api/projectDetail'
import { documentCreatePath, policyCreatePath } from '../adminNavItems'
import { quickActionVariants } from './projectDetailVariants'

const DRAFT_HINT = 'Taslak proje işleme alınamaz; firma tarafından gönderilmesi gerekir.'

interface ProjectOperationsTabProps {
  projectId: number
  canApprove: boolean
  /** Taslak projede karar işlemleri pasif (KK-2). */
  isDraft: boolean
  isSubmitting: boolean
  onDecision: (decision: ProjectDecision) => void
  onPdfReport: () => void
}

interface DecisionShortcut {
  decision: ProjectDecision
  label: string
  icon: typeof CheckCheck
}

const DECISION_SHORTCUTS: DecisionShortcut[] = [
  { decision: 'approve', label: 'Projeyi Onayla', icon: CheckCheck },
  { decision: 'requestRevision', label: 'Revizyon İste', icon: RotateCcw },
  { decision: 'reject', label: 'Projeyi Reddet', icon: X },
]

/**
 * İşlemler kısayol kartları hâlinde (KK-10). Yetkisi olmayan kullanıcıya karar
 * kartları HİÇ RENDER EDİLMEZ — pasif gösterilseydi kullanıcı yetkisi varmış
 * gibi bir beklentiye girerdi; gereksinim de "listelenmez" diyor.
 *
 * Taslak durumu ayrı bir mesele: yetki değil zamanlama sorunu, o yüzden kart
 * görünür ama pasif ve sebebi yazıyor.
 */
export function ProjectOperationsTab({
  projectId,
  canApprove,
  isDraft,
  isSubmitting,
  onDecision,
  onPdfReport,
}: ProjectOperationsTabProps) {
  return (
    <section aria-label="Proje İşlemleri" className="flex flex-col gap-4">
      {canApprove && isDraft && (
        <p className="text-sm text-ink-muted">{DRAFT_HINT}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {canApprove &&
          DECISION_SHORTCUTS.map((shortcut) => {
            // JSX küçük harfli adı HTML etiketi sanacağı için büyük harfli yerel.
            const Icon = shortcut.icon

            return (
              <button
                key={shortcut.decision}
                type="button"
                disabled={isDraft || isSubmitting}
                onClick={() => onDecision(shortcut.decision)}
                className={quickActionVariants()}
              >
                <Icon aria-hidden className="size-5 text-ink-muted" />
                {shortcut.label}
              </button>
            )
          })}

        <button
          type="button"
          onClick={onPdfReport}
          disabled={isSubmitting}
          className={quickActionVariants()}
        >
          <FileDown aria-hidden className="size-5 text-ink-muted" />
          PDF Rapor Al
        </button>

        <Link to={documentCreatePath(projectId)} className={quickActionVariants()}>
          <Plus aria-hidden className="size-5 text-ink-muted" />
          Evrak Ekle
        </Link>

        <Link to={policyCreatePath(projectId)} className={quickActionVariants()}>
          <ShieldPlus aria-hidden className="size-5 text-ink-muted" />
          Poliçelendir
        </Link>
      </div>
    </section>
  )
}
