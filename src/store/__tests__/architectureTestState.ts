import { MOCK_NEXT_FREE_ID, MOCK_OPENINGS, MOCK_POINTS, MOCK_WALLS } from '../architectureMock'
import { useCadStore } from '../cadStore'

export const WINDOW_ID = 12
export const WALL_ID = 8

/** Her testin aynı mock sahneden başlaması için. beforeEach içinde çağrılır. */
export function resetArchitectureState(): void {
  useCadStore.setState({
    points: MOCK_POINTS,
    walls: MOCK_WALLS,
    openings: MOCK_OPENINGS,
    nextUniqueId: MOCK_NEXT_FREE_ID,
    revision: 0,
    savedRevision: 0,
  })
}
