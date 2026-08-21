import { describe, expect, it } from 'vitest'

import type { InstallationLine } from '../installationModel'
import { isPlanZeroLengthLine, pickLineAt } from '../linePicking'

function makeLine(id: number, positions: readonly { x: number; y: number }[]): InstallationLine {
  return {
    id,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: positions.map((position, index) => ({ id: id * 100 + index, position })),
    segments: positions.slice(1).map((_, index) => ({
      id: id * 1000 + index,
      fromPointId: id * 100 + index,
      toPointId: id * 100 + index + 1,
    })),
  }
}

const HORIZONTAL = makeLine(1, [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
])
/** Saf dikey kolon: iki noktası da AYNI plan konumunda (K102). */
const VERTICAL = makeLine(2, [
  { x: 100, y: 0 },
  { x: 100, y: 0 },
])

describe('pickLineAt', () => {
  it('gövdeye basışı yakalar', () => {
    expect(pickLineAt({ x: 50, y: 1 }, [HORIZONTAL], 2, 2)).toBe(1)
  })

  it('banttan uzağa basışı yakalamaz', () => {
    expect(pickLineAt({ x: 50, y: 40 }, [HORIZONTAL], 2, 2)).toBeNull()
  })

  it('plan boyu sıfır segmentte dikey bandı kullanır', () => {
    // Normal tolerans (2 cm) yetmezdi; dikey bant (12 cm) yetiyor.
    expect(pickLineAt({ x: 108, y: 0 }, [VERTICAL], 2, 12)).toBe(2)
    expect(pickLineAt({ x: 108, y: 0 }, [VERTICAL], 2, 2)).toBeNull()
  })

  it('dikey bant normal banttan dar kalırsa geniş olan kazanır', () => {
    expect(pickLineAt({ x: 50, y: 1 }, [HORIZONTAL], 2, 0)).toBe(1)
  })
})

describe('isPlanZeroLengthLine', () => {
  it('tek plan noktasına düşen hattı ayırt eder', () => {
    expect(isPlanZeroLengthLine(VERTICAL)).toBe(true)
    expect(isPlanZeroLengthLine(HORIZONTAL)).toBe(false)
  })
})
