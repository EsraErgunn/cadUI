import { describe, expect, it } from 'vitest'

import { getFloorContent, isFloorContentEmpty, type FloorContentSource } from '../floorContent'

const GROUND_ID = 1
const UPPER_ID = 2
const WALL_ID = 10

const emptySource: FloorContentSource = {
  points: [],
  walls: [],
  openings: [],
  rooms: [],
  symbols: [],
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
      installationLines: [{ floorId: GROUND_ID }],
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
