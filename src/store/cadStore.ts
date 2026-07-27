import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { createFloorSlice, type FloorSlice } from './floorSlice'
import { FIRST_FREE_ID, type Id } from '../core/model'


type ProjectMetaSlice = {
  nextUniqueId: Id
  /** Çizim verisi her değiştiğinde artar. Bkz. markDirty. */
  revision: number
  savedRevision: number
  markSaved: () => void
}

export type CadState = ProjectMetaSlice & FloorSlice

/**
 * Kalıcı id üretimi: immer draft'ı üzerinde çağrılır, id BİR KEZ üretilir.
 * crypto.randomUUID()/nanoid kullanılmaz — bkz. knowledge/id-scheme.md.
 */
export function takeNextId(draft: Pick<CadState, 'nextUniqueId'>): Id {
  const id = draft.nextUniqueId
  draft.nextUniqueId += 1
  return id
}

/**
 * Çizim verisini değiştiren HER action bunu çağırır (issue 2.9: nesne ekleme,
 * silme, taşıma, özellik düzenleme, kat işlemleri).
 * Zoom/pan/araç/görünüm bu store'da olmadığı için buraya hiç uğramaz.
 */
export function markDirty(draft: Pick<CadState, 'revision'>): void {
  draft.revision += 1
}

export const useCadStore = create<CadState>()(
  immer((...args) => {
    const [set] = args
    return {
      nextUniqueId: FIRST_FREE_ID,
      revision: 0,
      savedRevision: 0,

      markSaved: () =>
        set((draft) => {
          draft.savedRevision = draft.revision
        }),

      ...createFloorSlice(...args),
    }
  }),
)

/**
 * Kaydedilmemiş değişiklik var mı? (issue 2.9 "kirli işaret sözleşmesi")
 * Bu issue'da çizim verisini değiştiren action olmadığı için her zaman false döner.
 */
export function selectIsProjectDirty(state: CadState): boolean {
  return state.revision !== state.savedRevision
}
