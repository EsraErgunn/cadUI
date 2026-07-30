import type { StateCreator } from 'zustand'

import { MOCK_OPENINGS, MOCK_POINTS, MOCK_WALLS } from './architectureMock'
// cadStore ↔ architectureSlice karşılıklı import eder; bu taraf tip-only olduğu
// için derlemede silinir ve çalışma zamanında döngü oluşmaz (floorSlice ile aynı).
import type { CadState } from './cadStore'
import { markDirty, takeNextId } from './projectMeta'
import type { Id, Opening, OpeningType, Point, ProjectData, Wall } from '../core/model'
import {
  getOccupiedRanges,
  getOpeningsOnWall,
  isPlacementValid,
  MIN_OPENING_WIDTH_CM,
  pruneUnfittableOpenings,
  type OpeningPlacement,
  type OpeningSpan,
} from '../core/opening'
import { getPlacementRange, getWallsAtPoint, type PlacementRange } from '../core/wall'

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

export type ArchitectureSlice = ArchitectureData & {
  /** Reddedilirse undefined döner ve HİÇBİR ŞEY değişmez — id bile harcanmaz. */
  addOpening: (input: AddOpeningInput) => Id | undefined
  /** Yalnız offsetCm günceller: duvar bölünmez, Point/Wall üretilmez (K9). */
  moveOpening: (openingId: Id, offsetCm: number) => boolean
  setOpeningWidth: (openingId: Id, widthCm: number) => boolean
  removeOpening: (openingId: Id) => void
  /** Duvar silme/kısaltma sonrası fay A'nın çağıracağı temizlik (K16). */
  pruneOpeningsOnWalls: () => void
}

/** Köşe payı burada hesaplanmaz; getPlacementRange'den geçirilir (K11). */
function isPlacementValidInState(state: ArchitectureData, placement: OpeningPlacement): boolean {
  const wall = state.walls.find((candidate) => candidate.id === placement.wallId)
  if (!wall) return false

  const range = getPlacementRange(wall, state.points, state.walls)
  if (!range) return false

  return isPlacementValid(placement, range, state.openings)
}

export const createArchitectureSlice: StateCreator<
  CadState,
  [['zustand/immer', never]],
  [],
  ArchitectureSlice
> = (set) => ({
  points: MOCK_POINTS,
  walls: MOCK_WALLS,
  openings: MOCK_OPENINGS,

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

  moveOpening: (openingId, offsetCm) => {
    let isMoved = false

    set((draft) => {
      const opening = draft.openings.find((candidate) => candidate.id === openingId)
      if (!opening) return

      const isValid = isPlacementValidInState(draft, {
        wallId: opening.wallId,
        offsetCm,
        widthCm: opening.widthCm,
        ignoreOpeningId: openingId,
      })
      // Geçersiz taşıma REDDEDİLİR, en yakın geçerli yere kaydırılmaz (K13).
      if (!isValid) return

      opening.offsetCm = offsetCm
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
      const kept = pruneUnfittableOpenings(draft.openings, draft.walls, draft.points)
      // Silinen yoksa markDirty ÇAĞRILMAZ: A'nın duvar sürüklemesi her karede
      // revision'ı artırırsa "kaydedilmemiş değişiklik" uyarısı anlamsızlaşır.
      if (kept.length === draft.openings.length) return

      draft.openings = kept
      markDirty(draft)
    }),

  // TODO(fay-A): addWall/moveWall/removeWall/movePoint buraya gelecek ve
  // store/architectureMock.ts silinecek. Duvarı silen veya kısaltan HER action
  // işini bitirince pruneOpeningsOnWalls() çağırmalı (K16); duvarı açıklığın
  // üstünden geçirmemek için selectOccupiedRanges(state, wallId) okumalı.
})

/**
 * ⚠️ Aşağıdaki selector'ların bir kısmı her çağrıda YENİ dizi/nesne üretir
 * (selectWallsOnFloor, selectWallsAtPoint, selectOpeningsOnWall,
 * selectOccupiedRanges, selectPlacementRange). `useCadStore((s) => selectX(s, id))`
 * biçiminde kullanılırsa Object.is her seferinde false döner ve bileşen sonsuz
 * yeniden render olur. Bunlar action/olay içinden `useCadStore.getState()` ile
 * çağrılan sorgu yardımcılarıdır; bileşenler kararlı `state.openings` /
 * `state.walls` referanslarına abone olup türetir.
 */
export function selectWallById(state: ArchitectureSlice, wallId: Id): Wall | undefined {
  return state.walls.find((wall) => wall.id === wallId)
}

export function selectPointById(state: ArchitectureSlice, pointId: Id): Point | undefined {
  return state.points.find((point) => point.id === pointId)
}

export function selectWallsOnFloor(state: ArchitectureSlice, floorId: Id): Wall[] {
  return state.walls.filter((wall) => wall.floorId === floorId)
}

export function selectWallsAtPoint(state: ArchitectureSlice, pointId: Id): Wall[] {
  return getWallsAtPoint(pointId, state.walls)
}

export function selectPlacementRange(
  state: ArchitectureSlice,
  wallId: Id,
): PlacementRange | undefined {
  const wall = selectWallById(state, wallId)
  if (!wall) return undefined
  return getPlacementRange(wall, state.points, state.walls)
}

export function selectOpeningById(state: ArchitectureSlice, openingId: Id): Opening | undefined {
  return state.openings.find((opening) => opening.id === openingId)
}

export function selectOpeningsOnWall(state: ArchitectureSlice, wallId: Id): Opening[] {
  return getOpeningsOnWall(wallId, state.openings)
}

/** B→A sözleşmesinin store yüzü. Bkz. knowledge/snap-contract.md. */
export function selectOccupiedRanges(state: ArchitectureSlice, wallId: Id): OpeningSpan[] {
  return getOccupiedRanges(wallId, state.openings)
}
