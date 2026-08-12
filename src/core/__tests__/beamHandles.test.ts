import { describe, expect, it } from 'vitest'

import { BEAM_HANDLE_HIT_PX, findBeamHandleAt, getBeamHandles } from '../beamHandles'
import type { Beam } from '../model'

const beam: Pick<Beam, 'x1' | 'y1' | 'x2' | 'y2'> = { x1: 0, y1: 0, x2: 200, y2: 0 }

describe('getBeamHandles', () => {
  it('iki uçta birer tutamaç verir', () => {
    expect(getBeamHandles(beam)).toEqual([
      { end: 'p1', position: { x: 0, y: 0 } },
      { end: 'p2', position: { x: 200, y: 0 } },
    ])
  })
})

describe('findBeamHandleAt', () => {
  it('ucun yakınında o ucu, uzağında hiçbirini vermez', () => {
    // zoom 1 → 1 px = 1 cm; erişim yarıçapı HIT/2 = 12 cm.
    expect(findBeamHandleAt({ x: 5, y: 0 }, beam, 1)).toBe('p1')
    expect(findBeamHandleAt({ x: 195, y: 0 }, beam, 1)).toBe('p2')
    expect(findBeamHandleAt({ x: 100, y: 0 }, beam, 1)).toBeUndefined()
  })

  it('tutma alanı EKRAN pikselinde sabit: uzaklaşınca dünya yarıçapı büyür', () => {
    const farCm = BEAM_HANDLE_HIT_PX / 2 / 0.5 - 1

    // zoom 0.5'te aynı nokta hâlâ erişilebilir, zoom 2'de değil.
    expect(findBeamHandleAt({ x: farCm, y: 0 }, beam, 0.5)).toBe('p1')
    expect(findBeamHandleAt({ x: farCm, y: 0 }, beam, 2)).toBeUndefined()
  })
})
