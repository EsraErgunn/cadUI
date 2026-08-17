import { describe, expect, it } from 'vitest'

import type { FloorContentSource } from '../floorContent'
import {
  getFloorCopyTargets,
  getFloorRangeIds,
  planFloorCopy,
  withInstallationDependency,
  type FloorCopySelection,
} from '../floorCopyPlan'
import type { Floor } from '../model'

const GROUND_ID = 1
const FIRST_ID = 2
const SECOND_ID = 3
const THIRD_ID = 4

function makeFloor(id: number, name: string): Floor {
  return { id, name, heightCm: 300, isBasement: false }
}

const floors = [
  makeFloor(GROUND_ID, 'Zemin Kat'),
  makeFloor(FIRST_ID, '1. Kat'),
  makeFloor(SECOND_ID, '2. Kat'),
  makeFloor(THIRD_ID, '3. Kat'),
]

/** 1. Kat"ta mimari, 2. Kat"ta yalnız tesisat, 3. Kat boş. */
const source: FloorContentSource = {
  points: [{ id: 10, floorId: FIRST_ID, x: 0, y: 0 }],
  walls: [],
  openings: [],
  rooms: [],
  symbols: [],
  areaObjects: [],
  beams: [],
  texts: [],
  installationElements: [{ floorId: SECOND_ID }],
  installationLines: [],
}

function makeSelection(overrides: Partial<FloorCopySelection> = {}): FloorCopySelection {
  return {
    sourceFloorId: GROUND_ID,
    targetFloorIds: [FIRST_ID, SECOND_ID, THIRD_ID],
    isArchitectureIncluded: true,
    isInstallationIncluded: false,
    mode: 'overwrite',
    ...overrides,
  }
}

describe('withInstallationDependency (KK-18)', () => {
  it('tesisat işaretlenince mimari de işaretlenir', () => {
    const next = withInstallationDependency(
      { isArchitectureIncluded: false, isInstallationIncluded: false },
      'installation',
      true,
    )

    expect(next).toEqual({ isArchitectureIncluded: true, isInstallationIncluded: true })
  })

  it('mimarinin işareti kalkınca tesisatınki de kalkar', () => {
    const next = withInstallationDependency(
      { isArchitectureIncluded: true, isInstallationIncluded: true },
      'architecture',
      false,
    )

    expect(next).toEqual({ isArchitectureIncluded: false, isInstallationIncluded: false })
  })

  it('tesisatın işareti tek başına kaldırılabilir', () => {
    const next = withInstallationDependency(
      { isArchitectureIncluded: true, isInstallationIncluded: true },
      'installation',
      false,
    )

    expect(next).toEqual({ isArchitectureIncluded: true, isInstallationIncluded: false })
  })
})

describe('getFloorRangeIds (KK-16)', () => {
  it('iki kat arasındaki katların tamamını verir', () => {
    expect(getFloorRangeIds(floors, FIRST_ID, THIRD_ID)).toEqual([FIRST_ID, SECOND_ID, THIRD_ID])
  })

  it('uçlar ters verilse de aynı aralığı verir', () => {
    expect(getFloorRangeIds(floors, THIRD_ID, FIRST_ID)).toEqual([FIRST_ID, SECOND_ID, THIRD_ID])
  })

  it('tek katlık aralık o katı verir', () => {
    expect(getFloorRangeIds(floors, SECOND_ID, SECOND_ID)).toEqual([SECOND_ID])
  })

  it('tanınmayan uç boş aralık verir', () => {
    expect(getFloorRangeIds(floors, FIRST_ID, 404)).toEqual([])
  })
})

describe('getFloorCopyTargets', () => {
  it('kaynak katı hedeflerden çıkarır (madde 17)', () => {
    const targets = getFloorCopyTargets(
      source,
      floors,
      makeSelection({ targetFloorIds: [GROUND_ID, FIRST_ID] }),
    )

    expect(targets.map((target) => target.floorId)).toEqual([FIRST_ID])
  })

  it('içerik rozetini ve çakışmayı AYRI hesaplar', () => {
    // Yalnız mimari kopyalanıyor: 2. Kat"ta içerik VAR ama tesisat, çakışma yok.
    const targets = getFloorCopyTargets(source, floors, makeSelection())

    expect(targets).toEqual([
      { floorId: FIRST_ID, name: '1. Kat', hasContent: true, hasConflict: true },
      { floorId: SECOND_ID, name: '2. Kat', hasContent: true, hasConflict: false },
      { floorId: THIRD_ID, name: '3. Kat', hasContent: false, hasConflict: false },
    ])
  })

  it('tesisat da kopyalanınca 2. Kat çakışır', () => {
    const targets = getFloorCopyTargets(
      source,
      floors,
      makeSelection({ isInstallationIncluded: true }),
    )

    expect(targets.find((target) => target.floorId === SECOND_ID)?.hasConflict).toBe(true)
  })
})

describe('planFloorCopy — üzerine yaz (KK-17)', () => {
  it('bütün hedefleri işler, çakışanları uyarıda listeler', () => {
    const plan = planFloorCopy(source, floors, makeSelection())

    expect(plan.targetFloorIds).toEqual([FIRST_ID, SECOND_ID, THIRD_ID])
    expect(plan.overwrittenFloors.map((floor) => floor.name)).toEqual(['1. Kat'])
    expect(plan.skippedFloors).toEqual([])
    expect(plan.isRunnable).toBe(true)
  })
})

describe('planFloorCopy — bu katları atla (KK-17)', () => {
  it('çakışan katları işlem dışında bırakır', () => {
    const plan = planFloorCopy(source, floors, makeSelection({ mode: 'skip' }))

    expect(plan.targetFloorIds).toEqual([SECOND_ID, THIRD_ID])
    expect(plan.skippedFloors.map((floor) => floor.name)).toEqual(['1. Kat'])
  })

  it('atla kipinde üzerine yazma uyarısı ÇIKMAZ', () => {
    const plan = planFloorCopy(source, floors, makeSelection({ mode: 'skip' }))

    expect(plan.overwrittenFloors).toEqual([])
  })

  it('bütün hedefler atlanınca kopyalama çalıştırılamaz', () => {
    const plan = planFloorCopy(
      source,
      floors,
      makeSelection({ targetFloorIds: [FIRST_ID], mode: 'skip' }),
    )

    expect(plan.targetFloorIds).toEqual([])
    expect(plan.isRunnable).toBe(false)
  })
})

describe('planFloorCopy — çalıştırılabilirlik (KK-15)', () => {
  it('hedef seçilmeden çalıştırılamaz', () => {
    expect(planFloorCopy(source, floors, makeSelection({ targetFloorIds: [] })).isRunnable).toBe(
      false,
    )
  })

  it('içerik seçilmeden çalıştırılamaz', () => {
    const plan = planFloorCopy(
      source,
      floors,
      makeSelection({ isArchitectureIncluded: false, isInstallationIncluded: false }),
    )

    expect(plan.isRunnable).toBe(false)
  })

  it('tanınmayan kaynak kat çalıştırılamaz', () => {
    expect(planFloorCopy(source, floors, makeSelection({ sourceFloorId: 404 })).isRunnable).toBe(
      false,
    )
  })
})
