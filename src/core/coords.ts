export type PlanPoint = { x: number; y: number }

export type ThreePosition = readonly [x: number, y: number, z: number]

/**
 * -0'ı 0'a çevirir. İşaret çevirme ve yuvarlama -0 üretebiliyor; koordinatlarda
 * -0 dolaşırsa toEqual/Object.is karşılaştırmaları sessizce şaşar.
 */
export function normalizeZero(value: number): number {
  return value === 0 ? 0 : value
}

/** Plan (x, y) → three (x, elevation, −y). Bu dönüşüm SADECE burada yazılır. */
export function planToThree(point: PlanPoint, elevationCm = 0): ThreePosition {
  return [point.x, elevationCm, normalizeZero(-point.y)]
}

export function threeToPlan(position: ThreePosition): PlanPoint {
  return { x: position[0], y: normalizeZero(-position[2]) }
}

export function threeToElevation(position: ThreePosition): number {
  return position[1]
}

const CM_PER_M = 100

/** Model cm tutar, kullanıcıya metre gösterilir (issue 2.2). */
export function formatLengthAsMeters(lengthCm: number, fractionDigits = 2): string {
  return (lengthCm / CM_PER_M).toFixed(fractionDigits)
}
