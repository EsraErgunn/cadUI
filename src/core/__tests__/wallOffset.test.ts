import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../model'
import { planWallOffset } from '../wallOffset'

const FLOOR = 1

const point = (id: number, x: number, y: number): Point => ({ id, floorId: FLOOR, x, y })
const wall = (id: number, p1Id: number, p2Id: number): Wall => ({
  id,
  floorId: FLOOR,
  p1Id,
  p2Id,
  thickness: 20,
  height: 280,
})

/**
 * Dik açılı oda: üst duvar 10, yan duvarlar dikey.
 *
 *   1------2   y = 300
 *   |      |
 *   3------4   y = 0
 */
function rectangle() {
  return {
    points: [point(1, 0, 300), point(2, 400, 300), point(3, 0, 0), point(4, 400, 0)],
    walls: [wall(10, 1, 2), wall(11, 1, 3), wall(12, 2, 4), wall(13, 3, 4)],
  }
}

/**
 * Yamuk: üst duvar 10 yatay, yan kenarlar EĞİK.
 *
 *      1--------2      (200,400) - (600,400)
 *     /          \
 *    3------------4    (0,0) - (800,0)
 */
function trapezoid() {
  return {
    points: [point(1, 200, 400), point(2, 600, 400), point(3, 0, 0), point(4, 800, 0)],
    walls: [wall(10, 1, 2), wall(11, 1, 3), wall(12, 2, 4), wall(13, 3, 4)],
  }
}

describe('planWallOffset — dik açılı plan', () => {
  it('eski katı ötelemeyle BİREBİR aynı sonuç', () => {
    const { walls, points } = rectangle()

    const plan = planWallOffset(walls, points, 10, 0, -100, FLOOR)!

    expect(plan.p1).toEqual({ x: 0, y: 200 })
    expect(plan.p2).toEqual({ x: 400, y: 200 })
    // Dikey komşular harekete paralel: kimse kopmaz.
    expect(plan.detachments).toEqual([])
  })

  it('duvarın boyu DEĞİŞMEZ', () => {
    const { walls, points } = rectangle()

    const plan = planWallOffset(walls, points, 10, 0, 250, FLOOR)!

    expect(Math.hypot(plan.p2.x - plan.p1.x, plan.p2.y - plan.p1.y)).toBeCloseTo(400)
  })

  it('eksen boyunca sürüklemek PLAN ÜRETMEZ', () => {
    const { walls, points } = rectangle()

    // Yatay duvarı yana çekmek: normale izdüşümü sıfır, yapacak iş yok.
    expect(planWallOffset(walls, points, 10, 300, 0, FLOOR)).toBeUndefined()
  })
})

describe('planWallOffset — eğik plan', () => {
  it('yatay duvarın uçları EĞİK komşuların doğrusuna oturur', () => {
    const { walls, points } = trapezoid()

    // Üst duvarı 200 aşağı indir: y = 200.
    const plan = planWallOffset(walls, points, 10, 0, -200, FLOOR)!

    // Sol kenar (200,400)-(0,0): y=200'de x = 100. Sağ kenar (600,400)-(800,0): x = 700.
    expect(plan.p1.y).toBeCloseTo(200)
    expect(plan.p2.y).toBeCloseTo(200)
    expect(plan.p1.x).toBeCloseTo(100)
    expect(plan.p2.x).toBeCloseTo(700)
  })

  it('aşağı inen duvar UZAR — komşular açısını korur', () => {
    const { walls, points } = trapezoid()

    const plan = planWallOffset(walls, points, 10, 0, -200, FLOOR)!

    // 400 iken 600 oldu: yamuk aşağı doğru genişliyor.
    expect(Math.hypot(plan.p2.x - plan.p1.x, plan.p2.y - plan.p1.y)).toBeCloseTo(600)
  })

  it('eğik komşular KOPMAZ — kesişimleri var', () => {
    const { walls, points } = trapezoid()

    const plan = planWallOffset(walls, points, 10, 0, -200, FLOOR)

    expect(plan!.detachments).toEqual([])
  })

  it('EĞİK duvarın kendisi de taşınabilir', () => {
    const { walls, points } = trapezoid()

    // Sol eğik kenarı (11) kendi normali boyunca kaydır.
    const plan = planWallOffset(walls, points, 11, -50, 0, FLOOR)!

    // Üst ucu üst duvarın (y=400) doğrusunda, alt ucu alt duvarın (y=0) doğrusunda kalmalı.
    expect(plan.p1.y).toBeCloseTo(400)
    expect(plan.p2.y).toBeCloseTo(0)
    expect(plan.detachments).toEqual([])
  })
})

describe('planWallOffset — kopma', () => {
  it('taşınan duvara PARALEL komşu kopar', () => {
    // Kolineer devam: 10 ve 11 aynı doğrultuda, ortak köşe 2.
    const points = [point(1, 0, 300), point(2, 400, 300), point(3, 800, 300), point(4, 400, 0)]
    const walls = [wall(10, 1, 2), wall(11, 2, 3), wall(12, 2, 4)]

    const plan = planWallOffset(walls, points, 10, 0, -100, FLOOR)!

    // 11 paralel: kesişimi yok, kopar. 12 dikey ve KISALIYOR — köşede kopan
    // biri olduğu için o da yerinde bırakılır, yoksa 11'i havada bırakırdı.
    expect(plan.detachments).toEqual([{ pointId: 2, wallIds: [11, 12] }])
    expect(plan.p2).toEqual({ x: 400, y: 200 })
  })

  it('komşusuz uç yalnızca ötelenir', () => {
    const points = [point(1, 0, 300), point(2, 400, 300)]
    const walls = [wall(10, 1, 2)]

    const plan = planWallOffset(walls, points, 10, 0, -100, FLOOR)!

    expect(plan.p1).toEqual({ x: 0, y: 200 })
    expect(plan.p2).toEqual({ x: 400, y: 200 })
    expect(plan.detachments).toEqual([])
  })
})
