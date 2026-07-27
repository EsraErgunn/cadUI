import { Box, Building2, Wrench, type LucideIcon } from 'lucide-react'

import { EDITOR_VIEWS, type ViewId } from '../../core/views'
import { useUiStore } from '../../store/uiStore'
import { chromeButtonVariants } from '../controls/buttonVariants'

const VIEW_ICONS: Record<ViewId, LucideIcon> = {
  architecture: Building2,
  installation: Wrench,
  isometric: Box,
}

/**
 * Issue 2.6: Mimari Tasarım aktif ve vurgulu, diğer ikisi pasif.
 * Görünüm değiştirince paletin yeniden yüklenmesi bu issue'nun kapsamı dışında.
 */
export function ViewSwitcher() {
  const activeViewId = useUiStore((state) => state.activeViewId)

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
            disabled={!isActive}
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
