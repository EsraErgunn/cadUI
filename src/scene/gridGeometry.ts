import { planToThree, type ThreePosition } from '../core/coords'
import type { PlanBounds } from '../core/viewport'

const EPSILON = 1e-6

/**
 * Görünür alanı bir adım payla dışarı yuvarlar. Böylece bir hücre içindeki
 * küçük pan hareketlerinde ızgara geometrisi yeniden üretilmez.
 */
export function padBoundsToStep(bounds: PlanBounds, stepCm: number): PlanBounds {
  return {
    minXCm: Math.floor(bounds.minXCm / stepCm) * stepCm - stepCm,
    minYCm: Math.floor(bounds.minYCm / stepCm) * stepCm - stepCm,
    maxXCm: Math.ceil(bounds.maxXCm / stepCm) * stepCm + stepCm,
    maxYCm: Math.ceil(bounds.maxYCm / stepCm) * stepCm + stepCm,
  }
}

/**
 * Verilen alanı kaplayan yatay ve dikey çizgilerin uç noktaları.
 * `skipStepCm` verilirse o adımın katına denk gelen çizgiler atlanır — ince
 * ızgara, kalın çizgilerin üstüne ikinci kez çizilmesin diye.
 */
export function buildGridLinePoints(
  bounds: PlanBounds,
  stepCm: number,
  elevationCm: number,
  skipStepCm: number | null,
): ThreePosition[] {
  const points: ThreePosition[] = []
  const shouldSkip = (valueCm: number) =>
    skipStepCm !== null && Math.abs(valueCm % skipStepCm) < EPSILON

  const firstXCm = Math.ceil(bounds.minXCm / stepCm) * stepCm
  const xLineCount = Math.floor((bounds.maxXCm - firstXCm) / stepCm)
  for (let index = 0; index <= xLineCount; index += 1) {
    const xCm = firstXCm + index * stepCm
    if (shouldSkip(xCm)) continue
    points.push(
      planToThree({ x: xCm, y: bounds.minYCm }, elevationCm),
      planToThree({ x: xCm, y: bounds.maxYCm }, elevationCm),
    )
  }

  const firstYCm = Math.ceil(bounds.minYCm / stepCm) * stepCm
  const yLineCount = Math.floor((bounds.maxYCm - firstYCm) / stepCm)
  for (let index = 0; index <= yLineCount; index += 1) {
    const yCm = firstYCm + index * stepCm
    if (shouldSkip(yCm)) continue
    points.push(
      planToThree({ x: bounds.minXCm, y: yCm }, elevationCm),
      planToThree({ x: bounds.maxXCm, y: yCm }, elevationCm),
    )
  }

  return points
}

export function toPositionArray(points: readonly ThreePosition[]): Float32Array {
  const positions = new Float32Array(points.length * 3)
  points.forEach((point, index) => {
    positions.set(point, index * 3)
  })
  return positions
}
