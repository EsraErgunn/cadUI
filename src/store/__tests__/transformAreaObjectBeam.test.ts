import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_ID } from '../../core/model'
import type { Selection } from '../../core/selection'
import { QUARTER_TURN_DEG } from '../../core/transform'
import { useCadStore } from '../cadStore'
import { getSelectionPivot } from '../transformOps'

/**
 * K49: grup dönüşümü ve Ctrl+D çoğaltma eskiden yalnız duvar ve sembol
 * biliyordu — alan nesnesi ile kiriş seçiliyken hiçbir şey olmuyordu.
 */
function resetState(): void {
  useCadStore.setState({
    floors: [createGroundFloor()],
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

function addColumn(x: number, y: number) {
  return useCadStore.getState().addAreaObject({ type: 'structuralColumn', x, y })!
}

function addBeam() {
  return useCadStore.getState().addBeam({ start: { x: 0, y: 0 }, end: { x: 200, y: 0 } })!
}

function findAreaObject(id: number) {
  return useCadStore.getState().areaObjects.find((candidate) => candidate.id === id)
}

function findBeam(id: number) {
  return useCadStore.getState().beams.find((candidate) => candidate.id === id)
}

beforeEach(resetState)

describe('getSelectionPivot', () => {
  it('yalnız alan nesnesi seçiliyken dayanağı onun merkezinden bulur', () => {
    const id = addColumn(300, 100)
    const selection: Selection = [{ kind: 'area', id }]

    expect(getSelectionPivot(useCadStore.getState(), selection)).toEqual({ x: 300, y: 100 })
  })

  it('yalnız kiriş seçiliyken dayanak İKİ UCUN ortasıdır', () => {
    const id = addBeam()
    const selection: Selection = [{ kind: 'beam', id }]

    expect(getSelectionPivot(useCadStore.getState(), selection)).toEqual({ x: 100, y: 0 })
  })
})

describe('transformSelection — alan nesnesi', () => {
  it('öteler', () => {
    const id = addColumn(300, 100)

    expect(
      useCadStore
        .getState()
        .transformSelection([{ kind: 'area', id }], { kind: 'translate', dxCm: 50, dyCm: -20 }),
    ).toBe(true)
    expect(findAreaObject(id)).toMatchObject({ x: 350, y: 80 })
  })

  it('döndürmede KENDİ açısı da döner — yoksa grup dönüp nesne dik kalırdı', () => {
    const id = addColumn(300, 0)

    useCadStore.getState().transformSelection([{ kind: 'area', id }], {
      kind: 'rotate',
      pivot: { x: 0, y: 0 },
      angleDeg: QUARTER_TURN_DEG,
    })

    const rotated = findAreaObject(id)!
    expect(rotated.x).toBeCloseTo(0, 6)
    expect(rotated.y).toBeCloseTo(300, 6)
    expect(rotated.angleDeg).toBe(QUARTER_TURN_DEG)
  })
})

describe('transformSelection — kiriş', () => {
  it('İKİ ucunu birden dönüştürür', () => {
    const id = addBeam()

    expect(
      useCadStore
        .getState()
        .transformSelection([{ kind: 'beam', id }], { kind: 'translate', dxCm: 10, dyCm: 5 }),
    ).toBe(true)
    expect(findBeam(id)).toMatchObject({ x1: 10, y1: 5, x2: 210, y2: 5 })
  })

  it('döndürünce yön uçlardan TÜRER, ayrı bir açı alanı gerekmez', () => {
    const id = addBeam()

    useCadStore.getState().transformSelection([{ kind: 'beam', id }], {
      kind: 'rotate',
      pivot: { x: 0, y: 0 },
      angleDeg: QUARTER_TURN_DEG,
    })

    const rotated = findBeam(id)!
    expect(rotated.x1).toBeCloseTo(0, 6)
    expect(rotated.y1).toBeCloseTo(0, 6)
    // Yatay kiriş 90° dönünce düşey olur.
    expect(rotated.x2).toBeCloseTo(0, 6)
    expect(rotated.y2).toBeCloseTo(200, 6)
  })
})

describe('duplicateSelection — alan nesnesi ve kiriş', () => {
  const OFFSET = { dxCm: 50, dyCm: 50 }

  it('alan nesnesini ötelenmiş kopyayla çoğaltır ve YENİ etiket verir', () => {
    const id = addColumn(300, 100)

    const created = useCadStore.getState().duplicateSelection([{ kind: 'area', id }], OFFSET)

    expect(created).toHaveLength(1)
    expect(created[0].kind).toBe('area')
    const copy = findAreaObject(created[0].id)!
    expect(copy).toMatchObject({ x: 350, y: 150, label: 'K-02' })
    // Kaynak yerinde kalır.
    expect(findAreaObject(id)).toMatchObject({ x: 300, y: 100, label: 'K-01' })
  })

  it('kirişi çoğaltır ve YENİ etiket verir', () => {
    const id = addBeam()

    const created = useCadStore.getState().duplicateSelection([{ kind: 'beam', id }], OFFSET)

    expect(created).toHaveLength(1)
    const copy = findBeam(created[0].id)!
    expect(copy).toMatchObject({ x1: 50, y1: 50, x2: 250, y2: 50, label: 'KR-02' })
  })

  it('karışık seçimde iki türü birden kopyalar', () => {
    const areaId = addColumn(300, 100)
    const beamId = addBeam()

    const created = useCadStore.getState().duplicateSelection(
      [
        { kind: 'area', id: areaId },
        { kind: 'beam', id: beamId },
      ],
      OFFSET,
    )

    expect(created.filter((item) => item.kind === 'area')).toHaveLength(1)
    expect(created.filter((item) => item.kind === 'beam')).toHaveLength(1)
    expect(useCadStore.getState().areaObjects).toHaveLength(2)
    expect(useCadStore.getState().beams).toHaveLength(2)
  })

  it('etiket sayacı ÖNCEKİ kopyayı da görür — iki kopya aynı adı almaz', () => {
    const id = addColumn(300, 100)
    const selection: Selection = [{ kind: 'area', id }]

    const first = useCadStore.getState().duplicateSelection(selection, OFFSET)
    const second = useCadStore.getState().duplicateSelection(selection, OFFSET)

    expect(findAreaObject(first[0].id)?.label).toBe('K-02')
    expect(findAreaObject(second[0].id)?.label).toBe('K-03')
  })

  it('çoğaltma TEK geçmiş adımı: Ctrl+Z kopyaların hepsini birden alır', () => {
    const areaId = addColumn(300, 100)
    const beamId = addBeam()

    useCadStore.getState().duplicateSelection(
      [
        { kind: 'area', id: areaId },
        { kind: 'beam', id: beamId },
      ],
      OFFSET,
    )
    useCadStore.temporal.getState().undo()

    expect(useCadStore.getState().areaObjects).toHaveLength(1)
    expect(useCadStore.getState().beams).toHaveLength(1)
  })
})
