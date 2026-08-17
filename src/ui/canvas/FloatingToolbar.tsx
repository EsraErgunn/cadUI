import { ChevronDown, ChevronUp, Hand, Magnet, MousePointer2, Redo2, Undo2 } from 'lucide-react'

import { FloorSelect } from './FloorSelect'
import { ViewOptionsMenu } from './ViewOptionsMenu'
import { CANVAS_BAR_DIVIDER, canvasBarButtonVariants } from './canvasBarVariants'
import { getFloorIdInDirection, type FloorDirection } from '../../core/floors'
import { SELECTION_TOOL_ID } from '../../core/tools'
import { INSTALLATION_SELECTION_TOOL_ID } from '../../plumbing/core/installationTools'
import {
  redoActiveView,
  undoActiveView,
  useCanRedoActiveView,
  useCanUndoActiveView,
} from '../../store/activeViewHistory'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'

type FloatingToolbarProps = {
  /** Kat geçişi ve kat pencereleri EditorPage'de; klavye kısayolları da aynı
   *  fonksiyonları çağırıyor, burada ikinci bir kopyası yazılmıyor. */
  onGoToFloor: (direction: FloorDirection) => void
  onOpenFloorManagement: () => void
  onOpenFloorCopy: () => void
}

/**
 * Çizim alanının ALT-ORTASINDA yüzen kompakt çubuk (K54). Nesne ÖZELLİKLERİNİ
 * düzenlemez — o sağ panelin işi; buradakiler tuvalin çalışma kipi ve çizim
 * yardımcıları.
 *
 * Mimari VE tesisat görünümlerinde mount edilir (K57). Ortak kontroller
 * (seç/el/geri/yinele/kat) iki görünümde de aynı altyapıya bağlı; görünüme
 * ÖZEL olanlar burada dallanır — snap yalnız mimaride, Görünüm menüsünün
 * maddeleri ise `ViewOptionsMenu` içinde görünüme göre seçilir.
 */
export function FloatingToolbar({
  onGoToFloor,
  onOpenFloorManagement,
  onOpenFloorCopy,
}: FloatingToolbarProps) {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const setActiveTool = useUiStore((state) => state.setActiveTool)
  const isPanModeActive = useUiStore((state) => state.isPanModeActive)
  const setPanModeActive = useUiStore((state) => state.setPanModeActive)
  const isGridSnapEnabled = useUiStore((state) => state.isGridSnapEnabled)
  const toggleGridSnapEnabled = useUiStore((state) => state.toggleGridSnapEnabled)
  const activeViewId = useUiStore((state) => state.activeViewId)

  const canUndo = useCanUndoActiveView()
  const canRedo = useCanRedoActiveView()

  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  // Uçtaki katta ok pasif: geçiş döngüsel değil (floors.ts sözleşmesi).
  const hasFloorBelow = getFloorIdInDirection(floors, activeFloorId, 'down') !== undefined
  const hasFloorAbove = getFloorIdInDirection(floors, activeFloorId, 'up') !== undefined

  const isArchitecture = activeViewId === 'architecture'
  // İki görünümün seçim aracı ayrı sabitlerde tanımlı (`core/tools.ts` ve
  // `plumbing/core/installationTools.ts`); bugün ikisi de 'selection' ama
  // sabitler üzerinden okunuyor ki biri değişirse çubuk sessizce şaşmasın.
  const selectionToolId = isArchitecture ? SELECTION_TOOL_ID : INSTALLATION_SELECTION_TOOL_ID

  // Seçim aracı YALNIZ el modu kapalıyken etkin görünür: ikisi aynı anda
  // vurgulanırsa kullanıcı sol tuşun ne yapacağını çubuktan okuyamaz.
  const isSelectActive = activeToolId === selectionToolId && !isPanModeActive

  return (
    <div
      // Alt-orta, tuvalin ÜSTÜNDE. `pointer-events-none` sarmalayıcıda:
      // çubuğun iki yanındaki boşluk tuvale ait kalsın, oraya yapılan tıklama
      // çizimi bölmesin (drei <Html> sarmalayıcısındaki aynı tuzak, K45).
      className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center"
    >
      <div
        role="toolbar"
        aria-label="Çizim alanı araçları"
        className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-edge bg-surface/95 px-1.5 py-1 shadow-lg backdrop-blur"
      >
        <button
          type="button"
          onClick={() => setActiveTool(selectionToolId)}
          aria-pressed={isSelectActive}
          title="Seçim aracı"
          aria-label="Seçim aracı"
          className={canvasBarButtonVariants({ tone: isSelectActive ? 'active' : 'plain' })}
        >
          <MousePointer2 size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setPanModeActive(true)}
          aria-pressed={isPanModeActive}
          title="El aracı — sürükleyerek kaydır (Space)"
          aria-label="El aracı"
          className={canvasBarButtonVariants({ tone: isPanModeActive ? 'active' : 'plain' })}
        >
          <Hand size={16} strokeWidth={1.8} aria-hidden />
        </button>

        <span className={CANVAS_BAR_DIVIDER} aria-hidden />

        <button
          type="button"
          onClick={undoActiveView}
          disabled={!canUndo}
          title="Geri al (Ctrl+Z)"
          aria-label="Geri al"
          className={canvasBarButtonVariants()}
        >
          <Undo2 size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <button
          type="button"
          onClick={redoActiveView}
          disabled={!canRedo}
          title="Yinele (Ctrl+Y)"
          aria-label="Yinele"
          className={canvasBarButtonVariants()}
        >
          <Redo2 size={16} strokeWidth={1.8} aria-hidden />
        </button>

        <span className={CANVAS_BAR_DIVIDER} aria-hidden />

        {/* Oklar KOMŞU kata (bir alt/bir üst) tek tıkla götürür — çizerken en sık
            yapılan geçiş bu. Ortadaki açılır ise uzak kata atlamak, boş katı
            görmek ve kat pencerelerini açmak için. */}
        <button
          type="button"
          onClick={() => onGoToFloor('down')}
          disabled={!hasFloorBelow}
          title="Alt kata geç (Page Down)"
          aria-label="Alt kata geç"
          className={canvasBarButtonVariants()}
        >
          <ChevronDown size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <FloorSelect
          onOpenFloorManagement={onOpenFloorManagement}
          onOpenFloorCopy={onOpenFloorCopy}
        />
        <button
          type="button"
          onClick={() => onGoToFloor('up')}
          disabled={!hasFloorAbove}
          title="Üst kata geç (Page Up)"
          aria-label="Üst kata geç"
          className={canvasBarButtonVariants()}
        >
          <ChevronUp size={16} strokeWidth={1.8} aria-hidden />
        </button>

        {/* Snap YALNIZ mimaride (K57). Tesisatın yakalaması bugün ızgara
            GÖRÜNÜRLÜĞÜNE bağlı (`plumbing/scene/placementSnap.ts`), yani aynı
            düğme orada başka bir şey ifade ederdi — hangi anlamın kalacağı
            tesisat sahibinin kararı, o gelene kadar düğme oraya konmuyor.
            Görünmeyen düğme, yanlış çalışan düğmeden iyidir. */}
        {isArchitecture && (
          <>
            <span className={CANVAS_BAR_DIVIDER} aria-hidden />
            <button
              type="button"
              onClick={toggleGridSnapEnabled}
              aria-pressed={isGridSnapEnabled}
              title="Izgaraya yakala (Ctrl basılıyken anlık kapanır)"
              aria-label="Izgaraya yakala"
              className={canvasBarButtonVariants({ tone: isGridSnapEnabled ? 'active' : 'plain' })}
            >
              <Magnet size={16} strokeWidth={1.8} aria-hidden />
            </button>
          </>
        )}

        <span className={CANVAS_BAR_DIVIDER} aria-hidden />

        <ViewOptionsMenu />
      </div>
    </div>
  )
}
