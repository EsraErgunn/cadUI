import { useMemo } from 'react'

import type { FloorContentSource } from '../../core/floorContent'
import { useCadStore } from '../../store/cadStore'

/**
 * İçerik sorularının (rozet, döküm, çakışma) beslendiği store dizileri.
 *
 * Her diziye AYRI abone olunur ve nesne `useMemo` ile kurulur: tek selector'da
 * `{ points, walls, … }` döndürmek her çağrıda yeni referans üretir, `Object.is`
 * hep false döner ve bileşen sonsuz render olur — knowledge/snap-contract.md'deki
 * abonelik tuzağının ta kendisi.
 */
export function useFloorContentSource(): FloorContentSource {
  const points = useCadStore((state) => state.points)
  const walls = useCadStore((state) => state.walls)
  const openings = useCadStore((state) => state.openings)
  const rooms = useCadStore((state) => state.rooms)
  const symbols = useCadStore((state) => state.symbols)
  const areaObjects = useCadStore((state) => state.areaObjects)
  const beams = useCadStore((state) => state.beams)
  const texts = useCadStore((state) => state.texts)
  const installationElements = useCadStore((state) => state.installationElements)
  const installationLines = useCadStore((state) => state.installationLines)

  return useMemo(
    () => ({
      points,
      walls,
      openings,
      rooms,
      symbols,
      areaObjects,
      beams,
      texts,
      installationElements,
      installationLines,
    }),
    [
      points,
      walls,
      openings,
      rooms,
      symbols,
      areaObjects,
      beams,
      texts,
      installationElements,
      installationLines,
    ],
  )
}
