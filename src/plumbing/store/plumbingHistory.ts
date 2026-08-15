import { temporal } from 'zundo'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../core/installationModel'

/** Geçmişe giren tesisat verisinin TAMAMI; yeni bir dizi eklenirse buraya da eklenir. */
export type PlumbingSnapshot = {
  installationElements: InstallationElement[]
  installationLines: InstallationLine[]
  installationConnections: InstallationConnection[]
}

/** Bir oturumda tutulan en fazla geri alma adımı. */
const HISTORY_LIMIT = 100

/**
 * cadStore zundo ile SARILMADIĞI için (global geçmiş store/history.ts'te, A'nın
 * işi) tesisat verisi burada aynalanır ve zundo yalnız bu aynayı izler.
 * Akış TEK YÖNLÜ: plumbingSlice her veri değişiminden sonra recordPlumbingHistory
 * çağırır; ayna cadStore'a yalnız undo/redo ile geri yazılır — abonelikle çift
 * yönlü senkron kurulsaydı her yazma birbirini tetikleyebilirdi.
 * Bu dosya cadStore'u İÇE AKTARMAZ: cadStore → plumbingSlice → plumbingHistory
 * zincirinde çalışma zamanı döngüsü oluşurdu (K17).
 */
const historyStore = createStore<PlumbingSnapshot>()(
  temporal(
    (): PlumbingSnapshot => ({
      installationElements: [],
      installationLines: [],
      installationConnections: [],
    }),
    { limit: HISTORY_LIMIT },
  ),
)

const temporalStore = historyStore.temporal

export function recordPlumbingHistory(snapshot: PlumbingSnapshot): void {
  historyStore.setState(snapshot)
}

/** Geri alınacak adım yoksa null; dönen aynayı cadStore'a yazmak çağıranın işi. */
export function undoPlumbingHistory(): PlumbingSnapshot | null {
  const { pastStates, undo } = temporalStore.getState()
  if (pastStates.length === 0) return null

  undo()
  return historyStore.getState()
}

export function redoPlumbingHistory(): PlumbingSnapshot | null {
  const { futureStates, redo } = temporalStore.getState()
  if (futureStates.length === 0) return null

  redo()
  return historyStore.getState()
}

type PlumbingTemporalState = {
  pastStates: PlumbingSnapshot[]
  futureStates: PlumbingSnapshot[]
}

/**
 * Menü/çubuk maddelerinin aktifliği için — cadStore'daki useCanUndo'nun tesisat
 * karşılığı. Sayıya değil boş olup olmadığına abone olunuyor: her adımda
 * yeniden render etmenin anlamı yok.
 */
export function useCanUndoPlumbing(): boolean {
  return useStore(temporalStore, (state) => (state as PlumbingTemporalState).pastStates.length > 0)
}

export function useCanRedoPlumbing(): boolean {
  return useStore(temporalStore, (state) => (state as PlumbingTemporalState).futureStates.length > 0)
}

/** Proje yüklendiğinde geçmiş sıfırlanır: önceki projenin adımları geri alınamaz. */
export function resetPlumbingHistory(snapshot: PlumbingSnapshot): void {
  // Önce yaz sonra temizle: ters sırada bu setState geçmişe bir adım bırakırdı.
  historyStore.setState(snapshot)
  temporalStore.getState().clear()
}
