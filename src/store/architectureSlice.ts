import type { StateCreator } from 'zustand'

import { INITIAL_ARCHITECTURE_DATA, type ArchitectureData } from './architectureData'
import { isPlacementValidInState, pruneOpeningsInDraft } from './architectureOpeningOps'
import type { AddOpeningInput, OpeningTarget } from './architectureOpeningOps'
import { createPropertyActions } from './architecturePropertyOps'
import { recomputeRoomsInDraft, renameRoomInDraft } from './architectureRooms'
import { splitWallsAtIntersections } from './architectureSplit'
import {
  mergeCoincidentPointsInDraft,
  mergeCollinearWallsInDraft,
} from './architectureWallMerge'
import { applyWallOffsetInDraft } from './architectureWallOffset'
import {
  appendWall,
  appendWallChain,
  mergePointInto,
  type AddedWall,
  type AddWallChainInput,
  type AddWallInput,
} from './architectureWallOps'
import { createAreaObjectActions, type AreaObjectActions } from './areaObjectOps'
import { createBeamActions, type BeamActions } from './beamOps'
// cadStore ↔ architectureSlice karşılıklı import eder; bu taraf tip-only olduğu
// için derlemede silinir ve çalışma zamanında döngü oluşmaz (floorSlice ile aynı).
import type { CadState } from './cadStore'
import { createPointSymbolActions, pruneSymbolsInDraft } from './pointSymbolOps'
import type { PointSymbolActions } from './pointSymbolOps'
import { markDirty, takeNextId } from './projectMeta'
import { createSelectionActions } from './selectionOps'
import { createTextLabelActions, type TextLabelActions } from './textLabelOps'
import { createTransformActions } from './transformOps'
import type { PlanPoint } from '../core/coords'
import { type Id } from '../core/model'
import { MIN_OPENING_WIDTH_CM } from '../core/opening'
import type { Selection } from '../core/selection'
import type { PlanTransform } from '../core/transform'
import { getOrphanPointIds } from '../core/wall'

// Selector'lar ve duvar yazma iç fonksiyonları ayrı dosyalarda (max-lines);
// sözleşme yüzeyi tek yerden okunsun diye buradan yeniden dışa aktarılıyor.
export * from './architectureSelectors'
// Veri şekli + sayaç türetimi ayrı dosyada (max-lines); sözleşme yüzeyi tek yerden okunsun.
export { deriveNextUniqueId, INITIAL_ARCHITECTURE_DATA } from './architectureData'
export type { ArchitectureData } from './architectureData'
export type { AddOpeningInput, OpeningTarget } from './architectureOpeningOps'
export type { AddedWall, AddWallChainInput, AddWallInput, WallEnd } from './architectureWallOps'

export type ArchitectureSlice = ArchitectureData &
  PointSymbolActions &
  AreaObjectActions &
  BeamActions &
  TextLabelActions & {
  addWall: (input: AddWallInput) => AddedWall | undefined
  addWallChain: (input: AddWallChainInput) => void
  movePoint: (pointId: Id, position: PlanPoint) => void
  /**
   * Duvarı KATI olarak öteler: iki köşesi birlikte kayar, boyu ve açısı korunur.
   * O köşeleri paylaşan komşu duvarlar esneyerek bağlı kalır — duvar kendi
   * koordinatını taşımadığı için bu modelin doğrudan sonucu, kopma olmaz.
   * Açıklıklar duvara offset'le bağlı olduğundan kendiliğinden gelir (K9).
   */
  moveWall: (wallId: Id, dxCm: number, dyCm: number) => void
  /**
   * Duvarı kendine PARALEL kaydırır; uçları komşularının doğrusuna oturur (K103).
   * `moveWall`ın aksine duvarın BOYU değişebilir — eğik komşular arasında
   * kalan duvar uzar ya da kısalır, komşuların açısı korunur.
   */
  offsetWall: (wallId: Id, dxCm: number, dyCm: number) => boolean
  /** Köşeyi başka bir köşeye kaynatır (sürüklerken üstüne bırakma). */
  mergePoint: (sourceId: Id, targetId: Id) => void
  deleteWall: (wallId: Id) => void
  /** Reddedilirse undefined döner ve HİÇBİR ŞEY değişmez — id bile harcanmaz. */
  addOpening: (input: AddOpeningInput) => Id | undefined
  /**
   * Açıklığı hedef duvar + offset'e taşır. Duvar bölünmez, Point/Wall
   * üretilmez (K9) — açıklık başka duvara geçse bile tek kaydın iki alanı
   * güncellenir. Hedef duvar zorunlu: yalnız offset alan bir imza, başka duvara
   * bırakılan açıklığın offset'ini sessizce ESKİ duvara yazıyordu.
   */
  moveOpening: (openingId: Id, target: OpeningTarget) => boolean
  setOpeningWidth: (openingId: Id, widthCm: number) => boolean
  removeOpening: (openingId: Id) => void
  /** Duvar silme/kısaltma sonrası temizlik (K16). */
  pruneOpeningsOnWalls: () => void
  /** Seçili nesnelerin tamamını TEK geri alma adımında siler (KK-10). */
  deleteSelection: (selection: Selection) => boolean
  /**
   * Özellik panelinin toplu yazımları (KK-12). Birden çok duvar TEK adımda
   * güncellenir: tek tek yazılsaydı üç duvar seçen kullanıcı üç Ctrl+Z'ye basardı.
   */
  setWallsThickness: (wallIds: readonly Id[], thicknessCm: number) => boolean
  setWallsHeight: (wallIds: readonly Id[], heightCm: number) => boolean
  /** Seçimi taşır/döndürür/aynalar; hepsi TEK geri alma adımı (KK-11). */
  transformSelection: (selection: Selection, transform: PlanTransform) => boolean
  /** Seçimi çoğaltır ve KOPYALARIN seçimini döndürür (KK-11). */
  duplicateSelection: (selection: Selection, offset: { dxCm: number; dyCm: number }) => Selection
  /** Boş ad reddedilir, aynı ad yazılmaz; gerekçe renameRoomInDraft'ta. */
  setRoomName: (roomId: Id, name: string) => void
}
export const createArchitectureSlice: StateCreator<
  CadState,
  [['zustand/immer', never]],
  [],
  ArchitectureSlice
> = (set) => ({
  ...INITIAL_ARCHITECTURE_DATA,

  // Üretilen id'ler dönüyor: duvar çizim aracı zinciri bu p2Id'den sürdürüyor.
  addWall: (input) => {
    let added: AddedWall | undefined
    set((draft) => {
      added = appendWall(draft, input.start, input.end, input)
      if (!added) return

      // Yeni duvar bir başkasını kesiyor olabilir: düğüm aynı adımda açılır (K24).
      splitWallsAtIntersections(draft)
      // Bölmeden SONRA: oda çevrimi bölünmüş duvarları görmeli (K31).
      recomputeRoomsInDraft(draft)
      markDirty(draft)
    })
    return added
  },

  // Zincirin tamamı tek set() içinde: geri alma tek adımda tüm zinciri kaldırır.
  addWallChain: (input) =>
    set((draft) => {
      if (!appendWallChain(draft, input)) return

      splitWallsAtIntersections(draft)
      // Bölmeden SONRA: oda çevrimi bölünmüş duvarları görmeli (K31).
      recomputeRoomsInDraft(draft)
      markDirty(draft)
    }),

  movePoint: (pointId, position) =>
    set((draft) => {
      const point = draft.points.find((candidate) => candidate.id === pointId)
      if (!point) return

      // Tek Point güncellenir; ona bağlı tüm duvarlar referans üzerinden gelir.
      point.x = position.x
      point.y = position.y
      // Köşeyi çekmek duvarı kısaltabilir; sığmayan açıklık aynı adımda düşer (K16).
      pruneOpeningsInDraft(draft)
      // Köşe başka bir duvarın gövdesine bırakılmış olabilir → T birleşimi (K24).
      splitWallsAtIntersections(draft)
      // Bölmeden SONRA: oda çevrimi bölünmüş duvarları görmeli (K31).
      recomputeRoomsInDraft(draft)
      markDirty(draft)
    }),

  offsetWall: (wallId, dxCm, dyCm) => {
    let isApplied = false
    set((draft) => {
      isApplied = applyWallOffsetInDraft(draft, wallId, dxCm, dyCm)
      if (!isApplied) return

      // Kopan köşe eski yerine döndüyse klonunun üstüne gelmiştir: aynı yerdeki
      // iki nokta grafı kopuk bırakır (K24 ilkesi), önce kaynatılır.
      mergeCoincidentPointsInDraft(draft)
      // Komşu duvarlar kısalmış olabilir; sığmayan açıklık aynı adımda düşer (K16).
      pruneOpeningsInDraft(draft)
      // Taşınan duvar başkalarının üstünden geçmiş olabilir (K24).
      splitWallsAtIntersections(draft)
      // Bölmeden SONRA: önceki taşımaların bıraktığı gereksiz ara düğümler
      // temizlenir, yoksa komşu kenar her harekette bir parça daha artardı.
      mergeCollinearWallsInDraft(draft)
      // Oda çevrimi bölünmüş VE birleştirilmiş duvarları görmeli (K31).
      recomputeRoomsInDraft(draft)
      markDirty(draft)
    })
    return isApplied
  },

  moveWall: (wallId, dxCm, dyCm) =>
    set((draft) => {
      const wall = draft.walls.find((candidate) => candidate.id === wallId)
      if (!wall) return
      if (dxCm === 0 && dyCm === 0) return

      // Set: sıfır boylu duvarda p1Id === p2Id olabilir, öteleme iki kez uygulanmasın.
      const movingIds = new Set([wall.p1Id, wall.p2Id])
      for (const point of draft.points) {
        if (!movingIds.has(point.id)) continue
        point.x += dxCm
        point.y += dyCm
      }

      // Ötelenen duvarın boyu sabit, açıklıkları güvende. Ama köşeleri paylaşan
      // KOMŞU duvarlar kısalabilir; oradaki sığmayan açıklık aynı adımda düşer (K16).
      pruneOpeningsInDraft(draft)
      // Taşınan duvar başkalarının üstünden geçmiş olabilir (K24).
      splitWallsAtIntersections(draft)
      // Bölmeden SONRA: oda çevrimi bölünmüş duvarları görmeli (K31).
      recomputeRoomsInDraft(draft)
      markDirty(draft)
    }),

  mergePoint: (sourceId, targetId) =>
    set((draft) => {
      if (!mergePointInto(draft, sourceId, targetId)) return

      // Kaynatma duvar düşürebilir; sahipsiz kalan köşe ve açıklık aynı adımda
      // temizlenir — tek geri alma adımı.
      const orphanIds = new Set(getOrphanPointIds(draft.points, draft.walls))
      draft.points = draft.points.filter((point) => !orphanIds.has(point.id))
      pruneOpeningsInDraft(draft)
      // Duvar düşünce çevrim kopar: kapanmayan oda aynı adımda silinir (K31).
      recomputeRoomsInDraft(draft)
      markDirty(draft)
    }),

  ...createPropertyActions(set),
  ...createSelectionActions(set),
  ...createTransformActions(set),
  ...createPointSymbolActions(set),
  ...createAreaObjectActions(set),
  ...createBeamActions(set),
  ...createTextLabelActions(set),

  deleteWall: (wallId) =>
    set((draft) => {
      const index = draft.walls.findIndex((wall) => wall.id === wallId)
      if (index === -1) return

      draft.walls.splice(index, 1)

      // Temizlik aynı set() içinde: silme + temizlik tek geri alma adımı olsun.
      const orphanIds = new Set(getOrphanPointIds(draft.points, draft.walls))
      draft.points = draft.points.filter((point) => !orphanIds.has(point.id))
      // Duvarsız açıklık temsil edilemez; sahipsiz wallId bırakılmaz (K16).
      pruneOpeningsInDraft(draft)
      // Duvara bağlı sembolün konumu duvarından türüyor; duvarsız kalamaz.
      pruneSymbolsInDraft(draft)
      // Duvar düşünce çevrim kopar: kapanmayan oda aynı adımda silinir (K31).
      recomputeRoomsInDraft(draft)
      markDirty(draft)
    }),

  addOpening: (input) => {
    let createdId: Id | undefined

    set((draft) => {
      // Doğrulama id üretiminden ÖNCE: reddedilen yerleştirme nextUniqueId'yi
      // harcasa kaydedilecek JSON değişir ve proje boşuna kirlenirdi.
      if (!isPlacementValidInState(draft, input)) return

      createdId = takeNextId(draft)
      draft.openings.push({ id: createdId, ...input })
      markDirty(draft)
    })

    // immer producer'ı hem draft'ı değiştirip hem değer döndüremez; id dışarıda yakalanır.
    return createdId
  },

  moveOpening: (openingId, target) => {
    let isMoved = false

    set((draft) => {
      const opening = draft.openings.find((candidate) => candidate.id === openingId)
      if (!opening) return

      // Doğrulama HEDEF duvara göre: köşe payı, uzunluk ve çakışma komşuları
      // orada aranır. Kaynak duvardaki durumun taşımaya etkisi yok.
      const isValid = isPlacementValidInState(draft, {
        wallId: target.wallId,
        offsetCm: target.offsetCm,
        widthCm: opening.widthCm,
        ignoreOpeningId: openingId,
      })
      // Geçersiz taşıma REDDEDİLİR, en yakın geçerli yere kaydırılmaz (K13).
      if (!isValid) return

      opening.wallId = target.wallId
      opening.offsetCm = target.offsetCm
      markDirty(draft)
      isMoved = true
    })

    return isMoved
  },

  setOpeningWidth: (openingId, widthCm) => {
    let isResized = false

    set((draft) => {
      const opening = draft.openings.find((candidate) => candidate.id === openingId)
      if (!opening) return
      if (widthCm < MIN_OPENING_WIDTH_CM) return

      // Genişleme hem aralığı taşırabilir hem komşuya binebilir: tam kontrol şart.
      const isValid = isPlacementValidInState(draft, {
        wallId: opening.wallId,
        offsetCm: opening.offsetCm,
        widthCm,
        ignoreOpeningId: openingId,
      })
      if (!isValid) return

      opening.widthCm = widthCm
      markDirty(draft)
      isResized = true
    })

    return isResized
  },

  removeOpening: (openingId) =>
    set((draft) => {
      const index = draft.openings.findIndex((candidate) => candidate.id === openingId)
      if (index === -1) return

      // Duvar bölünmediği için silme sonrası birleştirme/temizlik yok (K9).
      draft.openings.splice(index, 1)
      // nextUniqueId geri alınmaz: id bir kez üretilir, asla yeniden kullanılmaz.
      markDirty(draft)
    }),

  pruneOpeningsOnWalls: () =>
    set((draft) => {
      if (pruneOpeningsInDraft(draft)) markDirty(draft)
    }),

  setRoomName: (roomId, name) =>
    set((draft) => {
      if (renameRoomInDraft(draft, roomId, name)) markDirty(draft)
    }),
})
