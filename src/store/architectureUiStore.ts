import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { ArchitectureTarget } from '../core/architectureHover'
import type { AreaObjectShape } from '../core/areaObject'
import type { AreaObjectHandleKind } from '../core/areaObjectHandles'
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
  draggingPoint: PointDrag | null
  draggingWall: WallDrag | null
  draggingSymbols: SymbolDrag | null
  draggingAreaObjects: AreaObjectDrag | null
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
   * Adı düzenlenen oda. Seçim DEĞİL: oda `Selection` modelinde yer almıyor
   * (seçilebilir nesne değil), çift tık doğrudan düzenlemeyi açar.
   */
  editingRoomId: Id | null
  /** Seçimi tümüyle değiştirir (tek tıklama, çerçeve sonucu). */
  setSelection: (selection: Selection) => void
  /** Seçiliyse çıkarır, değilse ekler — Shift+tıklama (KK-10). */
  toggleSelected: (item: SelectionItem) => void
  clearSelection: () => void
  setMarquee: (marquee: PlanRect | null) => void
  setOpeningWidthCm: (type: OpeningType, widthCm: number) => void
  setDraggingPoint: (drag: PointDrag | null) => void
  setDraggingWall: (drag: WallDrag | null) => void
  setDraggingSymbols: (drag: SymbolDrag | null) => void
  setDraggingAreaObjects: (drag: AreaObjectDrag | null) => void
  setAreaObjectHandleDrag: (drag: AreaObjectHandleDrag | null) => void
  setAreaObjectHandleHover: (kind: AreaObjectHandleKind | null) => void
  setHover: (hover: ArchitectureTarget | null) => void
  setEditingRoom: (roomId: Id | null) => void
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
    draggingPoint: null,
    draggingWall: null,
    draggingSymbols: null,
    draggingAreaObjects: null,
    areaObjectHandleDrag: null,
    areaObjectHandleHover: null,
    hover: null,
    openingWidthCm: { ...DEFAULT_OPENING_WIDTH_CM },
    editingRoomId: null,

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

    setEditingRoom: (roomId) =>
      set((draft) => {
        draft.editingRoomId = roomId
      }),
  })),
)

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
