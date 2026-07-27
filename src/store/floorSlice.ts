import type { StateCreator } from 'zustand'

// cadStore ↔ floorSlice karşılıklı import eder; bu taraf tip-only olduğu için
// derlemede silinir ve çalışma zamanında döngü oluşmaz.
import type { CadState } from './cadStore'
import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME, type Floor, type Id } from '../core/model'

export type FloorSlice = {
  floors: Floor[]
  activeFloorId: Id
}

/**
 * Issue 2.8: proje açıldığında tek bir "Zemin Kat" oluşur.
 * Kat ekleme/silme/yeniden adlandırma/sıralama/kopyalama ve katlar arası geçiş
 * bu issue'nun kapsamı dışında — action'ları sahibi (B) kendi issue'sunda ekler.
 */
export const createFloorSlice: StateCreator<
  CadState,
  [['zustand/immer', never]],
  [],
  FloorSlice
> = () => ({
  floors: [{ id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME }],
  activeFloorId: DEFAULT_FLOOR_ID,
})

export function selectActiveFloor(state: FloorSlice): Floor | undefined {
  return state.floors.find((floor) => floor.id === state.activeFloorId)
}
