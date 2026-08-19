import { beforeEach, describe, expect, it } from 'vitest'

import { addWall, resetEmpty, rooms } from './roomFixture'
import { getSegmentLength } from '../../core/wall'
import { findWallMoveBlocker } from '../architectureWallMoveValidity'
import { useCadStore } from '../cadStore'

/**
 * Çıkıntılı plan: ana dikdörtgen y = 0..400, ortadaki X odası y = 600'e taşıyor.
 * Y | X | Z üç oda, X'in üstü 200 cm yukarıda.
 *
 *              +-----+  y = 600
 *              |  X  |
 *   +----+-----+-----+----+  y = 400
 *   | Y  |     |     | Z  |
 *   +----+-----+-----+----+  y = 0
 *
 * X'in üst duvarını 200 aşağı almak onu ana üst kenarla AYNI HİZAYA getirir.
 * Bu sırada X'i yukarı taşıyan iki çıkıntı duvarı sıfır boya iner — eskiden
 * `collapse` sayılıp reddediliyordu, oysa kaynatma onları temizliyor ve çizim
 * düzgün kalıyor. Kullanıcı duvarı hizaya oturtamıyordu (K107).
 */
function drawProtrudingPlan() {
  // Zincirde pointId DEVREDİLİR: aynı koordinatta ikinci bir Point üretmek
  // grafı sessizce koparır ve oda çevrimi hiç kapanmaz.
  const chain = (pointId: number, x: number, y: number) =>
    useCadStore.getState().addWall({ start: { pointId }, end: { position: { x, y } } })!
  const join = (fromPointId: number, toPointId: number) =>
    useCadStore.getState().addWall({ start: { pointId: fromPointId }, end: { pointId: toPointId } })!

  const bottomLeft = addWall(0, 0, 350, 0)!
  const bottomMid = chain(bottomLeft.p2Id, 550, 0)
  const bottomRight = chain(bottomMid.p2Id, 900, 0)
  const right = chain(bottomRight.p2Id, 900, 400)
  const topRight = chain(right.p2Id, 550, 400)
  const rightSpur = chain(topRight.p2Id, 550, 600)
  const top = chain(rightSpur.p2Id, 350, 600)
  const leftSpur = chain(top.p2Id, 350, 400)
  const topLeft = chain(leftSpur.p2Id, 0, 400)
  join(topLeft.p2Id, bottomLeft.p1Id)
  // Y|X ve X|Z ayıraçları
  join(bottomLeft.p2Id, leftSpur.p2Id)
  join(bottomMid.p2Id, topRight.p2Id)

  return { topWallId: top.wallId }
}

const shortWallCount = () => {
  const state = useCadStore.getState()
  const byId = new Map(state.points.map((point) => [point.id, point]))
  return state.walls.filter((wall) => {
    const p1 = byId.get(wall.p1Id)
    const p2 = byId.get(wall.p2Id)
    return p1 !== undefined && p2 !== undefined && getSegmentLength(p1, p2) < 1
  }).length
}

describe('çıkıntıyı komşu hizasına oturtma (K107)', () => {
  beforeEach(resetEmpty)

  it('kurulum: üç oda ve 200 cm çıkıntı', () => {
    drawProtrudingPlan()
    expect(rooms()).toHaveLength(3)
    expect(Math.max(...useCadStore.getState().points.map((point) => point.y))).toBe(600)
  })

  it('TAM hizaya oturtmak geçerli', () => {
    const { topWallId } = drawProtrudingPlan()
    expect(findWallMoveBlocker(useCadStore.getState(), topWallId, 0, -200)).toBeUndefined()
  })

  it('hizanın hemen berisi de geçerli: ölü bant yok', () => {
    const { topWallId } = drawProtrudingPlan()
    expect(findWallMoveBlocker(useCadStore.getState(), topWallId, 0, -199)).toBeUndefined()
  })

  it('hizaya oturunca çıkıntı temizlenir, üç oda da yaşar', () => {
    const { topWallId } = drawProtrudingPlan()
    useCadStore.getState().offsetWall(topWallId, 0, -200)

    expect(rooms()).toHaveLength(3)
    expect(shortWallCount()).toBe(0)
    // Çıkıntı gitti: artık en yüksek nokta ana üst kenar.
    expect(Math.max(...useCadStore.getState().points.map((point) => point.y))).toBe(400)
  })
})

/*
 * Kaydırılmış iki oda; PAYLAŞILAN duvar y = 250'de x = 100..350 arası.
 *
 *        +---------------+  y = 550
 *        |    üst oda    |
 *   +----+=====+---------+  y = 250   (=== paylaşılan duvar)
 *   | alt oda  |
 *   +----------+             y = 0
 *   0   100   350          500
 */
function drawSharedWallPlan() {
  const chain = (pointId: number, x: number, y: number) =>
    useCadStore.getState().addWall({ start: { pointId }, end: { position: { x, y } } })!
  const join = (fromPointId: number, toPointId: number) =>
    useCadStore.getState().addWall({ start: { pointId: fromPointId }, end: { pointId: toPointId } })!

  const bottom = addWall(0, 0, 350, 0)!
  const bottomRight = chain(bottom.p2Id, 350, 250)
  const shared = chain(bottomRight.p2Id, 100, 250)
  const bottomTopLeft = chain(shared.p2Id, 0, 250)
  join(bottomTopLeft.p2Id, bottom.p1Id)
  const topBottomRight = chain(bottomRight.p2Id, 500, 250)
  const topRight = chain(topBottomRight.p2Id, 500, 550)
  const topTop = chain(topRight.p2Id, 100, 550)
  join(topTop.p2Id, shared.p2Id)

  return { sharedWallId: shared.wallId }
}

describe('paylaşılan duvarı taşıma (K107)', () => {
  beforeEach(resetEmpty)

  it('kurulum: iki oda ortak bir duvarı paylaşır', () => {
    drawSharedWallPlan()
    expect(rooms()).toHaveLength(2)
  })

  it('paylaşılan duvar HER İKİ yöne de taşınabilir', () => {
    const { sharedWallId } = drawSharedWallPlan()
    const state = useCadStore.getState()
    expect(findWallMoveBlocker(state, sharedWallId, 0, 50)).toBeUndefined()
    expect(findWallMoveBlocker(state, sharedWallId, 0, -50)).toBeUndefined()
  })

  it('taşındıktan sonra iki oda da yaşar — kimliği değişse bile', () => {
    const { sharedWallId } = drawSharedWallPlan()
    // ⚠️ Oda id'si burada DEĞİŞİR: duvar kümesi yeterince oynadığı için K106'nın
    // eşleştirmesi tutmuyor. Denetim bu yüzden kimliğe değil SAYIYA bakar.
    useCadStore.getState().offsetWall(sharedWallId, 0, 50)
    expect(rooms()).toHaveLength(2)
    expect(shortWallCount()).toBe(0)
  })
})
