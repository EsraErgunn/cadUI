import { Box, Building2, Wrench, type LucideIcon } from 'lucide-react'

import { EDITOR_VIEWS, type ViewId } from '../../core/views'
import { isPlumbingViewAvailable } from '../../plumbing/core/plumbingFlags'
import { useUiStore } from '../../store/uiStore'
import { chromeButtonVariants } from '../controls/buttonVariants'

const VIEW_ICONS: Record<ViewId, LucideIcon> = {
  architecture: Building2,
  installation: Wrench,
  isometric: Box,
}

// Mimari veri modeli store/scene tarafında henüz yok → "çizim var mı?" sorgulanamaz,
// true varsayılır. Bayrak kapalıyken bu varsayım sonucu etkilemez (plan Bölüm 6).
const HAS_ARCHITECTURE_DRAWING = true

function isViewDisabled(viewId: ViewId): boolean {
  // İzometrik bu planın kapsamı dışında; pasif kalmaya devam eder.
  if (viewId === 'isometric') return true
  if (viewId === 'installation') return !isPlumbingViewAvailable(HAS_ARCHITECTURE_DRAWING)
  return false
}

export function ViewSwitcher() {
  const activeViewId = useUiStore((state) => state.activeViewId)
  const setActiveView = useUiStore((state) => state.setActiveView)

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Görünüm">
      {EDITOR_VIEWS.map((view) => {
        const Icon = VIEW_ICONS[view.id]
        const isActive = view.id === activeViewId
        return (
          <button
            key={view.id}
            type="button"
            title={view.label}
            aria-label={view.label}
            aria-pressed={isActive}
            disabled={isViewDisabled(view.id)}
            onClick={() => setActiveView(view.id)}
            className={chromeButtonVariants({
              tone: isActive ? 'active' : 'plain',
              shape: 'icon',
            })}
          >
            <Icon size={17} strokeWidth={1.7} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
