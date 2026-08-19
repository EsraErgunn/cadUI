import { beforeEach, describe, expect, it } from 'vitest'

import { addWall, resetEmpty, rooms } from './roomFixture'
import { findWallMoveBlocker } from '../architectureWallMoveValidity'
import { useCadStore } from '../cadStore'

/** Uçlarından duvarı bulur: bölme sonrası id'ler baştan bilinemez. */
function wallIdAt(x1: number, y1: number, x2: number, y2: number): number {
  const state = useCadStore.getState()
  const at = (id: number, x: number, y: number) => {
    const point = state.points.find((candidate) => candidate.id === id)
    return point !== undefined && point.x === x && point.y === y
  }
  const found = state.walls.find(
    (wall) =>
      (at(wall.p1Id, x1, y1) && at(wall.p2Id, x2, y2)) ||
      (at(wall.p1Id, x2, y2) && at(wall.p2Id, x1, y1)),
  )
  if (!found) throw new Error(`duvar yok: (${x1},${y1})-(${x2},${y2})`)
  return found.id
}

const chain = (pointId: number, x: number, y: number) =>
  useCadStore.getState().addWall({ start: { pointId }, end: { position: { x, y } } })!

/**
 * Yan yana iki oda; ortadaki bölme (400,300)-(400,0). Bölme üst ve alt kenarın
 * GÖVDESİNE bırakılıyor, K24 orada bölüyor — kullanıcının yaptığı da bu.
 *
 *   +--------+--------+   y = 300
 *   |        |        |
 *   +--------+--------+   y = 0
 */
function drawTwoRooms() {
  const bottom = addWall(0, 0, 800, 0)!
  const right = chain(bottom.p2Id, 800, 300)
  const top = chain(right.p2Id, 0, 300)
  useCadStore.getState().addWall({ start: { pointId: top.p2Id }, end: { pointId: bottom.p1Id } })
  useCadStore
    .getState()
    .addWall({ start: { position: { x: 400, y: 300 } }, end: { position: { x: 400, y: 0 } } })
}

const blocker = (wallId: number, dyCm: number, dxCm = 0) =>
  findWallMoveBlocker(useCadStore.getState(), wallId, dxCm, dyCm)

describe('findWallMoveBlocker', () => {
  beforeEach(resetEmpty)

  it('kurulum: iki oda ve ortada bölme', () => {
    drawTwoRooms()
    expect(rooms()).toHaveLength(2)
  })

  it('bölmenin gövdesine denk gelen taşıma GEÇERLİ', () => {
    drawTwoRooms()
    // Sol üst duvar 100 aşağı: köşesi bölmenin gövdesinde kalır, K24 orada T kurar.
    expect(blocker(wallIdAt(0, 300, 400, 300), -100)).toBeUndefined()
  })

  it('bölmenin ucunu geçen taşıma duvarı SERBEST bırakır', () => {
    drawTwoRooms()
    // 350 aşağı: köşe y = -50'ye iner, bölme y = 0'da bitiyor. Değecek gövde yok.
    expect(blocker(wallIdAt(0, 300, 400, 300), -350)).toBe('freeEnd')
  })

  it('komşu duvarın ÜSTÜNE oturan taşıma odayı öldürür, REDDEDİLİR', () => {
    drawTwoRooms()
    // Tam 300 aşağı: bölme sıfırlanır ve duvar alt duvarın üstüne biner —
    // sol odanın çevrimi kopar, dolgusuyla etiketiyle kaybolurdu.
    expect(blocker(wallIdAt(0, 300, 400, 300), -300)).toBe('roomLost')
  })

  it('yukarı taşıma serbest: komşular uzayarak izler', () => {
    drawTwoRooms()
    expect(blocker(wallIdAt(0, 300, 400, 300), 500)).toBeUndefined()
  })

  it('hareketsiz taşıma reddedilmez', () => {
    drawTwoRooms()
    expect(blocker(wallIdAt(0, 300, 400, 300), 0)).toBeUndefined()
  })

  it('ZATEN serbest duran duvarı taşımak yasak değil', () => {
    // Hiçbir şeye bağlı olmayan tek duvar: ucu önceden de serbestti.
    const only = addWall(0, 0, 400, 0)!
    expect(blocker(only.wallId, 100)).toBeUndefined()
  })
})
