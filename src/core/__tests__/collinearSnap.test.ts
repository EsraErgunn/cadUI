import { describe, expect, it } from 'vitest'

import { getCollinearGuide } from '../collinearGuide'
import type { Point, Wall } from '../model'
import { resolveSnap } from '../snap'

const FLOOR_ID = 1
const JOINT = 3

function makePoint(id: number, x: number, y: number, floorId = FLOOR_ID): Point {
  return { id, floorId, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, floorId = FLOOR_ID): Wall {
  return { id, floorId, p1Id, p2Id, thickness: 20, height: 280 }
}

/**
 * EĞİK bir duvar, ortasında düğüm: (0,0) → (300,400). Ortadaki düğüm doğrudan
 * saptırılmış. Eksen hizalı bir kurulum bu hatayı gizlerdi — kullanıcı
 * bildirimi tam olarak eğik duvarlardaydı.
 */
function seedBentDiagonal(offX: number, offY: number) {
  return {
    points: [makePoint(1, 0, 0), makePoint(JOINT, 150 + offX, 200 + offY), makePoint(2, 300, 400)],
    walls: [makeWall(10, 1, JOINT), makeWall(11, JOINT, 2)],
  }
}

const OPTIONS = {
  toleranceCm: 10,
  gridStepCm: 25,
  isGridSnapEnabled: true,
}

describe('getCollinearGuide', () => {
  it('iki duvarlı köşede komşuların doğrusunu verir', () => {
    const { points, walls } = seedBentDiagonal(20, -20)

    expect(getCollinearGuide(JOINT, walls, points, FLOOR_ID)).toEqual({
      from: { x: 0, y: 0 },
      to: { x: 300, y: 400 },
    })
  })

  it('ÜÇ duvarlı köşede kılavuz YOK', () => {
    // Hangi ikisinin hizalanacağı belirsiz; seçilen ikisi hizalanırken üçüncüsü
    // rastgele bir açıya düşerdi.
    const { points, walls } = seedBentDiagonal(0, 0)
    const withThird = [...walls, makeWall(12, JOINT, 4)]
    const morePoints = [...points, makePoint(4, 400, 0)]

    expect(getCollinearGuide(JOINT, withThird, morePoints, FLOOR_ID)).toBeUndefined()
  })

  it('duvarın UCUNDA kılavuz YOK: hizalanacak ikinci kol yok', () => {
    const { points, walls } = seedBentDiagonal(0, 0)
    expect(getCollinearGuide(1, walls, points, FLOOR_ID)).toBeUndefined()
  })

  it('BAŞKA kattaki duvarlar sayılmaz', () => {
    const { points, walls } = seedBentDiagonal(0, 0)
    expect(getCollinearGuide(JOINT, walls, points, 2)).toBeUndefined()
  })

  it('iki komşu AYNI noktadaysa kılavuz YOK', () => {
    // Sıfır boylu kılavuz yakalamayı her yere yapıştırırdı.
    const points = [makePoint(1, 0, 0), makePoint(JOINT, 50, 50), makePoint(2, 0, 0)]
    const walls = [makeWall(10, 1, JOINT), makeWall(11, JOINT, 2)]

    expect(getCollinearGuide(JOINT, walls, points, FLOOR_ID)).toBeUndefined()
  })
})

describe('resolveSnap — 180° yakalaması', () => {
  const { points, walls } = seedBentDiagonal(0, 0)
  // Sürükleme aracı sürüklenen köşeyi aday listesinden ÇIKARIYOR
  // (`usePointDragTool`); yoksa köşe kendi kendine yapışır. Test gerçek çağrıyı
  // yansıtmalı — ilk kurulumda çıkarılmamıştı ve yakalama hep 'point' dönüyordu.
  const context = {
    points: points.filter((point) => point.id !== JOINT),
    walls,
    floorId: FLOOR_ID,
  }
  const guide = { from: { x: 0, y: 0 }, to: { x: 300, y: 400 } }

  it('doğruya yakın imleci doğrunun ÜSTÜNE çeker', () => {
    // (150,200) doğrunun tam üstünde; imleç 5 cm sapmış.
    const result = resolveSnap({ x: 154, y: 197 }, context, { ...OPTIONS, collinearGuide: guide })

    expect(result.kind).toBe('collinear')
    // Doğru üzerinde: 4x − 3y = 0.
    expect(result.point.x * 4 - result.point.y * 3).toBeCloseTo(0, 6)
  })

  it('IZGARAYI yener: eğik duvarda asıl sorun buydu', () => {
    // Izgara açık ve adımı 25 cm; ızgara noktaları eğik doğruyla çakışmıyor.
    // Yakalama ızgaraya düşseydi köşe bir daha hiç düzleşmezdi.
    const result = resolveSnap({ x: 154, y: 197 }, context, { ...OPTIONS, collinearGuide: guide })
    expect(result.kind).toBe('collinear')
  })

  it('kılavuz VERİLMEZSE eski davranış: ızgaraya düşer', () => {
    // Ctrl basılıyken çağıran kılavuzu hiç göndermiyor.
    const result = resolveSnap({ x: 154, y: 197 }, context, OPTIONS)
    expect(result.kind).not.toBe('collinear')
  })

  it('TOLERANS dışındaki imleci çekmez', () => {
    const result = resolveSnap({ x: 220, y: 150 }, context, { ...OPTIONS, collinearGuide: guide })
    expect(result.kind).not.toBe('collinear')
  })

  it('komşuların DIŞINA düşen izdüşümü kabul etmez', () => {
    // Doğru üzerinde ama komşuların arasında değil: orada açı 180° değil 0°,
    // iki kol aynı yöne katlanır. Yakalamak, kullanıcıyı düzleştirdiğini
    // sanırken duvarı katlamış hâle getirirdi.
    const result = resolveSnap({ x: -60, y: -80 }, context, { ...OPTIONS, collinearGuide: guide })
    expect(result.kind).not.toBe('collinear')
  })

  it('gerçek bir KÖŞEYE yapışmak 180°den önce gelir', () => {
    // Aynı yerde ikinci bir Point doğarsa graf kopar; kaynak öncelikli.
    // (0,0) komşusu doğrunun DA üstünde: ikisi yarışıyor, köşe kazanmalı.
    const result = resolveSnap({ x: 2, y: 1 }, context, { ...OPTIONS, collinearGuide: guide })
    expect(result.kind).toBe('point')
  })
})
