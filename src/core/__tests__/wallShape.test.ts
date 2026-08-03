import { describe, expect, it } from 'vitest'

import type { PlanPoint } from '../coords'
import type { Point, Wall } from '../model'
import { getWallCapsule } from '../wallShape'

const FLOOR_ID = 1

function makePoint(id: number, x: number, y: number): Point {
  return { id, floorId: FLOOR_ID, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, thickness: number): Wall {
  return { id, floorId: FLOOR_ID, p1Id, p2Id, thickness, height: 280 }
}

/** Noktanın kapsüle uzaklığı: eksene (doğru PARÇASINA) uzaklık − yarıçap. */
function getDistanceToCapsule(target: PlanPoint, capsule: NonNullable<ReturnType<typeof getWallCapsule>>) {
  const { p1, p2, radiusCm } = capsule
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const lengthSq = dx * dx + dy * dy
  const ratio = Math.min(1, Math.max(0, ((target.x - p1.x) * dx + (target.y - p1.y) * dy) / lengthSq))
  const closest = { x: p1.x + dx * ratio, y: p1.y + dy * ratio }

  return Math.hypot(target.x - closest.x, target.y - closest.y) - radiusCm
}

// Yatay duvar, 400 cm, kalınlık 20.
const points = [makePoint(1, 0, 0), makePoint(2, 400, 0), makePoint(3, 400, 300)]
const horizontal = makeWall(10, 1, 2, 20)

describe('getWallCapsule', () => {
  it('ekseni duvarın uçlarıdır, yarıçapı kalınlığın yarısıdır', () => {
    expect(getWallCapsule(horizontal, points)).toEqual({
      p1: { x: 0, y: 0 },
      p2: { x: 400, y: 0 },
      radiusCm: 10,
    })
  })

  it('ucu eksik duvarda undefined döner', () => {
    expect(getWallCapsule(makeWall(99, 1, 404, 20), points)).toBeUndefined()
  })

  it('sıfır boylu duvarda undefined döner', () => {
    const samePlace = [makePoint(1, 0, 0), makePoint(2, 0, 0)]
    expect(getWallCapsule(makeWall(10, 1, 2, 20), samePlace)).toBeUndefined()
  })
})

/**
 * Gönyeli dörtgende kalınlık dar açıda köşeye doğru büyüyordu; asıl şikâyet buydu.
 * Kapsülde kalınlık tanım gereği sabit: eksene dik uzaklık her yerde aynı.
 */
describe('getWallCapsule — kalınlık her yerde sabit', () => {
  it('komşu açısı ne olursa olsun kalınlık değişmez', () => {
    // 5°'lik çok dar köşe — gönye kurgusunda uç ~229 cm uzuyordu.
    const acutePoints = [
      makePoint(1, 0, 0),
      makePoint(2, 400, 0),
      makePoint(3, 400 * Math.cos(Math.PI / 36), 400 * Math.sin(Math.PI / 36)),
    ]
    const east = makeWall(10, 1, 2, 20)
    const sharp = makeWall(11, 1, 3, 20)

    expect(getWallCapsule(east, acutePoints)?.radiusCm).toBe(10)
    expect(getWallCapsule(sharp, acutePoints)?.radiusCm).toBe(10)
  })

  it('şekil komşulara bakmaz — duvar tek başınayken de aynıdır', () => {
    // Gönyeli kurguda bu iki çağrı FARKLI dörtgen döndürüyordu.
    const alone = getWallCapsule(horizontal, points)
    const withNeighbour = getWallCapsule(horizontal, [...points, makePoint(4, 400, -300)])

    expect(alone).toEqual(withNeighbour)
  })
})

/**
 * Asıl kazanç: yuvarlak uç, duvarın UÇ NOKTASINDA merkezli olduğu için o köşede
 * birleşen her duvar aynı diski doldurur. Kavşak kaç duvarlı olursa olsun
 * kapanır — gönyeli kurguda 3+ duvarda uç düz kesiliyor ve çentik kalıyordu.
 */
describe('getWallCapsule — kavşak boşluk bırakmaz', () => {
  const joint = { x: 0, y: 0 }
  // Tek köşede birleşen beş duvar (donma vakalarından biriydi).
  const fanPoints = [makePoint(1, joint.x, joint.y)]
  const fanWalls: Wall[] = []
  for (let index = 0; index < 5; index += 1) {
    const angleRad = (index * 2 * Math.PI) / 5
    fanPoints.push(makePoint(index + 2, Math.cos(angleRad) * 300, Math.sin(angleRad) * 300))
    fanWalls.push(makeWall(index + 10, 1, index + 2, 20))
  }

  it('kavşaktaki her duvar aynı diski kaplar', () => {
    // Ortak köşenin r yarıçaplı komşuluğundaki HER nokta her duvarın içinde.
    const radiusCm = 10
    for (const wall of fanWalls) {
      const capsule = getWallCapsule(wall, fanPoints)
      expect(capsule).toBeDefined()

      for (let index = 0; index < 16; index += 1) {
        const angleRad = (index * 2 * Math.PI) / 16
        const probe = {
          x: joint.x + Math.cos(angleRad) * radiusCm,
          y: joint.y + Math.sin(angleRad) * radiusCm,
        }
        expect(getDistanceToCapsule(probe, capsule!)).toBeLessThanOrEqual(1e-9)
      }
    }
  })

  it('duvarlar arası açı daraldıkça da boşluk açılmaz', () => {
    // İki duvar 1° arayla: gönyede kesişim uçup gidiyordu, kapsülde disk aynı.
    const tightPoints = [
      makePoint(1, 0, 0),
      makePoint(2, 300, 0),
      makePoint(3, 300 * Math.cos(Math.PI / 180), 300 * Math.sin(Math.PI / 180)),
    ]
    const first = getWallCapsule(makeWall(10, 1, 2, 20), tightPoints)!
    const second = getWallCapsule(makeWall(11, 1, 3, 20), tightPoints)!

    expect(getDistanceToCapsule({ x: 0, y: 9.9 }, first)).toBeLessThanOrEqual(0)
    expect(getDistanceToCapsule({ x: 0, y: -9.9 }, second)).toBeLessThanOrEqual(0)
  })
})
