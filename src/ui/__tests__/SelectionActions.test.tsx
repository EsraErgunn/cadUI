import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  FIXTURE_NEXT_FREE_ID,
  FIXTURE_OPENINGS,
  FIXTURE_POINTS,
  FIXTURE_WALLS,
  WINDOW_ID,
} from '../../store/__tests__/architectureFixture'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { SelectionActions } from '../properties/SelectionActions'

/** Serbest çapraz duvar (6: 600,0 → 7: 900,400); komşu esnemesi karışmasın. */
const DIAGONAL_WALL_ID = 11

beforeEach(() => {
  useCadStore.setState({
    points: FIXTURE_POINTS,
    walls: FIXTURE_WALLS,
    openings: FIXTURE_OPENINGS,
    nextUniqueId: FIXTURE_NEXT_FREE_ID,
    revision: 0,
  })
  useArchitectureUiStore.setState({
    selection: [{ kind: 'wall', id: DIAGONAL_WALL_ID }],
  })
})

function findPoint(pointId: number) {
  return useCadStore.getState().points.find((point) => point.id === pointId)
}

describe('SelectionActions', () => {
  it('90 derece döndürür — duvarın boyu korunur', async () => {
    render(<SelectionActions />)

    await userEvent.click(screen.getByRole('button', { name: '90 derece döndür' }))

    const p1 = findPoint(6)
    const p2 = findPoint(7)
    expect(Math.hypot(p2!.x - p1!.x, p2!.y - p1!.y)).toBeCloseTo(500)
    // Dayanak seçimin merkezi: köşeler yer değiştirdi ama merkez sabit kaldı.
    expect((p1!.x + p2!.x) / 2).toBeCloseTo(750)
    expect((p1!.y + p2!.y) / 2).toBeCloseTo(200)
  })

  it('dikey eksende aynalar', async () => {
    render(<SelectionActions />)

    await userEvent.click(screen.getByRole('button', { name: 'Dikey eksende aynala' }))

    expect(findPoint(6)).toMatchObject({ x: 900, y: 0 })
    expect(findPoint(7)).toMatchObject({ x: 600, y: 400 })
  })

  it('yatay eksende aynalar', async () => {
    render(<SelectionActions />)

    await userEvent.click(screen.getByRole('button', { name: 'Yatay eksende aynala' }))

    expect(findPoint(6)).toMatchObject({ x: 600, y: 400 })
    expect(findPoint(7)).toMatchObject({ x: 900, y: 0 })
  })

  it('yalnız açıklık seçiliyken düğmeler pasif — açıklık kendi koordinatını taşımıyor', () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'opening', id: WINDOW_ID }] })
    render(<SelectionActions />)

    expect(screen.getByRole('button', { name: 'Çizilen eksende aynala' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '90 derece döndür' })).toBeDisabled()
  })

  it('her işlem TEK geri alma adımıdır', async () => {
    useCadStore.temporal.getState().clear()
    render(<SelectionActions />)

    await userEvent.click(screen.getByRole('button', { name: '90 derece döndür' }))

    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)
  })
})
