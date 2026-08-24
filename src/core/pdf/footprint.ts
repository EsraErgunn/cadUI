import { getPlanBounds, type PlanBounds } from './paper'
import type { PlanPoint } from '../coords'
import type { Id, Point, Wall } from '../model'
import { buildPointIndex } from '../wall'

/** Bir duvarın plan uzayındaki iki ucu. */
export type FootprintSegment = readonly [PlanPoint, PlanPoint]

export type BuildingFootprint = {
  segments: readonly FootprintSegment[]
  bounds: PlanBounds
  /** Servis kutusunun plan konumu; projede yoksa `undefined`. */
  serviceBox: PlanPoint | undefined
}

export type FootprintInput = {
  points: readonly Point[]
  walls: readonly Wall[]
  /** Kuşbakışı gösterilecek kat; genelde zemin kat. */
  floorId: Id
  /** Servis kutusunun konumu (varsa). Sınırlara DAHİL edilir. */
  serviceBox: PlanPoint | undefined
}

/**
 * Bir katın kuşbakışı konturu: duvarlar tek çizgi olarak, artı servis kutusunun
 * konumu.
 *
 * Duvar KALINLIĞI yok sayılıyor — bu kontur vaziyet planına, parsel çerçevesinin
 * içine küçültülerek giriyor; o ölçekte kalınlık bir piksel bile etmez ve
 * kapsül geometrisini (K23) buraya taşımak boşuna karmaşa olurdu. Kat planı
 * sayfası duvarı zaten gerçek kalınlığıyla basıyor.
 *
 * Sınırlara servis kutusu da katılıyor: bina dışında, bahçe duvarında olabilir
 * ve kontur ona göre yerleşmezse kutu çerçevenin dışında kalır.
 */
export function getBuildingFootprint(input: FootprintInput): BuildingFootprint | undefined {
  const pointById = buildPointIndex(input.points)
  const segments: FootprintSegment[] = []
  const extent: PlanPoint[] = []

  for (const wall of input.walls) {
    if (wall.floorId !== input.floorId) continue

    const p1 = pointById.get(wall.p1Id)
    const p2 = pointById.get(wall.p2Id)
    if (!p1 || !p2) continue

    segments.push([
      { x: p1.x, y: p1.y },
      { x: p2.x, y: p2.y },
    ])
    extent.push({ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y })
  }

  if (input.serviceBox) extent.push(input.serviceBox)

  const bounds = getPlanBounds(extent)
  if (!bounds) return undefined

  return { segments, bounds, serviceBox: input.serviceBox }
}
