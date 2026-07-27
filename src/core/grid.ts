import { normalizeZero, type PlanPoint } from './coords'

export type GridLevel = {
  /** İnce çizgi aralığı (cm). */
  minorCm: number
  /** Kalın çizgi aralığı (cm). minorCm'in tam katı olmalı. */
  majorCm: number
}

/**
 * Zoom uzaklaştıkça bir üst kademeye geçilir: 50 cm → 1 m → 5 m (issue 2.2).
 * Varsayılan kademede kalın çizgi her 1 m'de bir düşer (KK-2).
 */
export const GRID_LEVELS: readonly GridLevel[] = [
  { minorCm: 50, majorCm: 100 },
  { minorCm: 100, majorCm: 500 },
  { minorCm: 500, majorCm: 2500 },
]

/** İnce çizgiler bu aralığın altına inerse ızgara okunmaz hale gelir. */
const MIN_MINOR_SPACING_PX = 12

export function pickGridLevel(zoom: number): GridLevel {
  const level = GRID_LEVELS.find((candidate) => candidate.minorCm * zoom >= MIN_MINOR_SPACING_PX)
  return level ?? GRID_LEVELS[GRID_LEVELS.length - 1]
}

export function snapToGrid(valueCm: number, stepCm: number): number {
  if (stepCm <= 0) return valueCm
  // Math.round(-0.5) === -0, bkz. coords.normalizeZero.
  return normalizeZero(Math.round(valueCm / stepCm) * stepCm)
}

export function snapPointToGrid(point: PlanPoint, stepCm: number): PlanPoint {
  return { x: snapToGrid(point.x, stepCm), y: snapToGrid(point.y, stepCm) }
}
