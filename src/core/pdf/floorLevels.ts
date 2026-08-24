import type { Floor } from '../model'

export type FloorLevel = {
  floor: Floor
  /** Katın TABAN kotu (cm), zemin = 0. Bodrumlarda negatif. */
  baseCm: number
  /** Katın TAVAN kotu (cm). */
  topCm: number
}

/**
 * Katları kot değerlerine çevirir.
 *
 * Sıfır noktası ZEMİN: ilk bodrum olmayan katın tabanı. Bodrumlar oradan aşağı,
 * üst katlar yukarı yığılır. Dizinin başından toplanmıyor çünkü bodrumlu bir
 * binada zemin katın kotu 0 olmalı, "iki bodrum kadar yukarıda" değil.
 */
export function getFloorLevels(floors: readonly Floor[]): FloorLevel[] {
  const levels: FloorLevel[] = []

  let aboveCm = 0
  let belowCm = 0
  for (const floor of floors) {
    if (floor.isBasement) continue
    levels.push({ floor, baseCm: aboveCm, topCm: aboveCm + floor.heightCm })
    aboveCm += floor.heightCm
  }

  // Bodrumlar YUKARIDAN aşağı iniyor: dizide en alttaki başta, ama zemine
  // yapışması gereken EN ÜSTTEKİ bodrum. Ters yönde dolaşılıyor.
  for (const floor of [...floors].reverse()) {
    if (!floor.isBasement) continue
    levels.push({ floor, baseCm: belowCm - floor.heightCm, topCm: belowCm })
    belowCm -= floor.heightCm
  }

  return levels
}
