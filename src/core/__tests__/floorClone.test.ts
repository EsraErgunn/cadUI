import { describe, expect, it } from 'vitest'

import { cloneFloorArchitecture, isFloorEmpty, type FloorCloneSource } from '../floorClone'
import type { Opening, Point, PointSymbol, Room, Wall } from '../model'

const GROUND = 1
const UPPER = 14

// Zemin katta kapalı bir kare + üstünde kapı + bir oda + iki sembol.
const points: Point[] = [
  { id: 2, floorId: GROUND, x: 0, y: 0 },
  { id: 3, floorId: GROUND, x: 500, y: 0 },
  { id: 4, floorId: GROUND, x: 500, y: 400 },
  { id: 5, floorId: GROUND, x: 0, y: 400 },
  // Üst katta ilgisiz bir nokta: kopyaya karışmamalı.
  { id: 90, floorId: UPPER, x: 999, y: 999 },
]

const walls: Wall[] = [
  { id: 6, floorId: GROUND, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
  { id: 7, floorId: GROUND, p1Id: 3, p2Id: 4, thickness: 20, height: 280 },
  { id: 8, floorId: GROUND, p1Id: 4, p2Id: 5, thickness: 20, height: 280 },
  { id: 9, floorId: GROUND, p1Id: 5, p2Id: 2, thickness: 30, height: 280 },
]

const openings: Opening[] = [
  { id: 10, wallId: 6, offsetCm: 250, widthCm: 90, type: 'door' },
]

const rooms: Room[] = [{ id: 11, wallIds: [6, 7, 8, 9], name: 'Salon' }]

const symbols: PointSymbol[] = [
  { id: 12, floorId: GROUND, type: 'panel', x: 100, y: 100, rotationDeg: 0, label: 'P-01', note: 'a' },
  { id: 13, floorId: GROUND, type: 'panel', x: 300, y: 100, rotationDeg: 90, label: 'P-02', note: '' },
]

const source: FloorCloneSource = { points, walls, openings, rooms, symbols }

function makeTakeId(start = 100) {
  let next = start
  return () => next++
}

describe('isFloorEmpty', () => {
  it('çizimi olan kat boş değildir', () => {
    expect(isFloorEmpty(source, GROUND)).toBe(false)
  })

  it('yalnız ilgisiz noktası olan kat boş DEĞİLDİR', () => {
    expect(isFloorEmpty(source, UPPER)).toBe(false)
  })

  it('hiç içeriği olmayan kat boştur', () => {
    expect(isFloorEmpty(source, 999)).toBe(true)
  })
})

describe('cloneFloorArchitecture', () => {
  it('kaynağın nokta, duvar, açıklık, oda ve sembollerini kopyalar', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())

    expect(clone.points).toHaveLength(4)
    expect(clone.walls).toHaveLength(4)
    expect(clone.openings).toHaveLength(1)
    expect(clone.rooms).toHaveLength(1)
    expect(clone.symbols).toHaveLength(2)
  })

  it('başka katın nesnesini kopyalamaz', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())

    expect(clone.points.every((point) => point.x !== 999)).toBe(true)
  })

  it('her nesne YENİ id alır', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())
    const sourceIds = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])

    const cloneIds = [
      ...clone.points.map((item) => item.id),
      ...clone.walls.map((item) => item.id),
      ...clone.openings.map((item) => item.id),
      ...clone.rooms.map((item) => item.id),
      ...clone.symbols.map((item) => item.id),
    ]
    expect(cloneIds.some((id) => sourceIds.has(id))).toBe(false)
    // Hepsi birbirinden de farklı.
    expect(new Set(cloneIds).size).toBe(cloneIds.length)
  })

  it('kopya hedef kata yazılır', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())

    expect(clone.points.every((point) => point.floorId === UPPER)).toBe(true)
    expect(clone.walls.every((wall) => wall.floorId === UPPER)).toBe(true)
    expect(clone.symbols.every((symbol) => symbol.floorId === UPPER)).toBe(true)
  })

  it('duvar uçları KOPYA köşelere bağlanır, kaynağınkine değil', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())
    const clonePointIds = new Set(clone.points.map((point) => point.id))

    for (const wall of clone.walls) {
      expect(clonePointIds.has(wall.p1Id)).toBe(true)
      expect(clonePointIds.has(wall.p2Id)).toBe(true)
    }
  })

  it('açıklık KOPYA duvara bağlanır — floor-clone.md"deki sessiz tuzak', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())
    const cloneWallIds = new Set(clone.walls.map((wall) => wall.id))

    expect(cloneWallIds.has(clone.openings[0].wallId)).toBe(true)
  })

  it('odanın duvar kümesi de remap edilir', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())
    const cloneWallIds = new Set(clone.walls.map((wall) => wall.id))

    expect(clone.rooms[0].wallIds).toHaveLength(4)
    expect(clone.rooms[0].wallIds.every((wallId) => cloneWallIds.has(wallId))).toBe(true)
  })

  it('oda adı korunur', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())

    expect(clone.rooms[0].name).toBe('Salon')
  })

  it('paylaşılan köşe kopyada TEK noktaya düşer — çevrim kapalı kalır', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())

    // Kare: dört duvar dört köşeyi paylaşıyor, kopyada da dört nokta olmalı.
    expect(clone.points).toHaveLength(4)
    const zincir = clone.walls.map((wall) => wall.p1Id)
    expect(new Set(zincir).size).toBe(4)
  })

  it('sembol geometrisi ve notu korunur, etiket YENİDEN üretilir', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())

    expect(clone.symbols[0]).toMatchObject({ x: 100, y: 100, rotationDeg: 0, note: 'a' })
    expect(clone.symbols[1]).toMatchObject({ x: 300, y: 100, rotationDeg: 90 })
    expect(clone.symbols.map((symbol) => symbol.label)).toEqual(['P-01', 'P-02'])
  })

  it('iki sembol AYNI etiketi almaz', () => {
    const clone = cloneFloorArchitecture(source, GROUND, UPPER, makeTakeId())
    const labels = clone.symbols.map((symbol) => symbol.label)

    expect(new Set(labels).size).toBe(labels.length)
  })

  it('boş kat kopyalanınca boş sonuç döner', () => {
    const clone = cloneFloorArchitecture(source, 999, UPPER, makeTakeId())

    expect(clone.points).toHaveLength(0)
    expect(clone.walls).toHaveLength(0)
  })
})
