import { DischargePreview } from './DischargePreview'
import { DrawPreview, LineDraftPreview } from './DrawPreview'
import { ElementNameLabels } from './ElementNameLabels'
import { ElementRotateHandle } from './ElementRotateHandle'
import { FloorLinkGlyphs } from './FloorLinkGlyph'
import { InstallationLines } from './InstallationLineMesh'
import { LengthLabels } from './LengthLabels'
import { MeasurementOverlay } from './MeasurementOverlay'
import { DrawingPortMarkers } from './PortMarkers'
import { SelectionMarquee } from './SelectionMarquee'
import { SplitLengthLabels } from './SplitLengthLabels'
import { SymbolInstance } from './SymbolInstance'
import { useDischargeTool } from './useDischargeTool'
import { useEscapeToSelectionTool } from './useEscapeToSelectionTool'
import { useLineTool } from './useLineTool'
import { useMeasurementTool } from './useMeasurementTool'
import { usePlacementTool } from './usePlacementTool'
import { useSelectionTool, type SelectionToolState } from './useSelectionTool'
import { useCadStore } from '../../store/cadStore'
import { getInlineElementElevationCm } from '../core/lineElevation'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/** Aktif kattaki elemanlar. Store dizisine olduğu gibi abone olunur — türetilmiş
 *  dizi döndüren bir selector her store değişiminde yeni referans üretirdi. */
function InstallationElements({ draggedElementIds, dragDeltaRef }: SelectionToolState) {
  const elements = useCadStore((state) => state.installationElements)
  const lines = useCadStore((state) => state.installationLines)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const selectedElementIds = usePlumbingUiStore((state) => state.selectedElementIds)

  return (
    <>
      {elements
        .filter((element) => element.floorId === activeFloorId)
        // key id, indeks DEĞİL: R3F indeks anahtarında yanlış mesh'i yeniden kullanır.
        .map((element) => (
          <SymbolInstance
            key={element.id}
            element={element}
            isSelected={selectedElementIds.includes(element.id)}
            // Ref YALNIZ sürüklenen elemanlara gider: geri kalanı her frame konum yazmaz.
            dragDeltaRef={draggedElementIds.includes(element.id) ? dragDeltaRef : undefined}
            // Boruya oturan eleman borunun kotunu izler (K102) — türetilmiş, store'a yazılmaz.
            elevationCm={getInlineElementElevationCm(element.id, lines)}
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
  const line = useLineTool()
  const discharge = useDischargeTool()
  const measurement = useMeasurementTool()
  const selection = useSelectionTool()
  useEscapeToSelectionTool()

  return (
    <group name="plumbing-root">
      <InstallationLines
        draggedLineIds={selection.draggedLineIds}
        dragDeltaRef={selection.dragDeltaRef}
      />
      <InstallationElements {...selection} />
      <LengthLabels
        draggedLineIds={selection.draggedLineIds}
        dragDeltaRef={selection.dragDeltaRef}
      />
      <ElementNameLabels
        draggedElementIds={selection.draggedElementIds}
        dragDeltaRef={selection.dragDeltaRef}
      />
      <ElementRotateHandle />
      <FloorLinkGlyphs />
      <DrawPreview {...preview} />
      <DrawingPortMarkers {...line} />
      <SplitLengthLabels {...line} />
      <LineDraftPreview {...line} />
      <DischargePreview {...discharge} />
      <MeasurementOverlay {...measurement} />
      <SelectionMarquee />
    </group>
  )
}
