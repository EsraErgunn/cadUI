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

function resetState(): void {
  useCadStore.setState({
    points: FIXTURE_POINTS,
    walls: FIXTURE_WALLS,
    openings: FIXTURE_OPENINGS,
    nextUniqueId: FIXTURE_NEXT_FREE_ID,
    revision: 0,
  })
  useCadStore.temporal.getState().clear()
}

beforeEach(resetState)

describe('deleteSelection', () => {
  it('seçili duvarı siler', () => {
    const selection: Selection = [{ kind: 'wall', id: WALL_ID }]

    expect(useCadStore.getState().deleteSelection(selection)).toBe(true)
    expect(useCadStore.getState().walls.some((wall) => wall.id === WALL_ID)).toBe(false)
  })

  it('duvarla birlikte üstündeki açıklık da düşer (K16)', () => {
    useCadStore.getState().deleteSelection([{ kind: 'wall', id: WALL_ID }])

    expect(useCadStore.getState().openings.some((opening) => opening.id === WINDOW_ID)).toBe(false)
  })

  it('seçili açıklığı duvara dokunmadan siler', () => {
    useCadStore.getState().deleteSelection([{ kind: 'opening', id: WINDOW_ID }])

    const state = useCadStore.getState()
    expect(state.openings).toHaveLength(0)
    expect(state.walls).toHaveLength(FIXTURE_WALLS.length)
  })

  it('duvar ve açıklığı birlikte siler', () => {
    const selection: Selection = [
      { kind: 'wall', id: WALL_ID },
      { kind: 'opening', id: WINDOW_ID },
    ]

    useCadStore.getState().deleteSelection(selection)

    const state = useCadStore.getState()
    expect(state.walls.some((wall) => wall.id === WALL_ID)).toBe(false)
    expect(state.openings).toHaveLength(0)
  })

  it('çoklu silme TEK geri alma adımıdır', () => {
    const selection: Selection = [
      { kind: 'wall', id: WALL_ID },
      { kind: 'wall', id: 9 },
      { kind: 'opening', id: WINDOW_ID },
    ]

    useCadStore.getState().deleteSelection(selection)
    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)

    useCadStore.temporal.getState().undo()

    const state = useCadStore.getState()
    expect(state.walls).toHaveLength(FIXTURE_WALLS.length)
    expect(state.openings).toHaveLength(FIXTURE_OPENINGS.length)
  })

  it('sahipsiz kalan köşeleri temizler', () => {
    // Çapraz duvar 11 kimseyle köşe paylaşmıyor: silinince iki noktası da sahipsiz kalır.
    useCadStore.getState().deleteSelection([{ kind: 'wall', id: 11 }])

    const pointIds = useCadStore.getState().points.map((point) => point.id)
    expect(pointIds).not.toContain(6)
    expect(pointIds).not.toContain(7)
  })

  it('boş seçim hiçbir şey yapmaz ve projeyi kirletmez', () => {
    expect(useCadStore.getState().deleteSelection([])).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('tanınmayan id"ler projeyi kirletmez', () => {
    expect(useCadStore.getState().deleteSelection([{ kind: 'wall', id: 999 }])).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
    expect(useCadStore.temporal.getState().pastStates).toHaveLength(0)
  })
})
