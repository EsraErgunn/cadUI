import { INSTALLATION_TOOL_ICONS } from './plumbingToolIcons'
import { useUiStore } from '../../store/uiStore'
import { EditorThemeToggle } from '../../ui/EditorThemeToggle'
import { ShortcutHint } from '../../ui/ShortcutHint'
import { ToolButton } from '../../ui/Toolbar'
import { TOOL_GROUP_DIVIDER } from '../../ui/controls/buttonVariants'
import { INSTALLATION_TOOL_GROUPS, type InstallationToolId } from '../core/installationTools'
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
    // Zemin ve kenarlık YOK: mimari paletle aynı gerekçe, ikisini de
    // EditorSidebar taşıyor.
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Mimari paletle aynı iskelet (K82): her grubun ÜSTÜNDE ince ayraç —
          ilki paleti üstteki logodan ayırır. Ayraç `<nav>`ın İÇİNDE ama
          grupların ARASINDA: iki sütunlu tek ızgarada çizgi bir hücreyi işgal
          ederdi, bu yüzden her grup kendi ızgarası. */}
      <nav aria-label="Araç paleti" className="flex flex-col">
        {INSTALLATION_TOOL_GROUPS.map((group) => (
          <div key={group.id}>
            <div className={TOOL_GROUP_DIVIDER} aria-hidden />
            {/* Araçlar tek sütunda 1080p'ye sığmıyor → iki sütun. */}
            <div
              role="group"
              aria-label={group.label}
              className="grid grid-cols-2 content-start gap-1 p-1.5"
            >
              {group.tools.map((tool) => (
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
            </div>
          </div>
        ))}
      </nav>

      {/* TODO(tesisat): çap seçimi burada DEĞİL, hat seçilince açılacak sağdaki
          işlev panelinde olacak. Katalog ve store tarafı hazır: hepsi renkli
          (core/pipeTypes.ts), uygulama plumbingSlice.setLinesPipeType ile. */}

      {/* Kısayol ipucu + tema düğmesi yan yana: bkz. Toolbar.tsx aynı gerekçe. */}
      <div className="mt-auto flex items-center gap-1 border-t border-edge p-1.5">
        <ShortcutHint title="Tesisat kısayolları" shortcuts={PLUMBING_SHORTCUTS} />
        <EditorThemeToggle />
      </div>
    </div>
  )
}
