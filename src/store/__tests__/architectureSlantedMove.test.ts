import { beforeEach, describe, expect, it } from 'vitest'

import { addWall, resetEmpty, rooms } from './roomFixture'
import { findRoomFaces } from '../../core/room'
import { useCadStore } from '../cadStore'

/**
 * Yamuk oda — yan kenarlar EĞİK:
 *
 *      (200,400)----(600,400)
 *         /              \
 *    (0,0)----------------(800,0)
 *
 * Eski KATI öteleme modelinde bu planda hiçbir duvar hiçbir yöne taşınamıyordu:
 * komşular hareket yönüne paralel olmadığı için hepsi kopuyor, köşe hiçbir
 * gövdeye denk gelmiyordu (K103 düzeltmesi).
 */
function drawTrapezoid() {
  const chain = (pointId: number, x: number, y: number) =>
    useCadStore.getState().addWall({ start: { pointId }, end: { position: { x, y } } })!

  const bottom = addWall(0, 0, 800, 0)!
  const rightSlant = chain(bottom.p2Id, 600, 400)
  const top = chain(rightSlant.p2Id, 200, 400)
  const leftSlant = useCadStore
    .getState()
    .addWall({ start: { pointId: top.p2Id }, end: { pointId: bottom.p1Id } })!

  return { bottom, rightSlant, top, leftSlant }
}

function wallEnds(wallId: number) {
  const state = useCadStore.getState()
  const wall = state.walls.find((candidate) => candidate.id === wallId)
  if (!wall) throw new Error(`duvar yok: ${wallId}`)
  const read = (pointId: number) => {
    const point = state.points.find((candidate) => candidate.id === pointId)
    if (!point) throw new Error(`nokta yok: ${pointId}`)
    return { x: point.x, y: point.y }
  }
  return { p1: read(wall.p1Id), p2: read(wall.p2Id) }
}

function area() {
  const state = useCadStore.getState()
  return findRoomFaces(state.walls, state.points, state.activeFloorId)[0]?.areaCm2
}

describe('eğik duvarlı planda taşıma (K103)', () => {
  beforeEach(resetEmpty)

  it('kurulum: tek yamuk oda', () => {
    drawTrapezoid()

    expect(rooms()).toHaveLength(1)
    // Yamuk alanı: (400 + 800) / 2 * 400
    expect(area()).toBeCloseTo(240_000)
  })

  it('YATAY duvar eğik komşular arasında taşınır — kopma yok', () => {
    const { top } = drawTrapezoid()
    const pointsBefore = useCadStore.getState().points.length

    useCadStore.getState().offsetWall(top.wallId, 0, -200)

    const ends = wallEnds(top.wallId)
    expect(ends.p1.y).toBeCloseTo(200)
    expect(ends.p2.y).toBeCloseTo(200)
    // Uçlar eğik kenarların DOĞRUSUNA oturdu: y=200'de x = 100 ve 700.
    expect([ends.p1.x, ends.p2.x].sort((a, b) => a - b)).toEqual([100, 700])
    // Hiçbir köşe kopmadı: yeni nokta doğmadı.
    expect(useCadStore.getState().points.length).toBe(pointsBefore)
    expect(rooms()).toHaveLength(1)
  })

  it('taşınan duvar UZAR, komşuların açısı korunur', () => {
    const { top, leftSlant, rightSlant } = drawTrapezoid()
    const slantAngle = (wallId: number) => {
      const { p1, p2 } = wallEnds(wallId)
      return Math.atan2(p2.y - p1.y, p2.x - p1.x)
    }
    const leftBefore = slantAngle(leftSlant.wallId)
    const rightBefore = slantAngle(rightSlant.wallId)

    useCadStore.getState().offsetWall(top.wallId, 0, -200)

    const ends = wallEnds(top.wallId)
    expect(Math.hypot(ends.p2.x - ends.p1.x, ends.p2.y - ends.p1.y)).toBeCloseTo(600)
    expect(slantAngle(leftSlant.wallId)).toBeCloseTo(leftBefore)
    expect(slantAngle(rightSlant.wallId)).toBeCloseTo(rightBefore)
  })

  it('EĞİK duvarın kendisi de taşınır', () => {
    const { leftSlant } = drawTrapezoid()
    const pointsBefore = useCadStore.getState().points.length

    useCadStore.getState().offsetWall(leftSlant.wallId, -50, 0)

    // Uçları üst (y=400) ve alt (y=0) duvarların doğrusunda kaldı.
    const ends = wallEnds(leftSlant.wallId)
    expect([ends.p1.y, ends.p2.y].sort((a, b) => a - b)).toEqual([0, 400])
    expect(useCadStore.getState().points.length).toBe(pointsBefore)
    expect(rooms()).toHaveLength(1)
  })

  it('oda adı korunur', () => {
    const { top } = drawTrapezoid()
    useCadStore.setState({
      rooms: useCadStore.getState().rooms.map((room) => ({ ...room, name: 'Salon' })),
    })

    useCadStore.getState().offsetWall(top.wallId, 0, -200)

    expect(rooms().map((room) => room.name)).toEqual(['Salon'])
  })
})
