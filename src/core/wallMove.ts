import type { PlanPoint } from './coords'
import { normalizeZero } from './coords'
import { snapPointToGrid } from './grid'
import { getSegmentLength, MIN_WALL_LENGTH_CM } from './wall'

/** Yön karşılaştırmaları için kayan nokta payı; snap zaten noktaları hizaya koyuyor. */
const EPSILON = 1e-6

/**
 * Duvarın kendi eksenine DİK birim vektör.
 *
 * Taşıma yalnız bu doğrultuda yapılır (K102): duvarı kendi ekseni boyunca
 * kaydırmak boyunu da açısını da değiştirmez, sadece köşelerini komşuların
 * üstünde kaydırır — kullanıcının istediği bir hareket değil, kaza kaynağı.
 *
 * Sıfır boylu duvarın yönü tanımsızdır; `undefined` döner.
 */
export function getWallNormal(p1: PlanPoint, p2: PlanPoint): PlanPoint | undefined {
  const lengthCm = getSegmentLength(p1, p2)
  if (lengthCm < MIN_WALL_LENGTH_CM) return undefined

  // Ekseni 90° döndür: (dx, dy) → (-dy, dx).
  return {
    x: normalizeZero(-(p2.y - p1.y) / lengthCm),
    y: normalizeZero((p2.x - p1.x) / lengthCm),
  }
}

/**
 * Ham ötelemeyi duvarın normaline izdüşürür: imleç nereye giderse gitsin duvar
 * yalnız kendine dik yönde ilerler.
 *
 * Sonuç ızgaraya YAPIŞTIRILMADAN döner; yapıştırma çağıranın işi çünkü
 * kademe zoom'a bağlı (bkz. `snapNormalMoveToGrid`).
 */
export function constrainDeltaToNormal(
  dxCm: number,
  dyCm: number,
  normal: PlanPoint,
): { dxCm: number; dyCm: number } {
  const distanceCm = dxCm * normal.x + dyCm * normal.y
  return {
    dxCm: normalizeZero(distanceCm * normal.x),
    dyCm: normalizeZero(distanceCm * normal.y),
  }
}

/**
 * Kısıtlı ötelemeyi ızgaraya yapıştırır ve SONUCU YİNE NORMALDE tutar.
 *
 * Eksene paralel duvarda (planların çoğu) yapışma tek koordinat üzerinde
 * çalışır ve sonuç eskisiyle birebir aynıdır. Eğik duvarda 2B ızgaraya
 * yapıştırmak noktayı kısıt doğrusunun DIŞINA atardı; orada normal boyunca
 * alınan mesafe yuvarlanır.
 */
export function snapNormalMoveToGrid(
  origin: PlanPoint,
  dxCm: number,
  dyCm: number,
  normal: PlanPoint,
  stepCm: number,
): { dxCm: number; dyCm: number } {
  if (stepCm <= 0) return { dxCm, dyCm }

  const snapAxis = (from: number, delta: number) =>
    normalizeZero(Math.round((from + delta) / stepCm) * stepCm - from)

  // Dikey hareket: yalnız y oynuyor, x'i yuvarlamak duvarı ekseninden kaçırırdı.
  if (Math.abs(normal.x) < EPSILON) return { dxCm: 0, dyCm: snapAxis(origin.y, dyCm) }
  if (Math.abs(normal.y) < EPSILON) return { dxCm: snapAxis(origin.x, dxCm), dyCm: 0 }

  const distanceCm = dxCm * normal.x + dyCm * normal.y
  const snappedCm = Math.round(distanceCm / stepCm) * stepCm
  return {
    dxCm: normalizeZero(snappedCm * normal.x),
    dyCm: normalizeZero(snappedCm * normal.y),
  }
}

/**
 * Kısıtsız öteleme (çoklu seçim): p1 ızgaraya yapışır, aynı fark tüm seçime
 * gider. Tek duvar sürüklemesi bunu KULLANMAZ — orada hareket duvarın
 * normaline kilitli (`snapNormalMoveToGrid`).
 */
export function snapFreeMoveToGrid(
  origin: PlanPoint,
  dxCm: number,
  dyCm: number,
  stepCm: number,
): { dxCm: number; dyCm: number } {
  const target = { x: origin.x + dxCm, y: origin.y + dyCm }
  const next = stepCm > 0 ? snapPointToGrid(target, stepCm) : target
  return { dxCm: next.x - origin.x, dyCm: next.y - origin.y }
}
