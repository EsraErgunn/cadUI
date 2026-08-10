import { INSTALLATION_TOOL_ICONS } from './plumbingToolIcons'
import { useUiStore } from '../../store/uiStore'
import { ShortcutHint } from '../../ui/ShortcutHint'
import { ToolButton } from '../../ui/Toolbar'
import { INSTALLATION_TOOLS, type InstallationToolId } from '../core/installationTools'
import { PLUMBING_SHORTCUTS } from '../core/plumbingShortcuts'

export function PlumbingToolbar() {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const setActiveTool = useUiStore((state) => state.setActiveTool)

  /**
   * Sürükle-bırak yerleştirmenin başlangıcı: araç tıklama BİTİNCE değil, basılınca
   * etkinleşir. Kullanıcı butondan tuvale sürüklerken pointermove/up olayları
   * tuvale ulaşır ve gerisini usePlacementTool halleder.
   */
  const handlePointerDown = (event: React.PointerEvent, toolId: InstallationToolId) => {
    setActiveTool(toolId)

    // Dokunmatikte örtük pointer capture olayları butonda tutar; bırakılmazsa
    // parmak tuvale gittiğinde sürükleme hiç görünmez.
    const { target } = event
    if (target instanceof Element && target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId)
    }
  }

  return (
    // Kısayol ipucu paletin ALTINA yapışsın diye sütun: nav yalnız araçları
    // sarmalar, ipucu araç değil (nav'ın içinde olsaydı palete araç gibi girerdi).
    <div className="flex shrink-0 flex-col border-r border-ink bg-surface">
      {/* Mimari paletle aynı iskelet: araçlar 2 sütuna otomatik sarar. */}
      <nav aria-label="Araç paleti" className="grid grid-cols-2 content-start gap-1 p-1.5">
        {INSTALLATION_TOOLS.map((tool) => (
          <div key={tool.id} onPointerDown={(event) => handlePointerDown(event, tool.id)}>
            <ToolButton
              toolId={tool.id}
              label={tool.label}
              icon={INSTALLATION_TOOL_ICONS[tool.id]}
              isActive={tool.id === activeToolId}
              onSelect={setActiveTool}
            />
          </div>
        ))}
      </nav>

      {/* TODO(tesisat): çap seçimi burada DEĞİL, hat seçilince açılacak sağdaki
          işlev panelinde olacak. Katalog ve store tarafı hazır: hepsi renkli
          (core/pipeTypes.ts), uygulama plumbingSlice.setLinesPipeType ile. */}

      <div className="mt-auto border-t border-edge p-1.5">
        <ShortcutHint title="Tesisat kısayolları" shortcuts={PLUMBING_SHORTCUTS} />
      </div>
    </div>
  )
}
