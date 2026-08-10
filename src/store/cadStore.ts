import { temporal } from 'zundo'
import { create, useStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  createArchitectureSlice,
  deriveNextUniqueId,
  INITIAL_ARCHITECTURE_DATA,
  type ArchitectureSlice,
} from './architectureSlice'
import { createFloorSlice, type FloorSlice } from './floorSlice'
import {
  areProjectStatesEqual,
  HISTORY_LIMIT,
  partializeProjectState,
  type TrackedProjectState,
} from './history'
import type { ProjectMetaSlice } from './projectMeta'
import { createGroundFloor } from '../core/floors'
import { DEFAULT_FLOOR_ID, type ProjectData } from '../core/model'
import { createPlumbingSlice, type PlumbingSlice } from '../plumbing/store/plumbingSlice'

export type CadState = ProjectMetaSlice &
  FloorSlice &
  ArchitectureSlice &
  PlumbingSlice & {
    /** Depodan gelen çizimi state'e yükler. Şema doğrulaması api/serialize'ın işi. */
    loadProject: (data: ProjectData) => void
    /** Boş projeye döner. Editör başka bir projeye geçerken çağrılır. */
    resetProject: () => void
  }

/**
 * Boş proje. Her çağrıda TAZE diziler üretir: sabit bir nesne paylaşılsaydı iki
 * proje aynı dizi örneğini işaret eder ve birinde çizilen duvar diğerinde de
 * görünürdü — düzeltmeye çalıştığımız hatanın ta kendisi.
 */
function createEmptyProjectData(): ProjectData {
  return {
    nextUniqueId: deriveNextUniqueId(INITIAL_ARCHITECTURE_DATA),
    activeFloorId: DEFAULT_FLOOR_ID,
    floors: [createGroundFloor()],
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
  }
}

// takeNextId/markDirty projectMeta.ts'te: slice'lar onları çalışma zamanında
// import ediyor, buradan alsalardı cadStore ↔ slice döngüsü oluşurdu (K17).
export { markDirty, takeNextId } from './projectMeta'

// temporal EN DIŞTA: immer'ı sarmalı ki geçmişe düşen anlık görüntüler
// producer bittikten SONRAKİ dondurulmuş state olsun, draft değil.
export const useCadStore = create<CadState>()(
  temporal(
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
        loadProject: (data) => {
          set((draft) => {
            draft.nextUniqueId = data.nextUniqueId
            draft.floors = data.floors
            draft.activeFloorId = data.activeFloorId
            draft.points = data.points
            draft.walls = data.walls
            draft.openings = data.openings
            draft.rooms = data.rooms
            draft.symbols = data.symbols
            draft.areaObjects = data.areaObjects
            draft.revision = 0
            draft.savedRevision = 0
          })
          // Geçmiş SIFIRLANIR: yükleme bir düzenleme değil, yeni bir başlangıç.
          // Temizlenmezse Ctrl+Z kullanıcıyı önceki projenin çizimine götürür.
          useCadStore.temporal.getState().clear()
        },

        // Yükleme yoluyla AYNI kapıdan geçer: boş proje de bir "yeni başlangıç",
        // yani geçmiş ve kirli işaret aynı şekilde sıfırlanmalı.
        resetProject: () => {
          useCadStore.getState().loadProject(createEmptyProjectData())
        },

        ...createFloorSlice(...args),
        ...createArchitectureSlice(...args),
        ...createPlumbingSlice(...args),
      }
    }),
    {
      limit: HISTORY_LIMIT,
      partialize: partializeProjectState,
      equality: areProjectStatesEqual,
    },
  ),
)

/**
 * Kaydedilmemiş değişiklik var mı? (issue 2.9 "kirli işaret sözleşmesi")
 * Duvar ve açıklık action'ları markDirty'yi çağırıyor; gerçekten true dönebilir.
 */
export function selectIsProjectDirty(state: CadState): boolean {
  return state.revision !== state.savedRevision
}

/** Geri al / yinele. Menü ve klavye kısayolu aynı fonksiyonu çağırır. */
export function undoProject(): void {
  useCadStore.temporal.getState().undo()
}

export function redoProject(): void {
  useCadStore.temporal.getState().redo()
}

type TemporalState = {
  pastStates: TrackedProjectState[]
  futureStates: TrackedProjectState[]
}

/**
 * Menü maddelerinin aktifliği için. Sayının kendisine değil boş olup olmadığına
 * abone olunuyor: her adımda yeniden render etmenin anlamı yok.
 */
export function useCanUndo(): boolean {
  return useStore(useCadStore.temporal, (state) => (state as TemporalState).pastStates.length > 0)
}

export function useCanRedo(): boolean {
  return useStore(useCadStore.temporal, (state) => (state as TemporalState).futureStates.length > 0)
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
    rooms: state.rooms,
    symbols: state.symbols,
    areaObjects: state.areaObjects,
  }
}
