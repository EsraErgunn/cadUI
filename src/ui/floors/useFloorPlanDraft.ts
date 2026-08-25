import { useCallback, useMemo, useState } from 'react'

import { useFloorContentSource } from './useFloorContentSource'
import { getFloorContent, isFloorContentEmpty, type FloorContent } from '../../core/floorContent'
import { getFloorElevationsCm } from '../../core/floorElevation'
import {
  addDraftFloors,
  clearDraftFloorCopy,
  createFloorPlanDraft,
  getAddableFloorCount,
  removeDraftFloors,
  renameDraftFloor,
  reorderDraftFloor,
  setDraftActiveFloor,
  setDraftFloorCopies,
  setDraftFloorHeight,
  setDraftFloorSelection,
  type AddDraftFloorInput,
  type DraftFloorCopy,
  type FloorPlanDraft,
} from '../../core/floorPlan'
import { moveFloorInList } from '../../core/floors'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'

/**
 * "Katlar" penceresinin taslağı. Store'a YALNIZCA "Uygula" yazar; pencere
 * açıkken yapılan her düzenleme — kopyalama DAHİL (K166) — burada birikir.
 *
 * Taslak pencere AÇILDIĞINDA bir kez kuruluyor: store'a abone olup tazelenseydi
 * kullanıcının yarım düzenlemesi dışarıdan gelen bir değişiklikle silinirdi.
 */
export function useFloorPlanDraft() {
  const storedFloors = useCadStore((state) => state.floors)
  const storedActiveFloorId = useCadStore((state) => state.activeFloorId)
  const applyFloorPlan = useCadStore((state) => state.applyFloorPlan)

  const contentSource = useFloorContentSource()

  /**
   * Taslağın KENDİ geri alma geçmişi (K166). Silme artık onay penceresi
   * açmıyor — dokunulan şey store değil taslak olduğu için geri alınabilir
   * olması yeterli, kullanıcıyı her silmede durdurmak gereksiz sürtünmeydi.
   *
   * Zundo kullanılmıyor: o store'un geçmişi ve pencere store'a Uygula'ya kadar
   * hiç yazmıyor. Taslak zaten değişmez bir nesne, yığın tutmak yetiyor.
   */
  const [history, setHistory] = useState<{
    past: FloorPlanDraft[]
    present: FloorPlanDraft
    future: FloorPlanDraft[]
  }>(() => ({
    past: [],
    present: createFloorPlanDraft(storedFloors, storedActiveFloorId),
    future: [],
  }))

  const draft = history.present

  const setDraft = useCallback((update: (current: FloorPlanDraft) => FloorPlanDraft) => {
    setHistory((current) => {
      const next = update(current.present)
      // Reddedilen işlem AYNI nesneyi döndürür; geçmişe boş adım yazılmaz.
      if (next === current.present) return current
      return { past: [...current.past, current.present], present: next, future: [] }
    })
  }, [])

  /**
   * SEÇİM geçmişe yazılmaz: bir düzenleme değil, neye bakıldığı. Yığına
   * girseydi kullanıcının Ctrl+Z'si önce seçim adımlarını geri sarar, gerçek
   * değişikliğe ulaşmak için tuşa defalarca basılırdı.
   */
  const setDraftQuietly = useCallback((update: (current: FloorPlanDraft) => FloorPlanDraft) => {
    setHistory((current) => {
      const next = update(current.present)
      return next === current.present ? current : { ...current, present: next }
    })
  }, [])

  /**
   * Katın Uygula SONRASINDAKİ içeriği. Bekleyen kopyalama TÜR BAZINDA baskın:
   * yalnız mimari kopyalanıyorsa hedefin tesisatı yerinde kalır, dolayısıyla
   * rozet de öyle okunmalı. Store'a bakılsaydı "X'tan kopyalayarak" eklenen kat
   * listede "Boş" görünür, kullanıcı kopyalamanın işlemediğini sanırdı.
   */
  const contentOf = useCallback(
    (floorId: Id): FloorContent => {
      const own = getFloorContent(contentSource, floorId)
      const copy = draft.floors.find((candidate) => candidate.id === floorId)?.pendingCopy
      if (!copy) return own

      const source = getFloorContent(contentSource, copy.sourceFloorId)
      return {
        hasArchitecture: copy.isArchitectureIncluded ? source.hasArchitecture : own.hasArchitecture,
        hasInstallation: copy.isInstallationIncluded ? source.hasInstallation : own.hasInstallation,
      }
    },
    [contentSource, draft.floors],
  )

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1)
      if (previous === undefined) return current
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((current) => {
      const [next, ...rest] = current.future
      if (next === undefined) return current
      return { past: [...current.past, current.present], present: next, future: rest }
    })
  }, [])

  const elevationsCm = useMemo(() => getFloorElevationsCm(draft.floors), [draft.floors])

  const emptyFloors = useMemo(
    () => draft.floors.filter((floor) => isFloorContentEmpty(contentOf(floor.id))),
    [draft.floors, contentOf],
  )

  const actions = useMemo(
    () => ({
      add: (input: AddDraftFloorInput, count = 1) =>
        setDraft((current) => addDraftFloors(current, input, count)),
      remove: (floorIds: readonly Id[]) =>
        setDraft((current) => removeDraftFloors(current, floorIds)),
      rename: (floorId: Id, name: string) =>
        setDraft((current) => renameDraftFloor(current, floorId, name)),
      setHeight: (floorId: Id, heightCm: number) => {
        let isApplied = false
        setDraft((current) => {
          const next = setDraftFloorHeight(current, floorId, heightCm)
          isApplied = next !== current
          return next
        })
        return isApplied
      },
      reorder: (floorId: Id, targetIndex: number) =>
        setDraft((current) => reorderDraftFloor(current, floorId, targetIndex)),
      moveByKey: (floorId: Id, direction: 'up' | 'down') =>
        setDraft((current) => {
          const floors = moveFloorInList(current.floors, floorId, direction)
          return floors === current.floors ? current : { ...current, floors: [...floors] }
        }),
      makeActive: (floorId: Id) => setDraft((current) => setDraftActiveFloor(current, floorId)),
      select: (floorIds: readonly Id[]) =>
        setDraftQuietly((current) => setDraftFloorSelection(current, floorIds)),
      copyTo: (targetFloorIds: readonly Id[], copy: DraftFloorCopy) =>
        setDraft((current) => setDraftFloorCopies(current, targetFloorIds, copy)),
      clearCopy: (floorId: Id) => setDraft((current) => clearDraftFloorCopy(current, floorId)),
    }),
    [setDraft, setDraftQuietly],
  )

  const apply = useCallback(
    () => applyFloorPlan({ floors: draft.floors, activeFloorId: draft.activeFloorId }),
    [applyFloorPlan, draft],
  )

  return {
    draft,
    elevationsCm,
    emptyFloors,
    contentOf,
    addableFloorCount: getAddableFloorCount(draft.floors, false),
    addableBasementCount: getAddableFloorCount(draft.floors, true),
    actions,
    apply,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
