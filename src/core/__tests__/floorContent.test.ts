import { describe, expect, it } from 'vitest'

import {
  getFloorContent,
  getFloorContentCounts,
  getVerticalAxisCount,
  isFloorContentEmpty,
  type FloorContentSource,
} from '../floorContent'

const GROUND_ID = 1
const UPPER_ID = 2
const WALL_ID = 10

const emptySource: FloorContentSource = {
  points: [],
  walls: [],
  openings: [],
  rooms: [],
  symbols: [],
  areaObjects: [],
  beams: [],
  installationElements: [],
  installationLines: [],
}

describe('getFloorContent', () => {
  it('duvarı olan kat mimari sayılır', () => {
    const source: FloorContentSource = {
      ...emptySource,
      points: [
        { id: 3, floorId: GROUND_ID, x: 0, y: 0 },
        { id: 4, floorId: GROUND_ID, x: 100, y: 0 },
      ],
      walls: [
        { id: WALL_ID, floorId: GROUND_ID, p1Id: 3, p2Id: 4, thickness: 20, height: 280 },
      ],
    }

    expect(getFloorContent(source, GROUND_ID)).toEqual({
      hasArchitecture: true,
      hasInstallation: false,
    })
    expect(getFloorContent(source, UPPER_ID).hasArchitecture).toBe(false)
  })

  it('yalnız nokta bırakılmış kat da mimari sayılır — yarım çizim "boş" görünmesin', () => {
    const source: FloorContentSource = {
      ...emptySource,
      points: [{ id: 3, floorId: GROUND_ID, x: 0, y: 0 }],
    }

    expect(getFloorContent(source, GROUND_ID).hasArchitecture).toBe(true)
  })

  it('duvara bağlı sembol katını DUVARINDAN alır', () => {
    const source: FloorContentSource = {
      ...emptySource,
      walls: [
        { id: WALL_ID, floorId: UPPER_ID, p1Id: 3, p2Id: 4, thickness: 20, height: 280 },
      ],
      symbols: [
        {
          id: 20,
          type: 'panel',
          label: 'P-01',
          note: '',
          attachment: 'wall',
          wallId: WALL_ID,
          offsetCm: 50,
          isMountedOnFarFace: false,
        },
      ],
    }

    expect(getFloorContent(source, UPPER_ID).hasArchitecture).toBe(true)
    expect(getFloorContent(source, GROUND_ID).hasArchitecture).toBe(false)
  })

  it('tesisat elemanı ve hattı ayrı rozet üretir', () => {
    const source: FloorContentSource = {
      ...emptySource,
      installationLines: [{ floorId: GROUND_ID, segments: [] }],
    }

    expect(getFloorContent(source, GROUND_ID)).toEqual({
      hasArchitecture: false,
      hasInstallation: true,
    })
  })
})

describe('isFloorContentEmpty', () => {
  it('iki tür de yoksa boştur', () => {
    expect(isFloorContentEmpty({ hasArchitecture: false, hasInstallation: false })).toBe(true)
    expect(isFloorContentEmpty({ hasArchitecture: false, hasInstallation: true })).toBe(false)
  })
})

describe('alan nesneleri (merdiven/kolon/baca şaftı)', () => {
  const withAreaObjects: FloorContentSource = {
    ...emptySource,
    areaObjects: [
      {
        id: 60,
        type: 'flueShaft',
        floorId: GROUND_ID,
        x: 0,
        y: 0,
        widthCm: 60,
        lengthCm: 60,
        angleDeg: 0,
        label: 'BŞ-01',
      },
      {
        id: 61,
        type: 'columnVentilation',
        floorId: GROUND_ID,
        x: 100,
        y: 0,
        widthCm: 40,
        lengthCm: 40,
        angleDeg: 0,
        label: 'KH-01',
      },
      {
        id: 62,
        type: 'stairs',
        floorId: GROUND_ID,
        x: 200,
        y: 0,
        widthCm: 120,
        lengthCm: 200,
        angleDeg: 0,
        label: 'M-01',
      },
    ],
  }

  it('duvarı olmayan ama merdiveni olan kat BOŞ sayılmaz', () => {
    expect(getFloorContent(withAreaObjects, GROUND_ID).hasArchitecture).toBe(true)
    expect(getFloorContent(withAreaObjects, UPPER_ID).hasArchitecture).toBe(false)
  })

  it('düşey eksen türlerini AYRI sayar — uyarı ikisini adıyla söylüyor (KK-13)', () => {
    const counts = getFloorContentCounts(withAreaObjects, new Set([GROUND_ID]))

    expect(counts.areaObjectCount).toBe(3)
    expect(counts.flueShaftCount).toBe(1)
    expect(counts.columnVentilationCount).toBe(1)
    expect(getVerticalAxisCount(counts)).toBe(2)
  })

  it('merdiven düşey eksen sayılmaz', () => {
    const onlyStairs: FloorContentSource = {
      ...emptySource,
      areaObjects: [withAreaObjects.areaObjects[2]],
    }

    expect(getVerticalAxisCount(getFloorContentCounts(onlyStairs, new Set([GROUND_ID])))).toBe(0)
  })
})
