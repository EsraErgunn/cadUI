import { describe, expect, it } from 'vitest'

import { getAreaObjectPlanGeometry } from '../areaObjectGeometry'
import type { AreaObject } from '../model'

const FLOOR_ID = 1

function makeAreaObject(overrides: Partial<AreaObject> = {}): AreaObject {
  return {
    id: 1,
    type: 'structuralColumn',
    floorId: FLOOR_ID,
    x: 0,
    y: 0,
    widthCm: 20,
    lengthCm: 40,
    angleDeg: 0,
    label: 'K-01',
    ...overrides,
  }
}

describe('getAreaObjectPlanGeometry', () => {
  it('kolon: yalnız dış hat, ayrıntı yok, dolgu YOK (içi şeffaf)', () => {
    const geometry = getAreaObjectPlanGeometry(
      'structuralColumn',
      makeAreaObject({ x: 0, y: 0, widthCm: 100, lengthCm: 100, angleDeg: 0 }),
    )

    expect(geometry.strokes.map((stroke) => stroke.name)).toEqual(['outline'])
    expect(geometry).not.toHaveProperty('fills')
  })

  it('baca şaftı: dış hat + iç çember, kareye yakın yarıçapta, İKİSİ DE gövde kalınlığında', () => {
    const geometry = getAreaObjectPlanGeometry(
      'flueShaft',
      makeAreaObject({ x: 0, y: 0, widthCm: 40, lengthCm: 40, angleDeg: 0 }),
    )

    const circle = geometry.strokes.find((stroke) => stroke.name === 'circle')
    expect(circle).toBeDefined()
    // Kullanıcı çemberi karenin dış hattıyla AYNI kalınlıkta istedi (ince ayrıntı değil).
    expect(circle!.role).toBe('body')
    // Çemberin en uzak noktası kareyi taşmamalı (yarıçap < yarım kenar).
    const maxDistance = Math.max(...circle!.points.map((point) => Math.hypot(point.x, point.y)))
    expect(maxDistance).toBeLessThan(20)
    expect(maxDistance).toBeGreaterThan(15)
  })

  it('merdiven: basamak çizgileri ve iniş oku (ince çizgi) üretir', () => {
    const geometry = getAreaObjectPlanGeometry(
      'stairs',
      makeAreaObject({ x: 0, y: 0, widthCm: 120, lengthCm: 200, angleDeg: 0 }),
    )

    const treads = geometry.strokes.filter((stroke) => stroke.name.startsWith('tread-'))
    const arrow = geometry.strokes.filter((stroke) => stroke.name.startsWith('arrow-'))
    expect(treads.length).toBeGreaterThan(0)
    // Gövde çizgisi + iki ok başı çizgisi.
    expect(arrow).toHaveLength(3)
  })

  it('merdiven oku -y (yerel, "aşağı") ucuna doğru bakar', () => {
    const geometry = getAreaObjectPlanGeometry(
      'stairs',
      makeAreaObject({ x: 0, y: 0, widthCm: 120, lengthCm: 200, angleDeg: 0 }),
    )

    const shaft = geometry.strokes.find((stroke) => stroke.name === 'arrow-0')!
    const [tail, tip] = shaft.points
    // Gövde çizgisi büyük y'den (kuyruk) küçük y'ye (uç, "aşağı") iner.
    expect(tip.y).toBeLessThan(tail.y)
  })

  it('çok kısa merdivende ok dejenere olup gözden kaybolur (arrow stroke kalmaz)', () => {
    const geometry = getAreaObjectPlanGeometry(
      'stairs',
      makeAreaObject({ x: 0, y: 0, widthCm: 120, lengthCm: 10, angleDeg: 0 }),
    )

    expect(geometry.strokes.some((stroke) => stroke.name.startsWith('arrow-'))).toBe(false)
  })
})
