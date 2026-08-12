import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_BEAM_THICKNESS_CM } from '../../core/beam'
import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID } from '../../core/model'
import { useCadStore } from '../cadStore'

const UPPER_FLOOR_ID = 14

function resetState(): void {
  useCadStore.setState({
    floors: [
      createGroundFloor(),
      { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: DEFAULT_FLOOR_HEIGHT_CM, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
    beams: [],
    nextUniqueId: 100,
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
}

function findBeam(id: number) {
  return useCadStore.getState().beams.find((beam) => beam.id === id)
}

function addBeam() {
  return useCadStore.getState().addBeam({ start: { x: 0, y: 0 }, end: { x: 200, y: 0 } })!
}

beforeEach(resetState)

describe('addBeam', () => {
  it('kirişi aktif kata duvar kalınlığıyla ekler ve etiketini üretir', () => {
    const id = addBeam()

    expect(findBeam(id)).toMatchObject({
      floorId: DEFAULT_FLOOR_ID,
      x1: 0,
      y1: 0,
      x2: 200,
      y2: 0,
      thicknessCm: DEFAULT_BEAM_THICKNESS_CM,
      label: 'KR-01',
    })
  })

  it('sıfır boy kirişi REDDEDER ve id harcamaz', () => {
    const before = useCadStore.getState().nextUniqueId

    const id = useCadStore.getState().addBeam({ start: { x: 50, y: 50 }, end: { x: 50, y: 50 } })

    expect(id).toBeUndefined()
    expect(useCadStore.getState().beams).toHaveLength(0)
    expect(useCadStore.getState().nextUniqueId).toBe(before)
  })

  it('etiket kat başına sürer', () => {
    addBeam()
    useCadStore.setState({ activeFloorId: UPPER_FLOOR_ID })

    const upper = addBeam()

    expect(findBeam(upper)?.label).toBe('KR-01')
  })
})

describe('moveBeam', () => {
  it('iki ucu birlikte öteler, boy korunur', () => {
    const id = addBeam()

    expect(useCadStore.getState().moveBeam(id, 30, -10)).toBe(true)
    expect(findBeam(id)).toMatchObject({ x1: 30, y1: -10, x2: 230, y2: -10 })
  })

  it('sıfır öteleme store\'a yazılmaz', () => {
    const id = addBeam()
    const before = useCadStore.getState().revision

    expect(useCadStore.getState().moveBeam(id, 0, 0)).toBe(false)
    expect(useCadStore.getState().revision).toBe(before)
  })
})

describe('moveBeamEnd', () => {
  it('yalnız tutulan ucu taşır, diğeri çakılı kalır', () => {
    const id = addBeam()

    expect(useCadStore.getState().moveBeamEnd(id, 'p2', { x: 400, y: 50 })).toBe(true)
    expect(findBeam(id)).toMatchObject({ x1: 0, y1: 0, x2: 400, y2: 50 })
  })

  it('minimum boyun altına inen uzatmayı REDDEDER', () => {
    const id = addBeam()

    // p2'yi p1'in üstüne bırakmak kirişi sıfır boya indirirdi.
    expect(useCadStore.getState().moveBeamEnd(id, 'p2', { x: 0, y: 0 })).toBe(false)
    expect(findBeam(id)).toMatchObject({ x2: 200, y2: 0 })
  })
})

describe('setBeamThickness', () => {
  it('kalınlığı yazar, sıfır/negatifi reddeder', () => {
    const id = addBeam()

    expect(useCadStore.getState().setBeamThickness(id, 35)).toBe(true)
    expect(findBeam(id)?.thicknessCm).toBe(35)

    expect(useCadStore.getState().setBeamThickness(id, 0)).toBe(false)
    expect(findBeam(id)?.thicknessCm).toBe(35)
  })
})

describe('setBeamLabel', () => {
  it('aynı kattaki çakışan etiketi REDDEDER (KK-10)', () => {
    const first = addBeam()
    const second = useCadStore
      .getState()
      .addBeam({ start: { x: 0, y: 300 }, end: { x: 200, y: 300 } })!

    expect(useCadStore.getState().setBeamLabel(second, 'KR-01')).toBe(false)
    expect(findBeam(second)?.label).toBe('KR-02')
    expect(findBeam(first)?.label).toBe('KR-01')
  })

  it('boş etiketi reddeder', () => {
    const id = addBeam()

    expect(useCadStore.getState().setBeamLabel(id, '   ')).toBe(false)
    expect(findBeam(id)?.label).toBe('KR-01')
  })
})

describe('deleteSelection', () => {
  it('seçili kirişi siler', () => {
    const id = addBeam()

    expect(useCadStore.getState().deleteSelection([{ kind: 'beam', id }])).toBe(true)
    expect(useCadStore.getState().beams).toHaveLength(0)
  })
})
