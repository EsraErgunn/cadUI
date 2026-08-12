import { AreaObject, type AreaObjectTone } from './AreaObject'
import { AreaObjectHandles } from './AreaObjectHandles'
import { Opening, type OpeningTone } from './Opening'
import { PointHandles } from './PointHandle'
import { PointSymbol, type PointSymbolTone } from './PointSymbol'
import { Rooms } from './Room'
import { RoomTool } from './RoomTool'
import { SelectionMarquee } from './SelectionMarquee'
import { Walls } from './Wall'
import { WallTool } from './WallTool'
import { useArchitecturePoints } from './useArchitecturePoints'
import { useAreaObjectSelectionTool } from './useAreaObjectSelectionTool'
import { useAreaObjectTool } from './useAreaObjectTool'
import { useOpeningTool } from './useOpeningTool'
import { usePointSymbolSelectionTool } from './usePointSymbolSelectionTool'
import { usePointSymbolTool } from './usePointSymbolTool'
import { useRoomNameTool } from './useRoomNameTool'
import { useSelectionTool } from './useSelectionTool'
import { DEFAULT_AREA_OBJECT_SIZE_CM } from '../core/areaObject'
import { getOpeningOutline } from '../core/opening'
import { isSelected } from '../core/selection'
import { getSymbolPose, getSymbolsOnFloor } from '../core/symbolPlacement'
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
  const symbolWalls = useCadStore((state) => state.walls)
  const symbolPoints = useArchitecturePoints()
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const hover = useArchitectureUiStore((state) => state.hover)
  const selection = useArchitectureUiStore((state) => state.selection)
  const draggingSymbols = useArchitectureUiStore((state) => state.draggingSymbols)

  const hoveredSymbolId = hover?.kind === 'symbol' ? hover.symbolId : undefined

  return (
    <>
      {getSymbolsOnFloor(symbols, activeFloorId, symbolWalls).map((symbol) => {
        const pose = getSymbolPose(symbol, symbolWalls, symbolPoints)
        // Duvarı çözülemeyen bağlı sembol çizilmez; kalıcı olmamalı, duvar
        // silinince semboller de temizleniyor.
        if (!pose) return null

        // Seçim vurgudan baskın: seçili sembolün üstündeyken mavi kalır.
        const tone: PointSymbolTone = isSelected(selection, 'symbol', symbol.id)
          ? 'selected'
          : symbol.id === hoveredSymbolId
            ? 'hovered'
            : 'normal'

        // Sürüklenen sembol geçici konumuyla çizilir; store'a bırakma anında yazılır.
        const drag = draggingSymbols?.symbolIds.includes(symbol.id) ? draggingSymbols : undefined
        const drawnPose = drag
          ? {
              ...pose,
              position: { x: pose.position.x + drag.dxCm, y: pose.position.y + drag.dyCm },
            }
          : pose

        // key id, indeks DEĞİL: R3F indeks anahtarında yanlış mesh'i yeniden kullanır.
        return (
          <PointSymbol
            key={symbol.id}
            symbolId={symbol.id}
            type={symbol.type}
            pose={drawnPose}
            tone={tone}
          />
        )
      })}

      {preview && (
        <PointSymbol type={preview.type} pose={preview.pose} tone="preview" />
      )}
    </>
  )
}

/**
 * Alan nesnelerini (merdiven/kolon/baca şaftı) çizer, yerleştirme ve
 * seçim/taşıma araçlarını çalıştırır. PointSymbols ile aynı desen.
 */
function AreaObjects() {
  const preview = useAreaObjectTool()
  useAreaObjectSelectionTool()
  const areaObjects = useCadStore((state) => state.areaObjects)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const hover = useArchitectureUiStore((state) => state.hover)
  const selection = useArchitectureUiStore((state) => state.selection)
  const draggingAreaObjects = useArchitectureUiStore((state) => state.draggingAreaObjects)
  const handleDrag = useArchitectureUiStore((state) => state.areaObjectHandleDrag)

  const hoveredAreaObjectId = hover?.kind === 'area' ? hover.areaObjectId : undefined

  return (
    <>
      {areaObjects
        .filter((areaObject) => areaObject.floorId === activeFloorId)
        .map((areaObject) => {
          // Seçim vurgudan baskın — PointSymbols ile aynı gerekçe.
          const tone: AreaObjectTone = isSelected(selection, 'area', areaObject.id)
            ? 'selected'
            : areaObject.id === hoveredAreaObjectId
              ? 'hovered'
              : 'normal'

          // Sürüklenen nesne geçici konumuyla çizilir; store'a bırakma anında yazılır.
          const drag = draggingAreaObjects?.areaObjectIds.includes(areaObject.id)
            ? draggingAreaObjects
            : undefined
          // Tutamaç sürüklemesi önizlenen ŞEKLİ verir (konum + boyut + açı);
          // taşımanınki yalnız öteleme. İkisi aynı anda olamaz — taşıma
          // tutamaç üstündeyken hiç başlamıyor (K44).
          const drawn =
            handleDrag?.areaObjectId === areaObject.id
              ? { ...areaObject, ...handleDrag.shape }
              : drag
                ? { ...areaObject, x: areaObject.x + drag.dxCm, y: areaObject.y + drag.dyCm }
                : areaObject

          // key id, indeks DEĞİL: R3F indeks anahtarında yanlış mesh'i yeniden kullanır.
          return (
            <AreaObject
              key={areaObject.id}
              areaObjectId={areaObject.id}
              type={areaObject.type}
              areaObject={drawn}
              tone={tone}
            />
          )
        })}

      {preview && (
        <AreaObject
          type={preview.type}
          areaObject={{
            x: preview.position.x,
            y: preview.position.y,
            widthCm: DEFAULT_AREA_OBJECT_SIZE_CM[preview.type].widthCm,
            lengthCm: DEFAULT_AREA_OBJECT_SIZE_CM[preview.type].lengthCm,
            angleDeg: 0,
          }}
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
      {/* Alan nesnesi sembolün de üstünde (RENDER_ORDER.areaObject > pointSymbol). */}
      <AreaObjects />
      <WallTool />
      <RoomTool />
      <SelectionTool />
      {/* Tutamaklar ve seçim çerçevesi en üstte: altındaki her şeyin üzerinde görünmeli. */}
      <PointHandles />
      <AreaObjectHandles />
      <SelectionMarquee />
    </group>
  )
}
