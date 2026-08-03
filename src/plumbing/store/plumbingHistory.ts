import { temporal } from 'zundo'
import { createStore } from 'zustand/vanilla'

import type { InstallationElement } from '../core/installationModel'

type PlumbingHistoryState = {
  installationElements: InstallationElement[]
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
const historyStore = createStore<PlumbingHistoryState>()(
  temporal((): PlumbingHistoryState => ({ installationElements: [] }), { limit: HISTORY_LIMIT }),
)

const temporalStore = historyStore.temporal

export function recordPlumbingHistory(elements: InstallationElement[]): void {
  historyStore.setState({ installationElements: elements })
}

/** Geri alınacak adım yoksa null; dönen diziyi cadStore'a yazmak çağıranın işi. */
export function undoPlumbingHistory(): InstallationElement[] | null {
  const { pastStates, undo } = temporalStore.getState()
  if (pastStates.length === 0) return null

  undo()
  return historyStore.getState().installationElements
}

export function redoPlumbingHistory(): InstallationElement[] | null {
  const { futureStates, redo } = temporalStore.getState()
  if (futureStates.length === 0) return null

  redo()
  return historyStore.getState().installationElements
}

/** Proje yüklendiğinde geçmiş sıfırlanır: önceki projenin adımları geri alınamaz. */
export function resetPlumbingHistory(elements: InstallationElement[]): void {
  // Önce yaz sonra temizle: ters sırada bu setState geçmişe bir adım bırakırdı.
  historyStore.setState({ installationElements: elements })
  temporalStore.getState().clear()
}
