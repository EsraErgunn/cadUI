import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { ArchitectureTarget } from '../core/architectureHover'
import type { AreaObjectShape } from '../core/areaObject'
import type { AreaObjectHandleKind } from '../core/areaObjectHandles'
import type { BeamEndKey } from '../core/beam'
import type { PlanPoint } from '../core/coords'
import type { Id, OpeningType } from '../core/model'
import { DEFAULT_OPENING_WIDTH_CM } from '../core/opening'
import {
  getSoleSelectedId,
  toggleSelectionItem,
  type PlanRect,
  type Selection,
  type SelectionItem,
} from '../core/selection'

/**
 * Sürüklenen köşenin GEÇİCİ konumu. cadStore'a her karede yazılmaz: movePoint
 * sığmayan açıklıkları siliyor (K16) ve sürükleme sırasında duvar bir an kısalınca
 * açıklık geri gelmemek üzere düşerdi. Yazma yalnız bırakma anında olur.
 */
type PointDrag = {
  pointId: Id
  position: PlanPoint
}

/**
 * Taşınan duvarLARIN geçici ötelemesi. Duvar kendi koordinatını taşımadığı için
 * konum değil ÖTELEME tutulur; çizim tarafı bunu her duvarın iki köşesine uygular.
 * draggingPoint ile aynı gerekçeyle store'a bırakma anında yazılır: komşu duvar
 * kısaldıkça sığmayan açıklık her karede silinir ve geri gelmezdi (K16).
 *
 * Dizi çünkü çoklu seçim tek jestle taşınıyor (KK-11); tek duvar bunun bir
 * elemanlı hâli, ayrı bir yol değil.
 */
type WallDrag = {
  wallIds: Id[]
  dxCm: number
  dyCm: number
}

/**
 * Taşınan sembollerin GEÇİCİ ötelemesi. draggingWall ile aynı gerekçe: sürükleme
 * boyunca cadStore'a yazılmaz, tek yazım bırakma anında olur (tek Ctrl+Z).
 */
type SymbolDrag = {
  symbolIds: Id[]
  dxCm: number
  dyCm: number
}

/**
 * Taşınan alan nesnelerinin GEÇİCİ ötelemesi. draggingSymbols ile aynı gerekçe:
 * sürükleme boyunca cadStore'a yazılmaz, tek yazım bırakma anında olur.
 */
type AreaObjectDrag = {
  areaObjectIds: Id[]
  dxCm: number
  dyCm: number
}

/**
 * İki noktalı ölçüm. `end === null` iken ikinci nokta imleçte, lastik bant
 * çizilir; kondu mu ölçü donar ve Esc'e ya da araç değişimine kadar durur.
 */
type Measurement = {
  start: PlanPoint
  end: PlanPoint | null
}

/** Taşınan metinlerin GEÇİCİ ötelemesi. AreaObjectDrag ile aynı gerekçe. */
type TextDrag = {
  textIds: Id[]
  dxCm: number
  dyCm: number
}

/**
 * Tutamaçla boyutlandırma/döndürme sırasında ÖNİZLENEN şekil (K44). Öteleme
 * değil ŞEKLİN tamamı tutuluyor: resize hem merkezi hem boyutu, rotate açıyı
 * değiştiriyor — "dx/dy" gibi tek bir fark bunu ifade edemezdi.
 *
 * draggingAreaObjects ile aynı gerekçe: sürükleme boyunca cadStore'a yazılmaz,
 * tek yazım bırakma anında olur (tek markDirty, tek Ctrl+Z).
 */
type AreaObjectHandleDrag = {
  areaObjectId: Id
  kind: AreaObjectHandleKind
  shape: AreaObjectShape
}

/**
 * Taşınan kirişlerin GEÇİCİ ötelemesi — draggingAreaObjects ile aynı gerekçe.
 */
type BeamDrag = {
  beamIds: Id[]
  dxCm: number
  dyCm: number
}

/**
 * Uçtan uzatma sırasında ÖNİZLENEN uç konumu. Öteleme değil KONUM tutuluyor:
 * uzatmada yalnız bir uç oynuyor, diğeri çakılı — "dx/dy" ikisini de taşırdı.
 */
type BeamHandleDrag = {
  beamId: Id
  end: BeamEndKey
  position: PlanPoint
}

/**
 * Sürüklenen ad etiketinin CANLI kayması. draggingAreaObjects ile aynı gerekçe:
 * sürükleme boyunca cadStore'a yazılmaz, tek yazım bırakma anında olur.
 */
type AreaObjectLabelDrag = {
  areaObjectId: Id
  offsetCm: PlanPoint
}

/** Cihaz ad etiketinin canlı kayması; AreaObjectLabelDrag ile aynı gerekçe. */
type PointSymbolLabelDrag = {
  symbolId: Id
  offsetCm: PlanPoint
}

type ArchitectureUiState = {
  /**
   * Seçili nesneler (KK-10). Duvar ve açıklık için AYRI iki alan yerine tek
   * liste: iki alan varken "ikisi aynı anda dolu olmasın" el sıkışması her yeni
   * seçilebilir nesnede tekrar kuruluyordu (bkz. knowledge/gesture-bus-precedence.md,
   * eski TODO(fay-B2)).
   */
  selection: Selection
  /** Sürüklenen çerçevenin anlık dikdörtgeni; yalnız çizim için, seçim bırakışta yazılır. */
  marquee: PlanRect | null
  /**
   * Ekrandaki ölçüm; null = ölçüm yok (K80). Çizimin PARÇASI DEĞİL: cadStore'a
   * yazılmaz, `markDirty` çağırmaz, kaydedilen JSON'a girmez — geçici bir okuma.
   * Tesisat tarafındaki `plumbingUiStore.measurement` ile aynı sözleşme.
   * Tek temizleme kapısı `clearMeasurement`.
   */
  measurement: Measurement | null
  /**
   * Düzenleme kutusu açık olan metin (K81). Oda adındaki `editingRoom` ile aynı
   * gerekçe: taslak yazı kutunun kendi state'inde, store'a yalnız kapanışta
   * yazılır — her tuş ayrı bir Ctrl+Z adımı olmasın.
   */
  editingTextId: Id | null
  /** Taşınan metinlerin GEÇİCİ ötelemesi; draggingAreaObjects ile aynı sözleşme. */
  draggingTexts: TextDrag | null
  draggingPoint: PointDrag | null
  draggingWall: WallDrag | null
  draggingSymbols: SymbolDrag | null
  draggingAreaObjects: AreaObjectDrag | null
  draggingAreaObjectLabel: AreaObjectLabelDrag | null
  /**
   * Çizilmekte olan aynalama ekseninin İLK ucu; null = eksen henüz
   * başlamadı. Eksen çizimin parçası DEĞİL (ölçüm gibi geçici), bu yüzden
   * cadStore'da değil burada duruyor.
   */
  mirrorAxisStart: PlanPoint | null
  draggingPointSymbolLabel: PointSymbolLabelDrag | null
  draggingBeams: BeamDrag | null
  beamHandleDrag: BeamHandleDrag | null
  /** İmleç kirişin bir ucunun üstünde mi? Tutamacın vurgusu bunu okur. */
  isBeamHandleHovered: boolean
  areaObjectHandleDrag: AreaObjectHandleDrag | null
  /**
   * İmlecin altındaki tutamaç. Overlay `pointer-events: none` olduğu için
   * hover'ı kendisi ANLAYAMAZ — tuval tarafındaki hook yayınlar (K45).
   */
  areaObjectHandleHover: AreaObjectHandleKind | null
  /** İmlecin altındaki nesne. Yalnız vurgu için; hiçbir şeyi seçmez. */
  hover: ArchitectureTarget | null
  /**
   * Bir SONRAKİ yerleştirmenin genişliği, tip başına ayrı tutulur: kapıyı 100'e
   * çeken kullanıcı pencereye geçince 120'yi geri bulur.
   * Record ama yasak olan tür değil — anahtar string-literal union, kaydedilmiyor.
   */
  openingWidthCm: Record<OpeningType, number>
  /**
   * "Mahalleri Tanımla" kipi: gezilecek mahallerin id'leri, kip kapalıyken null.
   *
   * Kuyruk BAŞLARKEN dondurulur, her karede yeniden türetilmez: tip seçilen
   * mahal kuyruktan düşseydi kalan sayısı ve "3 / 7" göstergesi kullanıcının
   * gözü önünde değişir, geri gitmek de imkânsız olurdu. Geometri yine de
   * canlı okunuyor — burada yalnız KİMLİK duruyor.
   */
  roomDefinitionQueue: Id[] | null
  /** Kuyrukta kaçıncı duraktayız. Kip kapalıyken anlamsız. */
  roomDefinitionIndex: number
  /** Seçimi tümüyle değiştirir (tek tıklama, çerçeve sonucu). */
  setSelection: (selection: Selection) => void
  /** Seçiliyse çıkarır, değilse ekler — Shift+tıklama (KK-10). */
  toggleSelected: (item: SelectionItem) => void
  clearSelection: () => void
  setMarquee: (marquee: PlanRect | null) => void
  setDraggingPointSymbolLabel: (drag: PointSymbolLabelDrag | null) => void
  startMeasurement: (start: PlanPoint) => void
  finishMeasurement: (end: PlanPoint) => void
  clearMeasurement: () => void
  setOpeningWidthCm: (type: OpeningType, widthCm: number) => void
  setDraggingPoint: (drag: PointDrag | null) => void
  setDraggingWall: (drag: WallDrag | null) => void
  setDraggingSymbols: (drag: SymbolDrag | null) => void
  setDraggingAreaObjects: (drag: AreaObjectDrag | null) => void
  setDraggingAreaObjectLabel: (drag: AreaObjectLabelDrag | null) => void
  setMirrorAxisStart: (point: PlanPoint | null) => void
  setDraggingBeams: (drag: BeamDrag | null) => void
  setBeamHandleDrag: (drag: BeamHandleDrag | null) => void
  setBeamHandleHover: (isHovered: boolean) => void
  setAreaObjectHandleDrag: (drag: AreaObjectHandleDrag | null) => void
  setAreaObjectHandleHover: (kind: AreaObjectHandleKind | null) => void
  setHover: (hover: ArchitectureTarget | null) => void
  setEditingText: (textId: Id | null) => void
  setDraggingTexts: (drag: TextDrag | null) => void
  /** Kipi başlatır. Boş kuyrukla çağrılırsa kip AÇILMAZ. */
  startRoomDefinition: (roomIds: readonly Id[]) => void
  stopRoomDefinition: () => void
  /** Kuyruk sınırlarının dışına taşmaz; son duraktan ileri gidilmez. */
  goToRoomDefinitionIndex: (index: number) => void
}

/**
 * cadStore DIŞI geçici mimari UI durumu: kaydedilmez, zundo geçmişine girmez,
 * markDirty çağırmaz (uiStore/plumbingUiStore ile aynı gerekçe — K3/K6).
 * Seçim burada duruyor çünkü cadStore'da olsaydı projeyi kirletir ve Ctrl+Z ile
 * geri alınırdı; uiStore ise D'nin dosyası ve araç/görünüm işi.
 *
 * Bu store aynı zamanda scene/ ile ui/ arasındaki köprü: eslint ikisinin
 * birbirini import etmesini yasaklıyor, ortak nokta store + core.
 */
export const useArchitectureUiStore = create<ArchitectureUiState>()(
  immer((set) => ({
    selection: [],
    marquee: null,
    measurement: null,
    draggingPoint: null,
    draggingWall: null,
    draggingSymbols: null,
    draggingAreaObjects: null,
    draggingAreaObjectLabel: null,
    mirrorAxisStart: null,
    draggingPointSymbolLabel: null,
    draggingBeams: null,
    beamHandleDrag: null,
    isBeamHandleHovered: false,
    areaObjectHandleDrag: null,
    areaObjectHandleHover: null,
    hover: null,
    openingWidthCm: { ...DEFAULT_OPENING_WIDTH_CM },
    editingTextId: null,
    draggingTexts: null,
    roomDefinitionQueue: null,
    roomDefinitionIndex: 0,

    setSelection: (selection) =>
      set((draft) => {
        draft.selection = selection
      }),

    toggleSelected: (item) =>
      set((draft) => {
        draft.selection = toggleSelectionItem(draft.selection, item)
      }),

    clearSelection: () =>
      set((draft) => {
        // Zaten boşken yeni dizi yazılmaz: abone bileşenler boşuna render olmasın.
        if (draft.selection.length === 0) return
        draft.selection = []
      }),

    setMarquee: (marquee) =>
      set((draft) => {
        draft.marquee = marquee
      }),

    startMeasurement: (start) =>
      set((draft) => {
        draft.measurement = { start, end: null }
      }),

    finishMeasurement: (end) =>
      set((draft) => {
        if (draft.measurement) draft.measurement.end = end
      }),

    clearMeasurement: () =>
      set((draft) => {
        draft.measurement = null
      }),

    setOpeningWidthCm: (type, widthCm) =>
      set((draft) => {
        draft.openingWidthCm[type] = widthCm
      }),

    setDraggingPoint: (drag) =>
      set((draft) => {
        draft.draggingPoint = drag
      }),

    setDraggingWall: (drag) =>
      set((draft) => {
        draft.draggingWall = drag
      }),

    setDraggingSymbols: (drag) =>
      set((draft) => {
        draft.draggingSymbols = drag
      }),

    setDraggingAreaObjects: (drag) =>
      set((draft) => {
        draft.draggingAreaObjects = drag
      }),

    setDraggingAreaObjectLabel: (drag) =>
      set((draft) => {
        draft.draggingAreaObjectLabel = drag
      }),

    setMirrorAxisStart: (point) =>
      set((draft) => {
        draft.mirrorAxisStart = point
      }),

    setDraggingPointSymbolLabel: (drag) =>
      set((draft) => {
        draft.draggingPointSymbolLabel = drag
      }),

    setDraggingBeams: (drag) =>
      set((draft) => {
        draft.draggingBeams = drag
      }),

    setBeamHandleDrag: (drag) =>
      set((draft) => {
        draft.beamHandleDrag = drag
      }),

    setBeamHandleHover: (isHovered) =>
      set((draft) => {
        // Aynı değerde yazma: pointermove her karede geliyor (setHover ile aynı gerekçe).
        if (draft.isBeamHandleHovered === isHovered) return
        draft.isBeamHandleHovered = isHovered
      }),

    setAreaObjectHandleDrag: (drag) =>
      set((draft) => {
        draft.areaObjectHandleDrag = drag
      }),

    setAreaObjectHandleHover: (kind) =>
      set((draft) => {
        // Aynı değerde yazma: pointermove her karede geliyor, overlay boşuna
        // render olmasın (setHover ile aynı gerekçe).
        if (draft.areaObjectHandleHover === kind) return
        draft.areaObjectHandleHover = kind
      }),

    setHover: (hover) =>
      set((draft) => {
        draft.hover = hover
      }),

    setEditingText: (textId) =>
      set((draft) => {
        draft.editingTextId = textId
      }),

    setDraggingTexts: (drag) =>
      set((draft) => {
        draft.draggingTexts = drag
      }),

    startRoomDefinition: (roomIds) =>
      set((draft) => {
        // Tanımsız mahal yoksa kip açılmaz: boş bir kart göstermek, kullanıcıya
        // yapacak iş varmış gibi görünüp hiçbir şey sunmamaktır.
        if (roomIds.length === 0) return
        draft.roomDefinitionQueue = [...roomIds]
        draft.roomDefinitionIndex = 0
        // Kip kendi vurgusunu çiziyor; açık seçim ikinci bir vurgu ve sağda
        // ikinci bir tanımlama arayüzü (özellik paneli) demekti.
        draft.selection = []
      }),

    stopRoomDefinition: () =>
      set((draft) => {
        draft.roomDefinitionQueue = null
        draft.roomDefinitionIndex = 0
      }),

    goToRoomDefinitionIndex: (index) =>
      set((draft) => {
        if (!draft.roomDefinitionQueue) return
        draft.roomDefinitionIndex = Math.max(
          0,
          Math.min(draft.roomDefinitionQueue.length - 1, index),
        )
      }),
  })),
)

/**
 * Kipin o an durduğu mahal — yoksa undefined. Kararlı değer (id ya da
 * undefined) döndürür, yeni nesne değil: doğrudan abone olunabilir.
 */
export function selectRoomDefinitionRoomId(state: ArchitectureUiState): Id | undefined {
  return state.roomDefinitionQueue?.[state.roomDefinitionIndex]
}

/**
 * Tek açıklık seçiliyken o açıklığın id'si. Açıklığa özel arayüzler (genişlik
 * şeridi, Delete) bunu okur — çoklu seçimde hangi açıklık olduğu belirsiz
 * olduğu için undefined döner.
 *
 * Selector KARARLI değer döndürür (id ya da undefined), yeni dizi/nesne değil:
 * `useArchitectureUiStore(selectSoleSelectedOpeningId)` biçiminde doğrudan abone
 * olunabilir — bkz. knowledge/snap-contract.md abonelik tuzağı.
 */
export function selectSoleSelectedOpeningId(state: ArchitectureUiState): Id | undefined {
  return getSoleSelectedId(state.selection, 'opening')
}

export function selectSoleSelectedWallId(state: ArchitectureUiState): Id | undefined {
  return getSoleSelectedId(state.selection, 'wall')
}
