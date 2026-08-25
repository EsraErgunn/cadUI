import { AreaObject, type AreaObjectTone } from './AreaObject'
import { AreaObjectHandles } from './AreaObjectHandles'
import { AreaObjectNameLabels } from './AreaObjectNameLabels'
import { Beam, type BeamTone } from './Beam'
import { BeamHandles } from './BeamHandles'
import { CornerAngleLabels } from './CornerAngleLabels'
import { MeasurementOverlay } from './MeasurementOverlay'
import { MirrorAxisOverlay } from './MirrorAxisOverlay'
import { Opening, type OpeningTone } from './Opening'
import { PointHandles } from './PointHandle'
import { PointSymbol, type PointSymbolTone } from './PointSymbol'
import { PointSymbolNameLabels } from './PointSymbolNameLabels'
import { Rooms } from './Room'
import { RoomTool } from './RoomTool'
import { RoomUsageContextMenu } from './RoomUsageContextMenu'
import { SelectionMarquee } from './SelectionMarquee'
import { SketchStrokes } from './SketchStrokes'
import { TextLabelEditor } from './TextLabelEditor'
import { TextLabels } from './TextLabels'
import { Walls } from './Wall'
import { WallDimensionLabels } from './WallDimensionLabels'
import { WallTool } from './WallTool'
import { useArchitectureDraft } from './useArchitectureDraft'
import { useAreaObjectLabelTool } from './useAreaObjectLabelTool'
import { useAreaObjectSelectionTool } from './useAreaObjectSelectionTool'
import { useAreaObjectTool } from './useAreaObjectTool'
import { useBeamSelectionTool } from './useBeamSelectionTool'
import { useBeamTool } from './useBeamTool'
import { useCameraZoom } from './useCameraZoom'
import { useMeasurementTool } from './useMeasurementTool'
import { useMirrorAxisTool } from './useMirrorAxisTool'
import { useOpeningTool } from './useOpeningTool'
import { usePointSymbolLabelTool } from './usePointSymbolLabelTool'
import { usePointSymbolSelectionTool } from './usePointSymbolSelectionTool'
import { usePointSymbolTool } from './usePointSymbolTool'
import { useRightClickReturnsToSelection } from './useRightClickReturnsToSelection'
import { useRoomDefinitionExit } from './useRoomDefinitionExit'
import { useRoomUsageContextMenu } from './useRoomUsageContextMenu'
import { useSelectionTool } from './useSelectionTool'
import { useTextSelectionTool } from './useTextSelectionTool'
import { useTextTool } from './useTextTool'
import { useWallNodeTool } from './useWallNodeTool'
import { DEFAULT_AREA_OBJECT_SIZE_CM } from '../core/areaObject'
import { DEFAULT_BEAM_THICKNESS_CM } from '../core/beam'
import { getOpeningOutline } from '../core/opening'
import { isSelected } from '../core/selection'
import {
  getSymbolPose,
  getSymbolsOnFloor,
  resolveSymbolAttachment,
} from '../core/symbolPlacement'
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
  // Köşe sürüklenirken açıklık da duvarla birlikte gelsin diye ortak havuzdan
  // okunur. Duvar BAĞLANTISI da önizlemeden gelmeli: yalnız noktayı draft'tan
  // almak kopmayı görmez — kopan komşu store'da hâlâ ÖZGÜN köşeye bakar, o köşe
  // ise draft'ta taşınmıştır. Açıklık böylece taşınan köşeye uzanan HAYALİ bir
  // duvara oturup sürükleme boyunca eğiliyordu (K108).
  const { points, walls } = useArchitectureDraft()
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
  // Ad etiketi sürüklemesi; jest sahipliği `findPointSymbolLabelAt` ile veriliyor.
  usePointSymbolLabelTool()
  const symbols = useCadStore((state) => state.symbols)
  // Açıklıkla aynı gerekçe (K108): duvara oturan sembol de kopmayı görmeli.
  const { points: symbolPoints, walls: symbolWalls } = useArchitectureDraft()
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
        //
        // ⚠️ Bağlanma sürükleme SIRASINDA çözülür (K177): hedef noktadan
        // resolveSymbolAttachment geçilip poz yeniden hesaplanıyor. Eskiden ham
        // öteleme uygulanıyordu ve duvara ait cihaz sürüklenirken duvardan
        // kopup havada duruyor, ancak fare bırakılınca geri sıçrıyordu.
        // Bırakma da AYNI noktadan çözüyor, yani görülen yer yazılan yer.
        const drag = draggingSymbols?.symbolIds.includes(symbol.id) ? draggingSymbols : undefined
        const drawnPose = drag
          ? getSymbolPose(
              {
                ...symbol,
                ...resolveSymbolAttachment(drag.targetCm, symbol.type, {
                  walls: symbolWalls,
                  points: symbolPoints,
                  floorId: activeFloorId,
                }),
              },
              symbolWalls,
              symbolPoints,
            ) ?? pose
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
  // Zoom BİR kez okunur ve nesnelere dağıtılır (Walls ile aynı gerekçe).
  const zoom = useCameraZoom()
  useAreaObjectSelectionTool()
  // Ad etiketi sürüklemesi; jest sahipliği `findAreaObjectLabelAt` ile veriliyor.
  useAreaObjectLabelTool()
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
              zoom={zoom}
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
            angleDeg: preview.angleDeg,
          }}
          zoom={zoom}
          tone="preview"
        />
      )}
    </>
  )
}

/**
 * Kirişleri çizer, çizim ve seçim/taşıma araçlarını çalıştırır. AreaObjects ile
 * aynı desen.
 */
function Beams() {
  const preview = useBeamTool()
  // Zoom BİR kez okunur ve kirişlere dağıtılır (Walls ile aynı gerekçe).
  const zoom = useCameraZoom()
  useBeamSelectionTool()
  const beams = useCadStore((state) => state.beams)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const hover = useArchitectureUiStore((state) => state.hover)
  const selection = useArchitectureUiStore((state) => state.selection)
  const draggingBeams = useArchitectureUiStore((state) => state.draggingBeams)
  const handleDrag = useArchitectureUiStore((state) => state.beamHandleDrag)

  const hoveredBeamId = hover?.kind === 'beam' ? hover.beamId : undefined

  return (
    <>
      {beams
        .filter((beam) => beam.floorId === activeFloorId)
        .map((beam) => {
          // Seçim vurgudan baskın — AreaObjects ile aynı gerekçe.
          const tone: BeamTone = isSelected(selection, 'beam', beam.id)
            ? 'selected'
            : beam.id === hoveredBeamId
              ? 'hovered'
              : 'normal'

          // Uç sürüklemesi tek UCU, taşıma ise iki ucu birlikte oynatır. İkisi
          // aynı anda olamaz: taşıma tutamaç üstündeyken hiç başlamıyor.
          const drag = draggingBeams?.beamIds.includes(beam.id) ? draggingBeams : undefined
          const drawn =
            handleDrag?.beamId === beam.id
              ? handleDrag.end === 'p1'
                ? { ...beam, x1: handleDrag.position.x, y1: handleDrag.position.y }
                : { ...beam, x2: handleDrag.position.x, y2: handleDrag.position.y }
              : drag
                ? {
                    ...beam,
                    x1: beam.x1 + drag.dxCm,
                    y1: beam.y1 + drag.dyCm,
                    x2: beam.x2 + drag.dxCm,
                    y2: beam.y2 + drag.dyCm,
                  }
                : beam

          // key id, indeks DEĞİL: R3F indeks anahtarında yanlış mesh'i yeniden kullanır.
          return <Beam key={beam.id} beamId={beam.id} beam={drawn} tone={tone} zoom={zoom} />
        })}

      {/* Önizleme yalnız birinci uç konduktan SONRA çizilir: tek nokta bir
          dikdörtgen tanımlamıyor, kullanıcı o ana kadar yalnız imleci görür. */}
      {preview?.start && (
        <Beam
          beam={{
            x1: preview.start.x,
            y1: preview.start.y,
            x2: preview.cursor.x,
            y2: preview.cursor.y,
            thicknessCm: DEFAULT_BEAM_THICKNESS_CM,
          }}
          tone="preview"
          zoom={zoom}
        />
      )}
    </>
  )
}

/**
 * Çerçeve seçimi ve "sağ tık araçtan çıkar" kuralı (K84); ikisi de <Canvas>
 * içinde çalışmak zorunda (Openings ile aynı desen). Sağ tık kuralı TEK yerde
 * mount ediliyor — araç başına kopyalansaydı yeni araç eklendiğinde unutulurdu.
 */
function SelectionTool() {
  useSelectionTool()
  useRightClickReturnsToSelection()
  // Mahal menüsü de sağ tık dinliyor ama ÇAKIŞMIYOR: o yalnız seçim aracında
  // açılıyor, "araçtan çık" kuralı ise yalnız seçim DIŞINDA iş yapıyor (K160).
  useRoomUsageContextMenu()
  // Çift tık: duvarda düğüm açar, düğümde kaldırır (K161). Sağ tık dinleyen iki
  // hook'la çakışmaz — o jest ayrı.
  useWallNodeTool()
  useRoomDefinitionExit()
  return <RoomUsageContextMenu />
}

/** Ölçüm aracı: hook <Canvas> içinde koşmak zorunda (kamera okuyor). */
function Measurement() {
  return <MeasurementOverlay {...useMeasurementTool()} />
}

/** Aynalama ekseni: araç + önizleme, Measurement ile aynı desen. */
function MirrorAxis() {
  return <MirrorAxisOverlay {...useMirrorAxisTool()} />
}

/**
 * Metinleri çizer, yerleştirme ve seçim/taşıma/düzenleme araçlarını çalıştırır.
 * AreaObjects ile aynı desen: hook'lar <Canvas> içinde koşmak zorunda.
 */
function Texts() {
  useTextTool()
  useTextSelectionTool()
  const texts = useCadStore((state) => state.texts)
  const editingTextId = useArchitectureUiStore((state) => state.editingTextId)
  const editing = texts.find((text) => text.id === editingTextId)

  return (
    <>
      <TextLabels />
      {editing && <TextLabelEditor text={editing} />}
    </>
  )
}

/** Mimari sahnenin kökü; SceneRoot yalnız mimari görünümde mount eder. */
export function ArchitectureLayer() {
  // Oda adı düzenleme jesti; hook <Canvas> içinde çalışmak zorunda (kamera okuyor).

  return (
    <group name="architecture-root">
      {/* Odalar EN ALTTA (RENDER_ORDER.room < wall): dolgu duvarları örtmesin. */}
      <Rooms />
      <Walls />
      {/* Açıklık duvarın ÜSTÜNE boyanıyor (RENDER_ORDER.opening > wall), sırası önemli. */}
      <Openings />
      {/* Kiriş açıklığın üstünde, sembolün altında (RENDER_ORDER.beam). */}
      <Beams />
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
      <Texts />
      {/* Ad etiketleri tutamaçlarla aynı katmanda: her şeyin üstünde okunmalı. */}
      <AreaObjectNameLabels />
      <PointSymbolNameLabels />
      {/* Ölçüler tutamaçların ALTINDA (RENDER_ORDER.measurement < handle): sayı
          köşe tutamacını örterse köşe tutulamaz hâle gelirdi. */}
      <WallDimensionLabels />
      {/* Ölçüm en üstte: kullanıcının o an aldığı okuma hiçbir şeyin altında kalmasın. */}
      <Measurement />
      <MirrorAxis />
      <CornerAngleLabels />
      <BeamHandles />
      {/* Serbest çizim EN ÜSTTE (K163): elle alınmış bir not, altında kalırsa
          notluğunu yitirir. Aracın hook'u da burada koşuyor. */}
      <SketchStrokes />
      <SelectionMarquee />
    </group>
  )
}
