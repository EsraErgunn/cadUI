import { INSTALLATION_TOOL_ICONS } from './plumbingToolIcons'
import { useUiStore } from '../../store/uiStore'
import { ToolButton } from '../../ui/Toolbar'
import { INSTALLATION_TOOLS } from '../core/installationTools'

export function PlumbingToolbar() {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const setActiveTool = useUiStore((state) => state.setActiveTool)

  return (
    // Mimari paletle aynı iskelet: araçlar 2 sütuna otomatik sarar.
    <nav
      aria-label="Araç paleti"
      className="grid shrink-0 grid-cols-2 content-start gap-1 border-r border-edge bg-surface p-1.5"
    >
      {INSTALLATION_TOOLS.map((tool) => (
        <ToolButton
          key={tool.id}
          toolId={tool.id}
          label={tool.label}
          icon={INSTALLATION_TOOL_ICONS[tool.id]}
          isActive={tool.id === activeToolId}
          onSelect={setActiveTool}
        />
      ))}
    </nav>
  )
}
