import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { ArchitectureTarget } from '../core/architectureHover'
import type { PlanPoint } from '../core/coords'
import type { Id, OpeningType } from '../core/model'
import { DEFAULT_OPENING_WIDTH_CM } from '../core/opening'

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
 * Taşınan duvarın GEÇİCİ ötelemesi. Duvar kendi koordinatını taşımadığı için
 * konum değil ÖTELEME tutulur; çizim tarafı bunu duvarın iki köşesine uygular.
 * draggingPoint ile aynı gerekçeyle store'a bırakma anında yazılır: komşu duvar
 * kısaldıkça sığmayan açıklık her karede silinir ve geri gelmezdi (K16).
 */
type WallDrag = {
  wallId: Id
  dxCm: number
  dyCm: number
}

type ArchitectureUiState = {
  selectedOpeningId: Id | null
  /** Seçili duvar. Açıklık seçimiyle karşılıklı dışlamalı — ikisi aynı jestte temizlenir. */
  selectedWallId: Id | null
  draggingPoint: PointDrag | null
  draggingWall: WallDrag | null
  /** İmlecin altındaki nesne. Yalnız vurgu için; hiçbir şeyi seçmez. */
  hover: ArchitectureTarget | null
  /**
   * Bir SONRAKİ yerleştirmenin genişliği, tip başına ayrı tutulur: kapıyı 100'e
   * çeken kullanıcı pencereye geçince 120'yi geri bulur.
   * Record ama yasak olan tür değil — anahtar string-literal union, kaydedilmiyor.
   */
  openingWidthCm: Record<OpeningType, number>
  setSelectedOpening: (openingId: Id | null) => void
  setSelectedWall: (wallId: Id | null) => void
  setOpeningWidthCm: (type: OpeningType, widthCm: number) => void
  setDraggingPoint: (drag: PointDrag | null) => void
  setDraggingWall: (drag: WallDrag | null) => void
  setHover: (hover: ArchitectureTarget | null) => void
}

/**
 * cadStore DIŞI geçici mimari UI durumu: kaydedilmez, zundo geçmişine girmez,
 * markDirty çağırmaz (uiStore/plumbingUiStore ile aynı gerekçe — K3/K6).
 * Seçim burada duruyor çünkü cadStore'da olsaydı projeyi kirletir ve Ctrl+Z ile
 * geri alınırdı; uiStore ise D'nin dosyası ve araç/görünüm işi.
 *
 * Bu store aynı zamanda scene/ ile ui/ arasındaki köprü: eslint ikisinin
 * birbirini import etmesini yasaklıyor, ortak nokta store + core.
 *
 * TODO(fay-B2): genel nesne seçimi gelince selectedOpeningId ayrı bir doğruluk
 * kaynağı olmaktan çıkıp o seçimden türetilmeli.
 */
export const useArchitectureUiStore = create<ArchitectureUiState>()(
  immer((set) => ({
    selectedOpeningId: null,
    selectedWallId: null,
    draggingPoint: null,
    draggingWall: null,
    hover: null,
    openingWidthCm: { ...DEFAULT_OPENING_WIDTH_CM },

    setSelectedOpening: (openingId) =>
      set((draft) => {
        draft.selectedOpeningId = openingId
      }),

    setSelectedWall: (wallId) =>
      set((draft) => {
        draft.selectedWallId = wallId
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

    setHover: (hover) =>
      set((draft) => {
        draft.hover = hover
      }),
  })),
)
