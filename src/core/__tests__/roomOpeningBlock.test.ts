import { describe, expect, it } from 'vitest'

import type { Opening, Point, Wall } from '../model'
import { findBlockingOpeningInLoop } from '../room'

const FLOOR_ID = 1

function makePoint(id: number, x: number, y: number, floorId = FLOOR_ID): Point {
  return { id, floorId, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, floorId = FLOOR_ID): Wall {
  return { id, floorId, p1Id, p2Id, thickness: 20, height: 280 }
}

function makeOpening(id: number, wallId: number, offsetCm: number, widthCm: number): Opening {
  return { id, wallId, offsetCm, widthCm, type: 'door' }
}

describe('findBlockingOpeningInLoop', () => {
  it('dörtgenin bir kenarı mevcut bir kapının içinden GERÇEKTEN geçiyorsa reddeder', () => {
    // Var olan yatay duvar (0,0)-(600,0), kapı 250-350 aralığında.
    const wallPoints = [makePoint(1, 0, 0), makePoint(2, 600, 0)]
    const wall = makeWall(10, 1, 2)
    const door = makeOpening(20, 10, 300, 100)

    // Dikdörtgenin SOL kenarı (300,-100)-(300,300): yatay duvarın İKİ tarafına
    // da taşıyor, x=300 y=0 noktasında GERÇEKTEN kesiyor — köşede bitmiyor.
    const corners = [
      { x: 300, y: -100 },
      { x: 700, y: -100 },
      { x: 700, y: 300 },
      { x: 300, y: 300 },
    ]

    expect(findBlockingOpeningInLoop(corners, [wall], wallPoints, [door], FLOOR_ID)).toBe(door)
  })

  it('dörtgenin köşesi kapının ortasına DENK GELİRSE (T birleşimi) de reddeder', () => {
    // Dikdörtgen duvarın ÜSTÜNDEN başlıyor — kenar orada BİTİYOR, kapının
    // içinden geçmiyor ama İÇİNDE duruyor. Bir kapı boşluğunun ortasında duvar
    // ne başlayabilir ne bitebilir; T birleşimi de reddin dışında değil.
    const wallPoints = [makePoint(1, 0, 0), makePoint(2, 600, 0)]
    const wall = makeWall(10, 1, 2)
    const door = makeOpening(20, 10, 300, 100)

    const corners = [
      { x: 300, y: 0 },
      { x: 700, y: 0 },
      { x: 700, y: 300 },
      { x: 300, y: 300 },
    ]

    expect(findBlockingOpeningInLoop(corners, [wall], wallPoints, [door], FLOOR_ID)).toBe(door)
  })

  it('hiçbir kenar açıklığı kesmiyorsa undefined döner', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 300 },
      { x: 0, y: 300 },
    ]

    expect(findBlockingOpeningInLoop(corners, [], [], [], FLOOR_ID)).toBeUndefined()
  })
})
