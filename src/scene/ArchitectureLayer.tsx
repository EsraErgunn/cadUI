import { Opening, type OpeningTone } from './Opening'
import { useOpeningTool } from './useOpeningTool'
import { getOpeningOutline } from '../core/opening'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/**
 * Hook'lar <Canvas> içinde çalışmak zorunda; PlumbingLayer/ViewportControls ile
 * aynı desen. Sahne state'in TÜREVİ: mesh'te veri tutulmaz.
 *
 * TODO(fay-A): <Wall> buraya mount edilecek. Duvar gövdesini çizerken
 * selectOccupiedRanges(state, wallId) okuyup açıklığın olduğu yeri boş bırakmalı.
 */
export function ArchitectureLayer() {
  const preview = useOpeningTool()
  // Yalnız KARARLI referanslara abone olunur. selectWallsOnFloor/
  // selectOpeningsOnWall her çağrıda yeni dizi üretir; buraya konsalardı
  // Object.is her store değişiminde false döner ve sonsuz render olurdu.
  const points = useCadStore((state) => state.points)
  const walls = useCadStore((state) => state.walls)
  const openings = useCadStore((state) => state.openings)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const selectedOpeningId = useArchitectureUiStore((state) => state.selectedOpeningId)

  return (
    <>
      {openings.map((opening) => {
        const wall = walls.find((candidate) => candidate.id === opening.wallId)
        if (!wall || wall.floorId !== activeFloorId) return null

        const outline = getOpeningOutline(wall, points, opening)
        if (!outline) return null

        const tone: OpeningTone = opening.id === selectedOpeningId ? 'selected' : 'normal'

        // key id, indeks DEĞİL: R3F indeks anahtarında yanlış mesh'i yeniden kullanır.
        return <Opening key={opening.id} outline={outline} type={opening.type} tone={tone} />
      })}

      {preview && (
        <Opening
          outline={preview.outline}
          type={preview.type}
          tone={preview.isValid ? 'previewValid' : 'previewInvalid'}
        />
      )}
    </>
  )
}
