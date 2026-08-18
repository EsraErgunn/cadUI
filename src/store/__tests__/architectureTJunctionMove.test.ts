import { beforeEach, describe, expect, it } from 'vitest'

import { addWall, resetEmpty } from './roomFixture'
import { findWallMoveBlocker } from '../../core/wallMoveValidity'
import { useCadStore } from '../cadStore'

/**
 * Üç kollu kavşak (T): ortak köşe (400,200).
 *
 *              (400,500)
 *                  |
 *   (100,200) ---- + ---- yok
 *                  |
 *              (400,0)
 *
 * Kollardan herhangi birini kendi normali boyunca taşımak GEÇERLİ olmalı: ortak
 * köşe kalan kolların doğrusunda kayar, kimse serbest kalmaz (K102).
 */
function drawTJunction() {
  const chain = (pointId: number, x: number, y: number) =>
    useCadStore.getState().addWall({ start: { pointId }, end: { position: { x, y } } })!

  const down = addWall(400, 0, 400, 200)!
  const up = chain(down.p2Id, 400, 500)
  const arm = chain(down.p2Id, 100, 200)

  return { down, up, arm }
}

function blocker(wallId: number, dxCm: number, dyCm: number) {
  const state = useCadStore.getState()
  return findWallMoveBlocker(state.walls, state.points, wallId, dxCm, dyCm, state.activeFloorId)
}

describe('T kavşağında duvar taşıma (K102)', () => {
  beforeEach(resetEmpty)

  it('kurulum: üç kol ortak köşeyi paylaşır', () => {
    drawTJunction()

    const state = useCadStore.getState()
    expect(state.walls).toHaveLength(3)
    // Ortak köşe TEK nokta: aynı yerde iki nokta grafı kopuk bırakırdı (K24).
    expect(state.points).toHaveLength(4)
  })

  it('YATAY kol her iki yöne taşınabilir', () => {
    const { arm } = drawTJunction()

    expect(blocker(arm.wallId, 0, 100)).toBeUndefined()
    expect(blocker(arm.wallId, 0, -100)).toBeUndefined()
  })

  it('ALT dikey kol her iki yöne taşınabilir', () => {
    const { down } = drawTJunction()

    expect(blocker(down.wallId, 100, 0)).toBeUndefined()
    expect(blocker(down.wallId, -100, 0)).toBeUndefined()
  })

  it('ÜST dikey kol her iki yöne taşınabilir', () => {
    const { up } = drawTJunction()

    expect(blocker(up.wallId, 100, 0)).toBeUndefined()
    expect(blocker(up.wallId, -100, 0)).toBeUndefined()
  })

  it('yatay kol taşınınca dikey kollar ortak köşede kalır', () => {
    const { down, up, arm } = drawTJunction()

    useCadStore.getState().offsetWall(arm.wallId, 0, 100)

    const state = useCadStore.getState()
    const endsOf = (wallId: number) => {
      const wall = state.walls.find((candidate) => candidate.id === wallId)!
      const read = (pointId: number) => state.points.find((point) => point.id === pointId)!
      return [read(wall.p1Id), read(wall.p2Id)]
    }
    // Kol y=300'e çıktı; iki dikey kol da o noktada buluşmalı.
    expect(endsOf(arm.wallId).map((point) => point.y)).toEqual([300, 300])
    expect(endsOf(down.wallId).map((point) => point.y).sort((a, b) => a - b)).toEqual([0, 300])
    expect(endsOf(up.wallId).map((point) => point.y).sort((a, b) => a - b)).toEqual([300, 500])
  })
})
