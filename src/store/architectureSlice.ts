import type { StateCreator } from 'zustand'

import { isPlacementValidInState, pruneOpeningsInDraft } from './architectureOpeningOps'
import { splitWallsAtIntersections } from './architectureSplit'
import {
  appendWall,
  appendWallChain,
  mergePointInto,
  type AddedWall,
  type AddWallChainInput,
  type AddWallInput,
} from './architectureWallOps'
// cadStore ↔ architectureSlice karşılıklı import eder; bu taraf tip-only olduğu
// için derlemede silinir ve çalışma zamanında döngü oluşmaz (floorSlice ile aynı).
import type { CadState } from './cadStore'
import { markDirty, takeNextId } from './projectMeta'
import { deleteSelectionFromDraft } from './selectionOps'
import type { PlanPoint } from '../core/coords'
import { FIRST_FREE_ID, type Id, type OpeningType, type ProjectData } from '../core/model'
import { MIN_OPENING_WIDTH_CM } from '../core/opening'
import type { Selection } from '../core/selection'
import { getOrphanPointIds } from '../core/wall'

// Selector'lar ve duvar yazma iç fonksiyonları ayrı dosyalarda (max-lines);
// sözleşme yüzeyi tek yerden okunsun diye buradan yeniden dışa aktarılıyor.
export * from './architectureSelectors'
export type { AddedWall, AddWallChainInput, AddWallInput, WallEnd } from './architectureWallOps'

/**
 * Store'un şekli = kaydedilecek JSON'un şekli (CLAUDE.md kural 4). Pick ile
 * bağlandı: ProjectData'dan sapma DERLEME hatası olur, sessiz ayrışma olmaz.
 */
type ArchitectureData = Pick<ProjectData, 'points' | 'walls' | 'openings'>

export type AddOpeningInput = {
  wallId: Id
  offsetCm: number
  widthCm: number
  type: OpeningType
}

/** Taşımanın hedefi: açıklık duvarlar arasında gezebildiği için wallId de taşınır. */
export type OpeningTarget = {
  wallId: Id
  offsetCm: number
}

export type ArchitectureSlice = ArchitectureData & {
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
}

export const INITIAL_ARCHITECTURE_DATA: ArchitectureData = {
  points: [],
  walls: [],
  openings: [],
}

/**
 * nextUniqueId veriden TÜRETİLİR, sabit yazılmaz: başlangıç verisi bir gün boş
 * olmazsa (örnek proje, şablon) sabit sayaç var olan bir id'yi ikinci kez üretir
 * ve HATA VERMEZ — id aramaları sessizce şaşar. Bkz. knowledge/id-scheme.md.
 */
export function deriveNextUniqueId(data: ArchitectureData): Id {
  return (
    Math.max(
      FIRST_FREE_ID - 1,
      ...data.points.map((point) => point.id),
      ...data.walls.map((wall) => wall.id),
      ...data.openings.map((opening) => opening.id),
    ) + 1
  )
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
      markDirty(draft)
    })
    return added
  },

  // Zincirin tamamı tek set() içinde: geri alma tek adımda tüm zinciri kaldırır.
  addWallChain: (input) =>
    set((draft) => {
      if (!appendWallChain(draft, input)) return

      splitWallsAtIntersections(draft)
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
      markDirty(draft)
    }),

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
      markDirty(draft)
    }),

  deleteSelection: (selection) => {
    let isDeleted = false
    set((draft) => {
      isDeleted = deleteSelectionFromDraft(draft, selection)
      if (isDeleted) markDirty(draft)
    })
    return isDeleted
  },

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
})
