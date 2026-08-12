import { describe, expect, it } from 'vitest'

import type { ProjectData } from '../../../../core/model'
import { buildFloorPlan } from '../planGeometry'

function buildData(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    nextUniqueId: 100,
    activeFloorId: 1,
    floors: [
      { id: 1, name: 'Zemin Kat', heightCm: 300, isBasement: false },
      { id: 2, name: '1. Kat', heightCm: 300, isBasement: false },
    ],
    points: [
      { id: 10, floorId: 1, x: 0, y: 0 },
      { id: 11, floorId: 1, x: 400, y: 0 },
      { id: 12, floorId: 2, x: 0, y: 0 },
      { id: 13, floorId: 2, x: 200, y: 0 },
    ],
    walls: [
      { id: 20, floorId: 1, p1Id: 10, p2Id: 11, thickness: 20, height: 280 },
      { id: 21, floorId: 2, p1Id: 12, p2Id: 13, thickness: 20, height: 280 },
    ],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
    ...overrides,
  }
}

describe('buildFloorPlan', () => {
  it('yalnız istenen katın duvarlarını alır', () => {
    const plan = buildFloorPlan(buildData(), 1)

    expect(plan.walls).toHaveLength(1)
    expect(plan.walls[0].id).toBe(20)
  })

  it('plan y ekseni SVG için ters çevrilir', () => {
    const data = buildData({
      points: [
        { id: 10, floorId: 1, x: 0, y: 100 },
        { id: 11, floorId: 1, x: 400, y: 100 },
      ],
      walls: [{ id: 20, floorId: 1, p1Id: 10, p2Id: 11, thickness: 20, height: 280 }],
    })

    const plan = buildFloorPlan(data, 1)

    // Planın y'si yukarı, SVG'nin y'si aşağı büyür.
    expect(plan.walls[0].y1).toBe(-100)
    expect(plan.walls[0].y2).toBe(-100)
  })

  it('noktası eksik duvarı çizmez', () => {
    const data = buildData({
      walls: [{ id: 99, floorId: 1, p1Id: 10, p2Id: 404, thickness: 20, height: 280 }],
    })

    expect(buildFloorPlan(data, 1).walls).toEqual([])
  })

  it('açıklığı duvarın ORTASINDAN yayarak yerleştirir', () => {
    const data = buildData({
      openings: [{ id: 30, wallId: 20, offsetCm: 200, widthCm: 100, type: 'door' }],
    })

    const [opening] = buildFloorPlan(data, 1).openings

    // offsetCm açıklığın ORTASI: 200 ± 50.
    expect(opening.x1).toBeCloseTo(150)
    expect(opening.x2).toBeCloseTo(250)
    expect(opening.isDoor).toBe(true)
  })

  it('duvarı olmayan açıklığı atlar', () => {
    const data = buildData({
      openings: [{ id: 30, wallId: 404, offsetCm: 200, widthCm: 100, type: 'window' }],
    })

    expect(buildFloorPlan(data, 1).openings).toEqual([])
  })

  it('kadraj duvarları pay bırakarak kapsar', () => {
    const plan = buildFloorPlan(buildData(), 1)

    expect(plan.bounds.minX).toBeLessThan(0)
    expect(plan.bounds.width).toBeGreaterThanOrEqual(400)
  })

  it('içeriği olmayan katta bile geçerli bir kadraj üretir', () => {
    const plan = buildFloorPlan(buildData({ walls: [] }), 1)

    // Sıfır genişlikli viewBox geçersizdir; taban değere düşülür.
    expect(plan.bounds.width).toBeGreaterThan(0)
    expect(plan.bounds.height).toBeGreaterThan(0)
  })

  it('döndürülmüş alan nesnesinin dört köşesini üretir', () => {
    const data = buildData({
      areaObjects: [
        {
          id: 40,
          type: 'stairs',
          floorId: 1,
          x: 100,
          y: 100,
          widthCm: 100,
          lengthCm: 200,
          angleDeg: 90,
          label: 'M-01',
        },
      ],
    })

    const [rect] = buildFloorPlan(data, 1).areaObjects

    expect(rect.label).toBe('M-01')
    expect(rect.points.split(' ')).toHaveLength(4)
  })

  it('serbest sembolü etiketiyle konumlandırır', () => {
    const data = buildData({
      symbols: [
        {
          id: 50,
          type: 'lighting',
          label: 'A-01',
          note: '',
          attachment: 'free',
          floorId: 1,
          x: 50,
          y: 60,
          rotationDeg: 0,
        },
      ],
    })

    const [label] = buildFloorPlan(data, 1).labels

    expect(label.text).toBe('A-01')
    expect(label.x).toBe(50)
    expect(label.y).toBe(-60)
  })

  it('duvara bağlı sembolü duvarın üstünde konumlandırır', () => {
    const data = buildData({
      symbols: [
        {
          id: 51,
          type: 'panel',
          label: 'P-01',
          note: '',
          attachment: 'wall',
          wallId: 20,
          offsetCm: 100,
          isMountedOnFarFace: false,
        },
      ],
    })

    const [label] = buildFloorPlan(data, 1).labels

    expect(label.x).toBeCloseTo(100)
    expect(label.y).toBeCloseTo(0)
  })
})
