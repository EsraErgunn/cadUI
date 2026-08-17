import { describe, expect, it } from 'vitest'

import { isContentCountEmpty, type FloorContentSource } from '../floorContent'
import { getFloorDeletionSummary } from '../floorDeletion'
import type { Floor } from '../model'

const GROUND_ID = 1
const FIRST_ID = 2
const SECOND_ID = 3
const WALL_ID = 10

function makeFloor(id: number, name: string, heightCm = 320, isBasement = false): Floor {
  return { id, name, heightCm, isBasement }
}

const floors = [
  makeFloor(GROUND_ID, 'Zemin Kat'),
  makeFloor(FIRST_ID, '1. Kat'),
  makeFloor(SECOND_ID, '2. Kat'),
]

const source: FloorContentSource = {
  points: [
    { id: 20, floorId: FIRST_ID, x: 0, y: 0 },
    { id: 21, floorId: FIRST_ID, x: 400, y: 0 },
  ],
  walls: [
    { id: WALL_ID, floorId: FIRST_ID, p1Id: 20, p2Id: 21, thickness: 20, height: 280 },
    { id: 11, floorId: GROUND_ID, p1Id: 20, p2Id: 21, thickness: 20, height: 280 },
  ],
  openings: [
    { id: 30, wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' },
    { id: 31, wallId: WALL_ID, offsetCm: 250, widthCm: 120, type: 'window' },
    { id: 32, wallId: 11, offsetCm: 100, widthCm: 90, type: 'door' },
  ],
  rooms: [{ id: 40, wallIds: [WALL_ID], name: 'Salon' }],
  symbols: [
    {
      id: 50,
      type: 'panel',
      label: 'P-01',
      note: '',
      attachment: 'wall',
      wallId: WALL_ID,
      offsetCm: 50,
      isMountedOnFarFace: false,
    },
  ],
  areaObjects: [],
  beams: [],
  texts: [],
  installationElements: [{ floorId: FIRST_ID }, { floorId: FIRST_ID }, { floorId: GROUND_ID }],
  installationLines: [],
}

describe('getFloorDeletionSummary — döküm', () => {
  it('yalnız silinecek kattaki ögeleri sayar', () => {
    const summary = getFloorDeletionSummary(source, floors, [FIRST_ID])

    expect(summary.counts).toMatchObject({
      wallCount: 1,
      roomCount: 1,
      doorCount: 1,
      windowCount: 1,
      symbolCount: 1,
      installationElementCount: 2,
    })
  })

  it('açıklığı ve odayı DUVARINDAN türetir — kat silme temizliğiyle aynı ölçüt', () => {
    // Açıklık ve oda floorId taşımıyor; kata göre süzülseydi ikisi de 0 çıkardı.
    const summary = getFloorDeletionSummary(source, floors, [GROUND_ID])

    expect(summary.counts.doorCount).toBe(1)
    expect(summary.counts.roomCount).toBe(0)
  })

  it('boru bölümü SEGMENT sayar, hat sayısını değil', () => {
    const withLines: FloorContentSource = {
      ...source,
      installationLines: [{ floorId: FIRST_ID, segments: [{ id: 1 }, { id: 2 }, { id: 3 }] }],
    }

    expect(getFloorDeletionSummary(withLines, floors, [FIRST_ID]).counts.pipeSegmentCount).toBe(3)
  })

  it('birden çok katı tek dökümde toplar (madde 14)', () => {
    const summary = getFloorDeletionSummary(source, floors, [GROUND_ID, FIRST_ID])

    expect(summary.floors.map((floor) => floor.name)).toEqual(['Zemin Kat', '1. Kat'])
    expect(summary.counts.wallCount).toBe(2)
    expect(summary.counts.doorCount).toBe(2)
  })

  it('tanınmayan id sayıma girmez', () => {
    expect(getFloorDeletionSummary(source, floors, [404]).floors).toEqual([])
  })
})

describe('getFloorDeletionSummary — kot etkisi', () => {
  it('silinen katın üstündeki katların kotu düşer', () => {
    const summary = getFloorDeletionSummary(source, floors, [FIRST_ID])

    expect(summary.elevationChanges).toEqual([
      { floorId: SECOND_ID, name: '2. Kat', beforeCm: 640, afterCm: 320 },
    ])
  })

  it('altındaki katların kotu değişmez', () => {
    const summary = getFloorDeletionSummary(source, floors, [SECOND_ID])

    expect(summary.elevationChanges).toEqual([])
  })

  it('farklı seviyelerden silmede düşüş katlara göre DEĞİŞİR', () => {
    const withBasement = [makeFloor(9, 'Bodrum Kat', 280, true), ...floors]
    const summary = getFloorDeletionSummary(source, withBasement, [9, GROUND_ID])

    // Bodrum gidince zemin düzlemi 1. Kat"a kayar; iki kat da yeni sıfıra göre okunur.
    expect(summary.elevationChanges.map((change) => change.name)).toEqual(['1. Kat', '2. Kat'])
    expect(summary.elevationChanges[0]).toMatchObject({ beforeCm: 320, afterCm: 0 })
  })
})

describe('getFloorDeletionSummary — son kat', () => {
  it('seçim katların TAMAMINI kapsıyorsa engellenir ve döküm üretilmez', () => {
    const summary = getFloorDeletionSummary(source, floors, [GROUND_ID, FIRST_ID, SECOND_ID])

    expect(summary.isBlocked).toBe(true)
    expect(isContentCountEmpty(summary.counts)).toBe(true)
    expect(summary.elevationChanges).toEqual([])
  })

  it('tek katlı projede o kat silinemez', () => {
    const single = [makeFloor(GROUND_ID, 'Zemin Kat')]

    expect(getFloorDeletionSummary(source, single, [GROUND_ID]).isBlocked).toBe(true)
  })
})
