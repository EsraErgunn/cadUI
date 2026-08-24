import { describe, expect, it } from 'vitest'

import type { Point, Room, Wall } from '../model'
import { buildLevelSlabs } from '../solidSlab'

const FLOOR_ID = 1
const BASE_CM = 300

/** Kapalı bir kare: dört köşe, dört duvar — tek bir yüz doğurur. */
const points: Point[] = [
  { id: 1, floorId: FLOOR_ID, x: 0, y: 0 },
  { id: 2, floorId: FLOOR_ID, x: 400, y: 0 },
  { id: 3, floorId: FLOOR_ID, x: 400, y: 400 },
  { id: 4, floorId: FLOOR_ID, x: 0, y: 400 },
]

const walls: Wall[] = [
  { id: 11, floorId: FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 },
  { id: 12, floorId: FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
  { id: 13, floorId: FLOOR_ID, p1Id: 3, p2Id: 4, thickness: 20, height: 280 },
  { id: 14, floorId: FLOOR_ID, p1Id: 4, p2Id: 1, thickness: 20, height: 280 },
]

describe('buildLevelSlabs', () => {
  it('kapalı çevrimi kat tabanına oturmuş üçgenlere çevirir', () => {
    const slabs = buildLevelSlabs(walls, points, [], FLOOR_ID, BASE_CM)

    expect(slabs).toHaveLength(1)
    expect(slabs[0].baseCm).toBe(BASE_CM)
    // Üçgenleme: köşe sayısı üçün katı ve en az bir üçgen var.
    expect(slabs[0].triangleCorners.length % 3).toBe(0)
    expect(slabs[0].triangleCorners.length).toBeGreaterThan(0)
  })

  it('mahalin kullanım tipini duvar KÜMESİNDEN eşleştirir', () => {
    // Duvar sırası bilerek karışık: kimlik sıraya değil kümeye bakıyor.
    const room: Room = { id: 20, wallIds: [13, 11, 14, 12], usageType: 'kitchen' }
    const slabs = buildLevelSlabs(walls, points, [room], FLOOR_ID, BASE_CM)

    expect(slabs[0].usageType).toBe('kitchen')
  })

  it('tipi verilmemiş mahali tipsiz bırakır — varsayılan UYDURMAZ', () => {
    const room: Room = { id: 20, wallIds: [11, 12, 13, 14] }
    const slabs = buildLevelSlabs(walls, points, [room], FLOOR_ID, BASE_CM)

    expect(slabs[0].usageType).toBeUndefined()
  })

  it('başka duvar kümesine ait mahalin tipini KULLANMAZ', () => {
    const room: Room = { id: 20, wallIds: [11, 12], usageType: 'bathroom' }
    const slabs = buildLevelSlabs(walls, points, [room], FLOOR_ID, BASE_CM)

    expect(slabs[0].usageType).toBeUndefined()
  })
})
