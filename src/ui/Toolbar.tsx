import type { LucideIcon } from 'lucide-react'

import { ShortcutHint } from './ShortcutHint'
import { ARCHITECTURE_SHORTCUTS } from '../core/shortcuts'
import { ARCHITECTURE_TOOL_GROUPS } from '../core/tools'
import { PlumbingToolbar } from '../plumbing/ui/PlumbingToolbar'
import { useUiStore } from '../store/uiStore'
import { TOOL_GROUP_DIVIDER, toolButtonVariants } from './controls/buttonVariants'
import { TOOL_ICONS } from './tools/toolIcons'

/** Pasif düğmenin ipucuna eklenen açıklama; palet "bozuk" değil "henüz yok" desin. */
const PLANNED_HINT = ' (henüz eklenmedi)'

type ToolButtonProps<TId extends string> = {
  toolId: TId
  label: string
  icon: LucideIcon
  isActive: boolean
  /** Palette duran ama henüz yazılmamış araç (K79): pasif çıkar. */
  isPlanned?: boolean
  onSelect: (toolId: TId) => void
}

/** İki paletin (mimari + tesisat) ortak buton görünümü; ikon kaydını çağıran verir. */
export function ToolButton<TId extends string>({
  toolId,
  label,
  icon,
  isActive,
  isPlanned,
  onSelect,
}: ToolButtonProps<TId>) {
  const Icon = icon
  return (
    <div className="group relative">
      <button
        type="button"
        // Erişilebilir ad da "henüz eklenmedi" der: ekran okuyucu kullanıcısı
        // yalnız `disabled`'ı duyar, sebebini duymazdı.
        aria-label={isPlanned ? `${label}${PLANNED_HINT}` : label}
        aria-pressed={isActive}
        disabled={isPlanned}
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
        {isPlanned ? `${label}${PLANNED_HINT}` : label}
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
  // İzometrikte çizim aracı YOK: görünüm çizimden otomatik üretiliyor. Mimari
  // paleti burada gösterilseydi tıklanan araç sessizce hiçbir şey yapmazdı.
  if (activeViewId === 'isometric') return null

  return (
    // Kısayol ipucu paletin ALTINA yapışsın diye sütun: nav yalnız araçları
    // sarmalar, ipucu araç değil (nav'ın içinde olsaydı palete araç gibi girerdi).
    // Zemin ve kenarlık YOK: ikisini de EditorSidebar taşıyor (tek parça yüzey).
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Her grubun ÜSTÜNDE ince ayraç (K82): ilki paleti üstteki logodan ayırır.
          Ayraç `<nav>`ın İÇİNDE değil grupların arasında: her grup kendi
          ızgarası, yoksa iki sütunlu tek ızgarada çizgi bir hücreyi işgal
          ederdi. */}
      <nav aria-label="Araç paleti" className="flex flex-col">
        {ARCHITECTURE_TOOL_GROUPS.map((group) => (
          <div key={group.id}>
            <div className={TOOL_GROUP_DIVIDER} aria-hidden />
            {/* Araçlar tek sütunda 1080p'ye sığmıyor → iki sütun. */}
            <div
              role="group"
              aria-label={group.label}
              className="grid grid-cols-2 content-start gap-1 p-1.5"
            >
              {group.tools.map((tool) => (
                <ToolButton
                  key={tool.id}
                  toolId={tool.id}
                  label={tool.label}
                  icon={TOOL_ICONS[tool.id]}
                  isActive={tool.id === activeToolId}
                  isPlanned={'isPlanned' in tool}
                  onSelect={setActiveTool}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-edge p-1.5">
        <ShortcutHint title="Mimari kısayollar" shortcuts={ARCHITECTURE_SHORTCUTS} />
      </div>
    </div>
  )
}
