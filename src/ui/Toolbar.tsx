import type { LucideIcon } from 'lucide-react'

import { ARCHITECTURE_TOOLS } from '../core/tools'
import { PlumbingToolbar } from '../plumbing/ui/PlumbingToolbar'
import { useUiStore } from '../store/uiStore'
import { toolButtonVariants } from './controls/buttonVariants'
import { TOOL_ICONS } from './tools/toolIcons'

type ToolButtonProps<TId extends string> = {
  toolId: TId
  label: string
  icon: LucideIcon
  isActive: boolean
  onSelect: (toolId: TId) => void
}

/** İki paletin (mimari + tesisat) ortak buton görünümü; ikon kaydını çağıran verir. */
export function ToolButton<TId extends string>({
  toolId,
  label,
  icon,
  isActive,
  onSelect,
}: ToolButtonProps<TId>) {
  const Icon = icon
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={label}
        aria-pressed={isActive}
        onClick={() => onSelect(toolId)}
        className={toolButtonVariants({ tone: isActive ? 'active' : 'plain' })}
      >
        <Icon size={18} strokeWidth={1.7} aria-hidden />
      </button>
      {/* Tooltip (KK-8). aria-hidden: erişilebilir ad zaten butonun aria-label'ı. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white shadow-md group-hover:block"
      >
        {label}
      </span>
    </div>
  )
}

export function Toolbar() {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const activeViewId = useUiStore((state) => state.activeViewId)
  const setActiveTool = useUiStore((state) => state.setActiveTool)

  // Palet görünümle birlikte TAMAMEN değişir; tesisat araçları mimarinin altına eklenmez.
  if (activeViewId === 'installation') return <PlumbingToolbar />

  return (
    // 22 araç tek sütunda 1080p'ye sığmıyor → 11 satır × 2 sütun.
    <nav
      aria-label="Araç paleti"
      className="grid shrink-0 grid-cols-2 content-start gap-1 border-r border-edge bg-surface p-1.5"
    >
      {ARCHITECTURE_TOOLS.map((tool) => (
        <ToolButton
          key={tool.id}
          toolId={tool.id}
          label={tool.label}
          icon={TOOL_ICONS[tool.id]}
          isActive={tool.id === activeToolId}
          onSelect={setActiveTool}
        />
      ))}
    </nav>
  )
}
