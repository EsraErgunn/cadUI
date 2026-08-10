import { useCallback, useMemo, useState } from 'react'

import { getFloorContent, isFloorContentEmpty, type FloorContent } from '../../core/floorContent'
import { getFloorElevationsCm } from '../../core/floorElevation'
import {
  addDraftFloor,
  createFloorPlanDraft,
  removeDraftFloors,
  renameDraftFloor,
  reorderDraftFloor,
  setDraftActiveFloor,
  setDraftFloorHeight,
  toggleDraftFloorSelection,
  type AddDraftFloorInput,
  type FloorPlanDraft,
} from '../../core/floorPlan'
import { canAddBasement, canAddFloor, moveFloorInList } from '../../core/floors'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'

/**
 * "Katlar" penceresinin taslağı. Store'a YALNIZCA "Uygula" yazar (madde 13);
 * pencere açıkken yapılan her düzenleme burada birikir.
 *
 * Taslak pencere AÇILDIĞINDA bir kez kuruluyor: store'a abone olup tazelenseydi
 * kullanıcının yarım düzenlemesi dışarıdan gelen bir değişiklikle silinirdi.
 */
export function useFloorPlanDraft() {
  const storedFloors = useCadStore((state) => state.floors)
  const storedActiveFloorId = useCadStore((state) => state.activeFloorId)
  const applyFloorPlan = useCadStore((state) => state.applyFloorPlan)

  // Her diziye AYRI abone olunur: tek selector'da nesne döndürmek her çağrıda
  // yeni referans üretir ve bileşen sonsuz render olur (snap-contract.md).
  const points = useCadStore((state) => state.points)
  const walls = useCadStore((state) => state.walls)
  const openings = useCadStore((state) => state.openings)
  const rooms = useCadStore((state) => state.rooms)
  const symbols = useCadStore((state) => state.symbols)
  const areaObjects = useCadStore((state) => state.areaObjects)
  const installationElements = useCadStore((state) => state.installationElements)
  const installationLines = useCadStore((state) => state.installationLines)

  const [draft, setDraft] = useState<FloorPlanDraft>(() =>
    createFloorPlanDraft(storedFloors, storedActiveFloorId),
  )

  const contentSource = useMemo(
    () => ({
      points,
      walls,
      openings,
      rooms,
      symbols,
      areaObjects,
      installationElements,
      installationLines,
    }),
    [points, walls, openings, rooms, symbols, areaObjects, installationElements, installationLines],
  )

  /**
   * Yeni (henüz uygulanmamış) kat store'da yok: içeriği kopya kaynağından okunur,
   * yoksa boştur. Kaynaktan okunmasaydı "X'tan kopyalayarak" eklenen kat listede
   * "Boş" görünür, kullanıcı kopyalamanın işlemediğini sanırdı.
   */
  const contentOf = useCallback(
    (floorId: Id): FloorContent => {
      const floor = draft.floors.find((candidate) => candidate.id === floorId)
      const sourceId = floor?.copyFromFloorId ?? floorId
      return getFloorContent(contentSource, sourceId)
    },
    [contentSource, draft.floors],
  )

  const elevationsCm = useMemo(() => getFloorElevationsCm(draft.floors), [draft.floors])

  const emptyFloors = useMemo(
    () => draft.floors.filter((floor) => isFloorContentEmpty(contentOf(floor.id))),
    [draft.floors, contentOf],
  )

  const actions = useMemo(
    () => ({
      add: (input: AddDraftFloorInput) => setDraft((current) => addDraftFloor(current, input)),
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
      toggleSelected: (floorId: Id) =>
        setDraft((current) => toggleDraftFloorSelection(current, floorId)),
    }),
    [],
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
    canAddFloor: canAddFloor(draft.floors),
    canAddBasement: canAddBasement(draft.floors),
    actions,
    apply,
  }
}
