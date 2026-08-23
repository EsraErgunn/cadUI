import { Copy, FlipHorizontal, FlipHorizontal2, FlipVertical, RotateCw } from 'lucide-react'

import { MIRROR_AXIS_TOOL_ID } from '../../core/tools'
import type { MirrorAxis } from '../../core/transform'
import { QUARTER_TURN_DEG } from '../../core/transform'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { getSelectionPivot } from '../../store/transformOps'
import { useUiStore } from '../../store/uiStore'
import { chromeButtonVariants } from '../controls/buttonVariants'

/** Çoğaltma kopyayı kaynağın üstüne koymaz: kullanıcı ikisini ayırt edebilmeli. */
const DUPLICATE_OFFSET_CM = 50

/**
 * Seçim üzerinde toplu işlemler (KK-11). Panelde duruyor çünkü panel zaten
 * "seçili nesnelerin arayüzü" — ayrı bir şerit ikinci bir seçim göstergesi olurdu.
 *
 * Dayanak noktası seçimin sınır kutusu merkezidir (`getSelectionPivot`); nesne
 * kendi etrafında döner, sahnenin orijini etrafında değil.
 */
export function SelectionActions() {
  const selection = useArchitectureUiStore((state) => state.selection)
  const setSelection = useArchitectureUiStore((state) => state.setSelection)
  const transformSelection = useCadStore((state) => state.transformSelection)
  const duplicateSelection = useCadStore((state) => state.duplicateSelection)
  const setActiveTool = useUiStore((state) => state.setActiveTool)
  const isMirrorAxisActive = useUiStore((state) => state.activeToolId === MIRROR_AXIS_TOOL_ID)

  // Açıklık kendi koordinatını taşımıyor (duvarına offset'le bağlı): YALNIZ
  // açıklık seçiliyken dönüşümün uygulanacağı bir koordinat yok, düğmeler pasif.
  // Diğer dört tür kendi konumunu taşıyor, hepsi dönüştürülebilir (K49).
  const isTransformable = selection.some((item) => item.kind !== 'opening')

  const runTransform = (build: (pivot: { x: number; y: number }) => void) => {
    const pivot = getSelectionPivot(useCadStore.getState(), selection)
    if (!pivot) return
    build(pivot)
  }

  const rotate = () =>
    runTransform((pivot) =>
      transformSelection(selection, { kind: 'rotate', pivot, angleDeg: QUARTER_TURN_DEG }),
    )

  const mirror = (axis: MirrorAxis) =>
    runTransform((pivot) => transformSelection(selection, { kind: 'mirror', pivot, axis }))

  const duplicate = () => {
    const created = duplicateSelection(selection, {
      dxCm: DUPLICATE_OFFSET_CM,
      dyCm: DUPLICATE_OFFSET_CM,
    })
    // Seçim KOPYAYA geçer: kullanıcı çoğalttığı şeyi hemen sürükleyebilsin.
    if (created.length > 0) setSelection(created)
  }

  return (
    <div className="flex flex-wrap gap-1 border-t border-edge px-3 py-2">
      <button
        type="button"
        onClick={rotate}
        disabled={!isTransformable}
        title={`${QUARTER_TURN_DEG}° döndür`}
        aria-label={`${QUARTER_TURN_DEG} derece döndür`}
        className={chromeButtonVariants({ shape: 'icon' })}
      >
        <RotateCw size={16} strokeWidth={1.8} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => mirror('vertical')}
        disabled={!isTransformable}
        title="Dikey eksende aynala"
        aria-label="Dikey eksende aynala"
        className={chromeButtonVariants({ shape: 'icon' })}
      >
        <FlipHorizontal size={16} strokeWidth={1.8} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => mirror('horizontal')}
        disabled={!isTransformable}
        title="Yatay eksende aynala"
        aria-label="Yatay eksende aynala"
        className={chromeButtonVariants({ shape: 'icon' })}
      >
        <FlipVertical size={16} strokeWidth={1.8} aria-hidden />
      </button>
      {/* Eksene göre aynalama TUVALDE tamamlanıyor: düğme yalnız aracı açıyor,
          kullanıcı ekseni çiziyor (`useMirrorAxisTool`). Panelde bitirilebilecek
          bir iş değil — ayna doğrusunun yeri çizimin üstünde seçiliyor. */}
      <button
        type="button"
        onClick={() => setActiveTool(MIRROR_AXIS_TOOL_ID)}
        disabled={!isTransformable}
        title="Çizilen eksende aynala"
        aria-label="Çizilen eksende aynala"
        aria-pressed={isMirrorAxisActive}
        className={chromeButtonVariants({ shape: 'icon', tone: isMirrorAxisActive ? 'active' : 'plain' })}
      >
        <FlipHorizontal2 size={16} strokeWidth={1.8} aria-hidden />
      </button>
      <button
        type="button"
        onClick={duplicate}
        disabled={!isTransformable}
        title="Çoğalt (Ctrl+D)"
        aria-label="Çoğalt"
        className={chromeButtonVariants({ shape: 'icon' })}
      >
        <Copy size={16} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  )
}
