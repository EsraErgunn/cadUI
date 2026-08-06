import { Opening, type OpeningTone } from './Opening'
import { PointHandles } from './PointHandle'
import { PointSymbol, type PointSymbolTone } from './PointSymbol'
import { Rooms } from './Room'
import { RoomTool } from './RoomTool'
import { SelectionMarquee } from './SelectionMarquee'
import { Walls } from './Wall'
import { WallTool } from './WallTool'
import { useArchitecturePoints } from './useArchitecturePoints'
import { useOpeningTool } from './useOpeningTool'
import { usePointSymbolSelectionTool } from './usePointSymbolSelectionTool'
import { usePointSymbolTool } from './usePointSymbolTool'
import { useRoomNameTool } from './useRoomNameTool'
import { useSelectionTool } from './useSelectionTool'
import { getOpeningOutline } from '../core/opening'
import { isSelected } from '../core/selection'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/**
 * Açıklıkları çizer ve kapı/pencere aracını çalıştırır. Hook'lar <Canvas> içinde
 * çalışmak zorunda; PlumbingLayer/ViewportControls ile aynı desen.
 * Sahne state'in TÜREVİ: mesh'te veri tutulmaz.
 */
function Openings() {
  const preview = useOpeningTool()
  // Yalnız KARARLI referanslara abone olunur. selectWallsOnFloor/
  // selectOpeningsOnWall her çağrıda yeni dizi üretir; buraya konsalardı
  // Object.is her store değişiminde false döner ve sonsuz render olurdu.
  // Köşe sürüklenirken açıklık da duvarla birlikte gelsin diye ortak havuzdan okunur.
  const points = useArchitecturePoints()
  const walls = useCadStore((state) => state.walls)
  const openings = useCadStore((state) => state.openings)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const selection = useArchitectureUiStore((state) => state.selection)

  return (
    <>
      {openings.map((opening) => {
        const wall = walls.find((candidate) => candidate.id === opening.wallId)
        if (!wall || wall.floorId !== activeFloorId) return null

        const outline = getOpeningOutline(wall, points, opening)
        if (!outline) return null

        const tone: OpeningTone = isSelected(selection, 'opening', opening.id)
          ? 'selected'
          : 'normal'

        // key id, indeks DEĞİL: R3F indeks anahtarında yanlış mesh'i yeniden kullanır.
        return <Opening key={opening.id} outline={outline} type={opening.type} tone={tone} />
      })}

      {preview && (
        <Opening
          outline={preview.outline}
          type={preview.type}
          tone={preview.isValid ? 'previewValid' : 'previewInvalid'}
        />
      )}
    </>
  )
}

/**
 * Nokta sembollerini çizer ve yerleştirme aracını çalıştırır (Desen A).
 * Openings ile aynı desen: hook <Canvas> içinde koşmak zorunda.
 */
function PointSymbols() {
  const preview = usePointSymbolTool()
  usePointSymbolSelectionTool()
  const symbols = useCadStore((state) => state.symbols)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const hover = useArchitectureUiStore((state) => state.hover)
  const selection = useArchitectureUiStore((state) => state.selection)
  const draggingSymbols = useArchitectureUiStore((state) => state.draggingSymbols)

  const hoveredSymbolId = hover?.kind === 'symbol' ? hover.symbolId : undefined

  return (
    <>
      {symbols
        .filter((symbol) => symbol.floorId === activeFloorId)
        .map((symbol) => {
          // Seçim vurgudan baskın: seçili sembolün üstündeyken mavi kalır.
          const tone: PointSymbolTone = isSelected(selection, 'symbol', symbol.id)
            ? 'selected'
            : symbol.id === hoveredSymbolId
              ? 'hovered'
              : 'normal'

          // Sürüklenen sembol geçici konumuyla çizilir; store'a bırakma anında yazılır.
          const isDragged = draggingSymbols?.symbolIds.includes(symbol.id) ?? false
          const dragged = isDragged
            ? {
                ...symbol,
                x: symbol.x + draggingSymbols!.dxCm,
                y: symbol.y + draggingSymbols!.dyCm,
              }
            : symbol

          // key id, indeks DEĞİL: R3F indeks anahtarında yanlış mesh'i yeniden kullanır.
          return <PointSymbol key={symbol.id} symbolId={symbol.id} symbol={dragged} tone={tone} />
        })}

      {preview && (
        <PointSymbol
          symbol={{ type: preview.type, ...preview.position, rotationDeg: 0 }}
          tone="preview"
        />
      )}
    </>
  )
}

/** Çerçeve seçimi hook'u; <Canvas> içinde çalışmak zorunda (Openings ile aynı desen). */
function SelectionTool() {
  useSelectionTool()
  return null
}

/** Mimari sahnenin kökü; SceneRoot yalnız mimari görünümde mount eder. */
export function ArchitectureLayer() {
  // Oda adı düzenleme jesti; hook <Canvas> içinde çalışmak zorunda (kamera okuyor).
  useRoomNameTool()

  return (
    <group name="architecture-root">
      {/* Odalar EN ALTTA (RENDER_ORDER.room < wall): dolgu duvarları örtmesin. */}
      <Rooms />
      <Walls />
      {/* Açıklık duvarın ÜSTÜNE boyanıyor (RENDER_ORDER.opening > wall), sırası önemli. */}
      <Openings />
      {/* Sembol açıklığın da üstünde (RENDER_ORDER.pointSymbol > opening). */}
      <PointSymbols />
      <WallTool />
      <RoomTool />
      <SelectionTool />
      {/* Tutamaklar ve seçim çerçevesi en üstte: altındaki her şeyin üzerinde görünmeli. */}
      <PointHandles />
      <SelectionMarquee />
    </group>
  )
}
