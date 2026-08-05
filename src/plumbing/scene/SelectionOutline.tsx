import { Line } from '@react-three/drei'
import { useMemo } from 'react'

import { SELECTION_OUTLINE_ELEVATION_CM, SYMBOL_ELEVATION_CM } from './plumbingLayers'
import { planToThree, type PlanPoint, type ThreePosition } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import { SCENE_COLORS } from '../../scene/sceneTheme'
import { getSymbolLocalBounds } from '../core/elementPicking'
import type { SymbolMetadata } from '../core/symbolMetadata'

/** Çerçeve sembole yapışmasın; tutma kutusunun nerede bittiği de görünsün. */
const OUTLINE_PADDING_CM = 4
const OUTLINE_LINE_WIDTH = 1.8

type SelectionOutlineProps = {
  metadata: SymbolMetadata
  /** Elemanın ölçeği: bileşen sembol grubunun İÇİNDE, o ölçeği geri almak için gerekli. */
  scale: number
}

/**
 * Seçili sembolün mavi çerçevesi. Paylaşılan material'e YAZILMAZ (R13): highlight
 * sembolün kendi mesh'ine değil, ayrı bir çizgiye ait. Sembol grubunun içinde
 * durduğu için dönme, ölçek ve sürükleme onu kendiliğinden takip eder.
 */
export function SelectionOutline({ metadata, scale }: SelectionOutlineProps) {
  const points = useMemo<ThreePosition[]>(() => {
    const bounds = getSymbolLocalBounds(metadata)
    // Grubun ölçeği çocuklara da uygulanıyor; pay ve yükseklik dünya ölçüsünde
    // sabit kalsın diye ölçeğe BÖLÜNÜR.
    const padding = OUTLINE_PADDING_CM / scale
    const elevationCm = (SELECTION_OUTLINE_ELEVATION_CM - SYMBOL_ELEVATION_CM) / scale
    const corners: PlanPoint[] = [
      { x: bounds.min.x - padding, y: bounds.min.y - padding },
      { x: bounds.max.x + padding, y: bounds.min.y - padding },
      { x: bounds.max.x + padding, y: bounds.max.y + padding },
      { x: bounds.min.x - padding, y: bounds.max.y + padding },
    ]
    // Halka elle kapatılıyor: drei <Line>'ın bu sürümünde `closed` propu yok (Ghosts.tsx).
    return [...corners, corners[0]].map((corner) => planToThree(corner, elevationCm))
  }, [metadata, scale])

  return (
    <Line
      points={points}
      color={SCENE_COLORS.selection}
      lineWidth={OUTLINE_LINE_WIDTH}
      renderOrder={RENDER_ORDER.handle}
      depthWrite={false}
      raycast={() => null}
      toneMapped={false}
    />
  )
}
