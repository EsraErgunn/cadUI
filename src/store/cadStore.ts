import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  createArchitectureSlice,
  deriveNextUniqueId,
  INITIAL_ARCHITECTURE_DATA,
  type ArchitectureSlice,
} from './architectureSlice'
import { createFloorSlice, type FloorSlice } from './floorSlice'
import type { ProjectMetaSlice } from './projectMeta'
import type { ProjectData } from '../core/model'

export type CadState = ProjectMetaSlice &
  FloorSlice &
  ArchitectureSlice & {
    /** Depodan gelen çizimi state'e yükler. Şema doğrulaması api/serialize'ın işi. */
    loadProject: (data: ProjectData) => void
  }

// takeNextId/markDirty projectMeta.ts'te: slice'lar onları çalışma zamanında
// import ediyor, buradan alsalardı cadStore ↔ slice döngüsü oluşurdu (K17).
export { markDirty, takeNextId } from './projectMeta'

export const useCadStore = create<CadState>()(
  immer((...args) => {
    const [set] = args
    return {
      // Sayaç başlangıç verisinden TÜRETİLİR, sabit yazılmaz: veri bir gün boş
      // olmazsa sabit sayaç var olan bir id'yi ikinci kez üretir ve hata vermez.
      nextUniqueId: deriveNextUniqueId(INITIAL_ARCHITECTURE_DATA),
      revision: 0,
      savedRevision: 0,

      markSaved: () =>
        set((draft) => {
          draft.savedRevision = draft.revision
        }),

      // Yükleme "değişiklik" değildir: revision/savedRevision eşitlenir, yoksa
      // proje açılır açılmaz kirli görünür ve kullanıcı boşuna uyarılır.
      // nextUniqueId dosyadan gelir, veriden yeniden TÜRETİLMEZ — sayaç geriye
      // düşerse silinmiş bir id ikinci kez üretilir (knowledge/id-scheme.md).
      loadProject: (data) =>
        set((draft) => {
          draft.nextUniqueId = data.nextUniqueId
          draft.floors = data.floors
          draft.activeFloorId = data.activeFloorId
          draft.points = data.points
          draft.walls = data.walls
          draft.openings = data.openings
          draft.revision = 0
          draft.savedRevision = 0
        }),

      ...createFloorSlice(...args),
      ...createArchitectureSlice(...args),
    }
  }),
)

/**
 * Kaydedilmemiş değişiklik var mı? (issue 2.9 "kirli işaret sözleşmesi")
 * Duvar ve açıklık action'ları markDirty'yi çağırıyor; gerçekten true dönebilir.
 */
export function selectIsProjectDirty(state: CadState): boolean {
  return state.revision !== state.savedRevision
}

/**
 * Kaydedilecek saf veri. Her çağrıda YENİ nesne üretir → bileşen buna abone
 * olmaz, kaydetme anında getState() ile okunur (knowledge/snap-contract.md
 * abonelik tuzağı).
 */
export function selectProjectData(state: CadState): ProjectData {
  return {
    nextUniqueId: state.nextUniqueId,
    activeFloorId: state.activeFloorId,
    floors: state.floors,
    points: state.points,
    walls: state.walls,
    openings: state.openings,
  }
}
