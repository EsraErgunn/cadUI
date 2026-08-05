import { DrawPreview } from './DrawPreview'
import { SymbolInstance } from './SymbolInstance'
import { useEscapeToSelectionTool } from './useEscapeToSelectionTool'
import { usePlacementTool } from './usePlacementTool'
import { useSelectionTool, type SelectionToolState } from './useSelectionTool'
import { useCadStore } from '../../store/cadStore'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/** Aktif kattaki elemanlar. Store dizisine olduğu gibi abone olunur — türetilmiş
 *  dizi döndüren bir selector her store değişiminde yeni referans üretirdi. */
function InstallationElements({ draggedElementId, draggedPositionRef }: SelectionToolState) {
  const elements = useCadStore((state) => state.installationElements)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const selectedElementId = usePlumbingUiStore((state) => state.selectedElementId)

  return (
    <>
      {elements
        .filter((element) => element.floorId === activeFloorId)
        // key id, indeks DEĞİL: R3F indeks anahtarında yanlış mesh'i yeniden kullanır.
        .map((element) => (
          <SymbolInstance
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId}
            // Ref YALNIZ sürüklenen elemana gider: geri kalanı her frame konum yazmaz.
            positionRef={element.id === draggedElementId ? draggedPositionRef : undefined}
          />
        ))}
    </>
  )
}

/**
 * Tesisat sahnesinin kökü; SceneRoot yalnız tesisat görünümünde mount eder.
 * Karşı katmanın hayaleti buraya GİRMEZ: iki hayalet de SceneRoot'ta, görünüm
 * anahtarının yanında durur (ikisi de aktif katı kendi okur).
 * Klavye kısayolu buraya BAĞLANMAZ: geri al/yinele aktif görünüme göre
 * pages/useEditorShortcuts.ts'te tek dinleyiciden dağıtılır.
 */
export function PlumbingLayer() {
  const preview = usePlacementTool()
  const selection = useSelectionTool()
  useEscapeToSelectionTool()

  return (
    <group name="plumbing-root">
      <InstallationElements {...selection} />
      <DrawPreview elementType={preview.elementType} positionRef={preview.positionRef} />
    </group>
  )
}
