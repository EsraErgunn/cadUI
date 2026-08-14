import { ChevronDown, ChevronUp, Hand, Magnet, MousePointer2, Redo2, Undo2 } from 'lucide-react'

import { FloorSelect } from './FloorSelect'
import { ViewOptionsMenu } from './ViewOptionsMenu'
import { CANVAS_BAR_DIVIDER, canvasBarButtonVariants } from './canvasBarVariants'
import { getFloorIdInDirection, type FloorDirection } from '../../core/floors'
import { SELECTION_TOOL_ID } from '../../core/tools'
import {
  redoProject,
  undoProject,
  useCadStore,
  useCanRedo,
  useCanUndo,
} from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'

type FloatingToolbarProps = {
  /** Kat geçişi EditorPage'in `goToFloor`'u — menü ve klavye de aynı fonksiyonu
   *  çağırıyor, burada ikinci bir kopyası yazılmıyor. */
  onGoToFloor: (direction: FloorDirection) => void
}

/**
 * Çizim alanının ALT-ORTASINDA yüzen kompakt çubuk (K54). Nesne ÖZELLİKLERİNİ
 * düzenlemez — o sağ panelin işi; buradakiler tuvalin çalışma kipi ve çizim
 * yardımcıları.
 *
 * Yalnız mimari görünümde mount edilir (EditorPage): tesisatın kendi paleti ve
 * kipleri var, bu çubuğun maddelerinin çoğu orada anlamsız.
 */
export function FloatingToolbar({ onGoToFloor }: FloatingToolbarProps) {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const setActiveTool = useUiStore((state) => state.setActiveTool)
  const isPanModeActive = useUiStore((state) => state.isPanModeActive)
  const setPanModeActive = useUiStore((state) => state.setPanModeActive)
  const isGridSnapEnabled = useUiStore((state) => state.isGridSnapEnabled)
  const toggleGridSnapEnabled = useUiStore((state) => state.toggleGridSnapEnabled)

  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  // Uçtaki katta ok pasif: geçiş döngüsel değil (floors.ts sözleşmesi).
  const hasFloorBelow = getFloorIdInDirection(floors, activeFloorId, 'down') !== undefined
  const hasFloorAbove = getFloorIdInDirection(floors, activeFloorId, 'up') !== undefined

  // Seçim aracı YALNIZ el modu kapalıyken etkin görünür: ikisi aynı anda
  // vurgulanırsa kullanıcı sol tuşun ne yapacağını çubuktan okuyamaz.
  const isSelectActive = activeToolId === SELECTION_TOOL_ID && !isPanModeActive

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
          onClick={() => setActiveTool(SELECTION_TOOL_ID)}
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
          onClick={undoProject}
          disabled={!canUndo}
          title="Geri al (Ctrl+Z)"
          aria-label="Geri al"
          className={canvasBarButtonVariants()}
        >
          <Undo2 size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <button
          type="button"
          onClick={redoProject}
          disabled={!canRedo}
          title="Yinele (Ctrl+Y)"
          aria-label="Yinele"
          className={canvasBarButtonVariants()}
        >
          <Redo2 size={16} strokeWidth={1.8} aria-hidden />
        </button>

        <span className={CANVAS_BAR_DIVIDER} aria-hidden />

        <button
          type="button"
          onClick={() => onGoToFloor('down')}
          disabled={!hasFloorBelow}
          title="Alt kata geç"
          aria-label="Alt kata geç"
          className={canvasBarButtonVariants()}
        >
          <ChevronDown size={16} strokeWidth={1.8} aria-hidden />
        </button>
        {/* Kat adı AÇILIR: sol üstteki şerit kaldırıldığı için tüm katların
            listesi ve boş-kat rozetleri buraya taşındı (K55). */}
        <FloorSelect />
        <button
          type="button"
          onClick={() => onGoToFloor('up')}
          disabled={!hasFloorAbove}
          title="Üst kata geç"
          aria-label="Üst kata geç"
          className={canvasBarButtonVariants()}
        >
          <ChevronUp size={16} strokeWidth={1.8} aria-hidden />
        </button>

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

        <span className={CANVAS_BAR_DIVIDER} aria-hidden />

        <ViewOptionsMenu />
      </div>
    </div>
  )
}
