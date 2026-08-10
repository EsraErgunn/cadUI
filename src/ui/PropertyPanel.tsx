import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { OpeningProperties } from './properties/OpeningProperties'
import { PointSymbolProperties } from './properties/PointSymbolProperties'
import { SelectionActions } from './properties/SelectionActions'
import { WallProperties } from './properties/WallProperties'
import { SYMBOL_TYPE_LABELS } from '../core/pointSymbol'
import {
  getPropertyPanelTitle,
  getPropertySelectionKind,
} from '../core/propertyFields'
import { getSelectedIds } from '../core/selection'
import { selectOpeningById } from '../store/architectureSlice'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/**
 * Seçili nesnenin özellik paneli (KK-12). EditorPage'de çizim alanının KARDEŞİ
 * olarak duruyor: açıldığında tuvali daraltır, üzerine binmez.
 *
 * Hiçbir nesne seçili değilken hiç render edilmez — kapalıyken DOM üretmemek,
 * "gizli panel odakta kalıyor" sınıfı hataları baştan keser.
 */
export function PropertyPanel() {
  const selection = useArchitectureUiStore((state) => state.selection)
  const clearSelection = useArchitectureUiStore((state) => state.clearSelection)
  const deleteSelection = useCadStore((state) => state.deleteSelection)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const kind = getPropertySelectionKind(selection)
  const wallIds = getSelectedIds(selection, 'wall')
  const openingIds = getSelectedIds(selection, 'opening')
  const symbolIds = getSelectedIds(selection, 'symbol')

  // Başlıktaki "Kapı/Pencere" ayrımı tek açıklık seçiliyken anlamlı.
  const soleOpening = useCadStore((state) =>
    openingIds.length === 1 ? selectOpeningById(state, openingIds[0]) : undefined,
  )
  // Tek sembolde başlık türünün Türkçe adını gösterir ("Pano Özellikleri").
  const soleSymbolLabel = useCadStore((state) =>
    symbolIds.length === 1
      ? state.symbols.find((symbol) => symbol.id === symbolIds[0])?.type
      : undefined,
  )

  if (kind === 'none') return null

  const handleDelete = () => {
    deleteSelection(selection)
    clearSelection()
  }

  return (
    <aside
      aria-label="Nesne özellikleri"
      className="flex w-64 shrink-0 flex-col border-l border-edge bg-surface"
    >
      <button
        type="button"
        onClick={() => setIsCollapsed((current) => !current)}
        aria-expanded={!isCollapsed}
        className="flex shrink-0 items-center gap-1.5 border-b border-edge px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-surface-sunken"
      >
        {isCollapsed ? (
          <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
        ) : (
          <ChevronDown size={16} strokeWidth={1.8} aria-hidden />
        )}
        {getPropertyPanelTitle(
          kind,
          selection.length,
          soleOpening?.type === 'door',
          soleSymbolLabel ? `${SYMBOL_TYPE_LABELS[soleSymbolLabel]} Özellikleri` : '',
        )}
      </button>

      {!isCollapsed && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {kind === 'wall' && <WallProperties wallIds={wallIds} />}
            {kind === 'opening' && <OpeningProperties openingIds={openingIds} />}
            {kind === 'symbol' && <PointSymbolProperties symbolIds={symbolIds} />}
            {/* Karışık seçimde ortak alan yok: duvarın kalınlığıyla açıklığın
                genişliği aynı şey değil. Silme yine de çalışır. */}
            {kind === 'mixed' && (
              <p className="py-1 text-xs text-ink-muted">
                Farklı türde nesneler seçili; ortak düzenlenebilir alan yok.
              </p>
            )}
          </div>

          <SelectionActions />

          <div className="shrink-0 border-t border-edge px-3 py-2">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-sm text-danger hover:bg-danger/10"
            >
              <Trash2 size={16} strokeWidth={1.8} aria-hidden />
              Sil
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
