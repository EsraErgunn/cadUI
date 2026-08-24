import { useMemo } from 'react'

import { buildSolidModel, type SolidModel } from '../../core/solidModel'
import { getSymbolMetadata } from '../../plumbing/scene/symbolLoader'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'

/**
 * Katı model çizimin TÜREVİ: store'da durmaz, her değişimde yeniden kurulur —
 * 2B'deki oda poligonlarıyla aynı kural (geometri kopyalanmaz).
 *
 * Store'un KARARLI dizilerine abone olunuyor (türetilmiş seçici değil): türev
 * bir dizi döndüren seçici her store yazımında yeni referans üretir ve model
 * çizim değişmese bile yeniden kurulurdu.
 */
export function useSolidModel(): SolidModel {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const points = useCadStore((state) => state.points)
  const walls = useCadStore((state) => state.walls)
  const rooms = useCadStore((state) => state.rooms)
  const openings = useCadStore((state) => state.openings)
  const areaObjects = useCadStore((state) => state.areaObjects)
  const beams = useCadStore((state) => state.beams)
  const installationLines = useCadStore((state) => state.installationLines)
  const installationElements = useCadStore((state) => state.installationElements)
  const installationConnections = useCadStore((state) => state.installationConnections)
  const isSolidAllFloorsVisible = useUiStore((state) => state.isSolidAllFloorsVisible)

  const visibleFloorIds = useMemo(
    () => (isSolidAllFloorsVisible ? floors.map((floor) => floor.id) : [activeFloorId]),
    [isSolidAllFloorsVisible, floors, activeFloorId],
  )

  return useMemo(
    () =>
      buildSolidModel({
        floors,
        points,
        walls,
        rooms,
        openings,
        areaObjects,
        beams,
        installationLines,
        installationElements,
        installationConnections,
        visibleFloorIds,
        getSymbolMetadata,
      }),
    [
      floors,
      points,
      walls,
      rooms,
      openings,
      areaObjects,
      beams,
      installationLines,
      installationElements,
      installationConnections,
      visibleFloorIds,
    ],
  )
}
