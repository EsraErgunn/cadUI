import { beforeEach, describe, expect, it } from 'vitest'

import {
  FIXTURE_NEXT_FREE_ID,
  FIXTURE_OPENINGS,
  FIXTURE_POINTS,
  FIXTURE_WALLS,
  WALL_ID,
  WINDOW_ID,
} from './architectureFixture'
import type { Selection } from '../../core/selection'
import { useCadStore } from '../cadStore'

/** Serbest çapraz duvar: kimseyle köşe paylaşmıyor, komşu esnemesi karışmasın. */
const DIAGONAL_WALL_ID = 11

function resetState(): void {
  useCadStore.setState({
    points: FIXTURE_POINTS,
    walls: FIXTURE_WALLS,
    openings: FIXTURE_OPENINGS,
    nextUniqueId: FIXTURE_NEXT_FREE_ID,
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
}

function findPoint(pointId: number) {
  return useCadStore.getState().points.find((point) => point.id === pointId)
}

beforeEach(resetState)

describe('transformSelection — taşıma', () => {
  it('seçili duvarın iki köşesini de öteler', () => {
    const selection: Selection = [{ kind: 'wall', id: DIAGONAL_WALL_ID }]

    expect(
      useCadStore.getState().transformSelection(selection, {
        kind: 'translate',
        dxCm: 100,
        dyCm: 50,
      }),
    ).toBe(true)

    // Duvar 11 = nokta 6 (600,0) → 7 (900,400).
    expect(findPoint(6)).toMatchObject({ x: 700, y: 50 })
    expect(findPoint(7)).toMatchObject({ x: 1000, y: 450 })
  })

  it('birden çok duvar TEK geri alma adımında taşınır', () => {
    const selection: Selection = [
      { kind: 'wall', id: WALL_ID },
      { kind: 'wall', id: 9 },
    ]

    useCadStore.getState().transformSelection(selection, { kind: 'translate', dxCm: 10, dyCm: 0 })

    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)
  })

  it('paylaşılan köşe iki kez ötelenmez', () => {
    // Duvar 8 ve 9 nokta 3"ü paylaşıyor (500, 0).
    const selection: Selection = [
      { kind: 'wall', id: WALL_ID },
      { kind: 'wall', id: 9 },
    ]

    useCadStore.getState().transformSelection(selection, { kind: 'translate', dxCm: 10, dyCm: 0 })

    expect(findPoint(3)).toMatchObject({ x: 510, y: 0 })
  })

  it('yalnız açıklık seçiliyken hiçbir şey yapmaz — açıklık kendi koordinatını taşımıyor', () => {
    const selection: Selection = [{ kind: 'opening', id: WINDOW_ID }]

    expect(
      useCadStore.getState().transformSelection(selection, { kind: 'translate', dxCm: 10, dyCm: 0 }),
    ).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('sıfır öteleme projeyi kirletmez', () => {
    const selection: Selection = [{ kind: 'wall', id: DIAGONAL_WALL_ID }]

    expect(
      useCadStore.getState().transformSelection(selection, { kind: 'translate', dxCm: 0, dyCm: 0 }),
    ).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
  })
})

describe('transformSelection — döndürme ve aynalama', () => {
  it('duvarı kendi merkezi etrafında 180 derece döndürür', () => {
    const selection: Selection = [{ kind: 'wall', id: DIAGONAL_WALL_ID }]
    // Merkez: ((600+900)/2, (0+400)/2) = (750, 200).
    useCadStore.getState().transformSelection(selection, {
      kind: 'rotate',
      pivot: { x: 750, y: 200 },
      angleDeg: 180,
    })

    expect(findPoint(6)?.x).toBeCloseTo(900)
    expect(findPoint(6)?.y).toBeCloseTo(400)
    expect(findPoint(7)?.x).toBeCloseTo(600)
  })

  it('döndürme duvarın boyunu korur', () => {
    const selection: Selection = [{ kind: 'wall', id: DIAGONAL_WALL_ID }]
    useCadStore.getState().transformSelection(selection, {
      kind: 'rotate',
      pivot: { x: 750, y: 200 },
      angleDeg: 37,
    })

    const p1 = findPoint(6)
    const p2 = findPoint(7)
    expect(Math.hypot(p2!.x - p1!.x, p2!.y - p1!.y)).toBeCloseTo(500)
  })

  it('dikey aynalama x"i çevirir', () => {
    const selection: Selection = [{ kind: 'wall', id: DIAGONAL_WALL_ID }]
    useCadStore.getState().transformSelection(selection, {
      kind: 'mirror',
      pivot: { x: 750, y: 200 },
      axis: 'vertical',
    })

    expect(findPoint(6)).toMatchObject({ x: 900, y: 0 })
    expect(findPoint(7)).toMatchObject({ x: 600, y: 400 })
  })

  it('aynalanan duvarın açıklığı duvarında kalır — offsetCm p1"den ölçülüyor', () => {
    const selection: Selection = [{ kind: 'wall', id: WALL_ID }]
    useCadStore.getState().transformSelection(selection, {
      kind: 'mirror',
      pivot: { x: 250, y: 0 },
      axis: 'vertical',
    })

    const opening = useCadStore.getState().openings.find((item) => item.id === WINDOW_ID)
    expect(opening?.wallId).toBe(WALL_ID)
    expect(opening?.offsetCm).toBe(250)
  })
})

describe('duplicateSelection', () => {
  it('duvarı ve köşelerini yeni id"lerle kopyalar', () => {
    const before = useCadStore.getState()
    const created = useCadStore
      .getState()
      .duplicateSelection([{ kind: 'wall', id: DIAGONAL_WALL_ID }], { dxCm: 0, dyCm: 500 })

    expect(created).toHaveLength(1)
    expect(created[0].id).not.toBe(DIAGONAL_WALL_ID)

    const after = useCadStore.getState()
    expect(after.walls).toHaveLength(before.walls.length + 1)
    expect(after.points).toHaveLength(before.points.length + 2)
  })

  it('kopya kaynağın köşelerini PAYLAŞMAZ', () => {
    const [copy] = useCadStore
      .getState()
      .duplicateSelection([{ kind: 'wall', id: DIAGONAL_WALL_ID }], { dxCm: 0, dyCm: 500 })

    const state = useCadStore.getState()
    const source = state.walls.find((wall) => wall.id === DIAGONAL_WALL_ID)
    const copied = state.walls.find((wall) => wall.id === copy.id)

    expect(copied?.p1Id).not.toBe(source?.p1Id)
    expect(copied?.p2Id).not.toBe(source?.p2Id)
  })

  it('ögeler birbirine göre konumunu korur', () => {
    const [copy] = useCadStore
      .getState()
      .duplicateSelection([{ kind: 'wall', id: DIAGONAL_WALL_ID }], { dxCm: 100, dyCm: 200 })

    const state = useCadStore.getState()
    const copied = state.walls.find((wall) => wall.id === copy.id)
    const p1 = state.points.find((point) => point.id === copied?.p1Id)
    const p2 = state.points.find((point) => point.id === copied?.p2Id)

    expect(p1).toMatchObject({ x: 700, y: 200 })
    expect(p2).toMatchObject({ x: 1000, y: 600 })
  })

  it('seçili duvarın açıklığı da kopyalanır ve KOPYANIN duvarına bağlanır', () => {
    const [copy] = useCadStore
      .getState()
      .duplicateSelection([{ kind: 'wall', id: WALL_ID }], { dxCm: 0, dyCm: 1000 })

    const openings = useCadStore.getState().openings
    expect(openings).toHaveLength(FIXTURE_OPENINGS.length + 1)

    const copied = openings.find((opening) => opening.id !== WINDOW_ID)
    expect(copied?.wallId).toBe(copy.id)
    expect(copied?.offsetCm).toBe(250)
  })

  it('paylaşılan köşe kopyada TEK noktaya düşer — duvarlar kopuk kalmasın', () => {
    // Duvar 8 ve 9 nokta 3"ü paylaşıyor.
    const created = useCadStore.getState().duplicateSelection(
      [
        { kind: 'wall', id: WALL_ID },
        { kind: 'wall', id: 9 },
      ],
      { dxCm: 0, dyCm: 2000 },
    )

    const state = useCadStore.getState()
    const first = state.walls.find((wall) => wall.id === created[0].id)
    const second = state.walls.find((wall) => wall.id === created[1].id)

    expect(first?.p2Id).toBe(second?.p1Id)
  })

  it('çoğaltma TEK geri alma adımıdır', () => {
    useCadStore
      .getState()
      .duplicateSelection([{ kind: 'wall', id: DIAGONAL_WALL_ID }], { dxCm: 0, dyCm: 500 })

    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)

    useCadStore.temporal.getState().undo()
    expect(useCadStore.getState().walls).toHaveLength(FIXTURE_WALLS.length)
  })

  it('yalnız açıklık seçiliyken çoğaltmaz — duvarsız açıklık temsil edilemez', () => {
    expect(
      useCadStore.getState().duplicateSelection([{ kind: 'opening', id: WINDOW_ID }], {
        dxCm: 0,
        dyCm: 100,
      }),
    ).toEqual([])
    expect(useCadStore.getState().revision).toBe(0)
  })
})
