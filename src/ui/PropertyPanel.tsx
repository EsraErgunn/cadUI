import { useEffect, useRef } from 'react'

import { AreaObjectProperties } from './properties/AreaObjectProperties'
import { BeamProperties } from './properties/BeamProperties'
import { OpeningProperties } from './properties/OpeningProperties'
import { PointSymbolProperties } from './properties/PointSymbolProperties'
import { PropertyPanelShell } from './properties/PropertyPanelShell'
import { SelectionActions } from './properties/SelectionActions'
import { WallProperties } from './properties/WallProperties'
import { AREA_OBJECT_TYPE_LABELS } from '../core/areaObject'
import { SYMBOL_TYPE_LABELS } from '../core/pointSymbol'
import {
  getPropertyPanelTitle,
  getPropertySelectionKind,
} from '../core/propertyFields'
import { getSelectedIds } from '../core/selection'
import { selectOpeningById } from '../store/architectureSlice'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

/**
 * Seçili nesnenin özellik paneli (K37). Çizim alanının ÜSTÜNE biner, sağdan
 * kayarak açılır/kapanır — EditorPage'deki `relative` satırın altında `absolute`
 * konumlanıyor, canvas genişliğini artık etkilemiyor (KK-12'nin yerini aldı).
 *
 * Hiçbir nesne seçili değilken de DOM'da kalır (animasyon için) ama
 * `pointer-events-none` + ekran dışına kaydırılmış: odaklanamaz, tıklanamaz.
 */
export function PropertyPanel() {
  const selection = useArchitectureUiStore((state) => state.selection)
  const clearSelection = useArchitectureUiStore((state) => state.clearSelection)
  const deleteSelection = useCadStore((state) => state.deleteSelection)
  const activeViewId = useUiStore((state) => state.activeViewId)

  /**
   * Görünüm değişince panel KAPANIR (K53). Kapanma seçimi bırakarak yapılıyor,
   * paneli ayrıca gizleyerek değil: panel seçimin saf bir türevi (K37) ve ikinci
   * bir "kapalı ama seçim duruyor" durumu iki ayrı doğruluk kaynağı olurdu —
   * kullanıcı geri döndüğünde panel kendiliğinden yeniden açılırdı.
   *
   * ⚠️ Önceki görünüm ref'te tutuluyor: bağımlılık dizisine güvenip her
   * çalıştırmada temizlemek MOUNT anında da seçimi siler. Bugün zararsız
   * görünürdü (editör boş seçimle açılıyor) ama panelin her yeniden
   * bağlanmasında kullanıcının seçimi sessizce giderdi.
   */
  const previousViewIdRef = useRef(activeViewId)
  useEffect(() => {
    if (previousViewIdRef.current === activeViewId) return
    previousViewIdRef.current = activeViewId
    clearSelection()
  }, [activeViewId, clearSelection])

  // `clearSelection` yalnız BİR SONRAKİ render'da (passive effect, paint'ten
  // SONRA) işler; o araya denk gelen karede panel eski seçimle -ve tesisat
  // görünümündeyken mimari alanlarıyla- hâlâ açık ve DÜZENLENEBİLİR kalırdı.
  // Görünüm kontrolü burada, render'ın kendisinde: efekt beklemeden kapatır.
  const isArchitectureView = activeViewId === 'architecture'

  const kind = isArchitectureView ? getPropertySelectionKind(selection) : 'none'
  const wallIds = getSelectedIds(selection, 'wall')
  const openingIds = getSelectedIds(selection, 'opening')
  const symbolIds = getSelectedIds(selection, 'symbol')
  const areaObjectIds = getSelectedIds(selection, 'area')
  const beamIds = getSelectedIds(selection, 'beam')

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
  // Tek alan nesnesinde başlık türünün Türkçe adını gösterir ("Kolon Özellikleri").
  const soleAreaObjectLabel = useCadStore((state) =>
    areaObjectIds.length === 1
      ? state.areaObjects.find((areaObject) => areaObject.id === areaObjectIds[0])?.type
      : undefined,
  )

  const isOpen = kind !== 'none'

  const handleDelete = () => {
    deleteSelection(selection)
    clearSelection()
  }

  return (
    <PropertyPanelShell
      label="Nesne özellikleri"
      isOpen={isOpen}
      onDelete={handleDelete}
      actions={<SelectionActions />}
      title={getPropertyPanelTitle(
        kind,
        selection.length,
        soleOpening?.type === 'door',
        soleSymbolLabel ? `${SYMBOL_TYPE_LABELS[soleSymbolLabel]} Özellikleri` : '',
        soleAreaObjectLabel ? `${AREA_OBJECT_TYPE_LABELS[soleAreaObjectLabel]} Özellikleri` : '',
      )}
    >
      {kind === 'wall' && <WallProperties wallIds={wallIds} />}
      {kind === 'opening' && <OpeningProperties openingIds={openingIds} />}
      {kind === 'symbol' && <PointSymbolProperties symbolIds={symbolIds} />}
      {kind === 'area' && <AreaObjectProperties areaObjectIds={areaObjectIds} />}
      {kind === 'beam' && <BeamProperties beamIds={beamIds} />}
      {/* Karışık seçimde ortak alan yok: duvarın kalınlığıyla açıklığın
          genişliği aynı şey değil. Silme yine de çalışır. */}
      {kind === 'mixed' && (
        <p className="py-1 text-xs text-ink-muted">
          Farklı türde nesneler seçili; ortak düzenlenebilir alan yok.
        </p>
      )}
    </PropertyPanelShell>
  )
}
