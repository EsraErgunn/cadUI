import { Opening, type OpeningTone } from './Opening'
import { PointHandles } from './PointHandle'
import { SelectionMarquee } from './SelectionMarquee'
import { Walls } from './Wall'
import { WallTool } from './WallTool'
import { useArchitecturePoints } from './useArchitecturePoints'
import { useOpeningTool } from './useOpeningTool'
import { useSelectionTool } from './useSelectionTool'
import { getOpeningOutline } from '../core/opening'
import { isSelected } from '../core/selection'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/**
 * Açıklıkları çizer ve kapı/pencere aracını çalıştırır. Hook'lar <Canvas> içinde
 * çalışmak zorunda; PlumbingLayer/ViewportControls ile aynı desen.
 * Sahne state'in TÜREVİ: mesh'te veri tutulmaz.
 */
function Openings() {
  const preview = useOpeningTool()
  // Yalnız KARARLI referanslara abone olunur. selectWallsOnFloor/
  // selectOpeningsOnWall her çağrıda yeni dizi üretir; buraya konsalardı
  // Object.is her store değişiminde false döner ve sonsuz render olurdu.
  // Köşe sürüklenirken açıklık da duvarla birlikte gelsin diye ortak havuzdan okunur.
  const points = useArchitecturePoints()
  const walls = useCadStore((state) => state.walls)
  const openings = useCadStore((state) => state.openings)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const selection = useArchitectureUiStore((state) => state.selection)

  return (
    <>
      {openings.map((opening) => {
        const wall = walls.find((candidate) => candidate.id === opening.wallId)
        if (!wall || wall.floorId !== activeFloorId) return null

        const outline = getOpeningOutline(wall, points, opening)
        if (!outline) return null

        const tone: OpeningTone = isSelected(selection, 'opening', opening.id)
          ? 'selected'
          : 'normal'

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

/** Çerçeve seçimi hook'u; <Canvas> içinde çalışmak zorunda (Openings ile aynı desen). */
function SelectionTool() {
  useSelectionTool()
  return null
}

/** Mimari sahnenin kökü; SceneRoot yalnız mimari görünümde mount eder. */
export function ArchitectureLayer() {
  return (
    <group name="architecture-root">
      <Walls />
      {/* Açıklık duvarın ÜSTÜNE boyanıyor (RENDER_ORDER.opening > wall), sırası önemli. */}
      <Openings />
      <WallTool />
      <SelectionTool />
      {/* Tutamaklar ve seçim çerçevesi en üstte: altındaki her şeyin üzerinde görünmeli. */}
      <PointHandles />
      <SelectionMarquee />
    </group>
  )
}
