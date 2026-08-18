import { describe, expect, it } from 'vitest'

import { advanceChain, rewindChain, startChain } from '../lineChain'

const ANCHOR = { x: 0, y: 0 }
const NEXT = { x: 100, y: 0 }
const WRITTEN = { lineId: 7, endPointId: 8 }

describe('startChain', () => {
  it('kot verilmezse 0 olur', () => {
    expect(startChain(ANCHOR, null).elevationCm).toBe(0)
  })

  it('verilen kotu alır', () => {
    expect(startChain(ANCHOR, null, 75).elevationCm).toBe(75)
  })
})

describe('advanceChain', () => {
  it('yatay adımda kot verilmezse aynen taşınır', () => {
    const chain = advanceChain(startChain(ANCHOR, null, 75), NEXT, WRITTEN)

    expect(chain.elevationCm).toBe(75)
    expect(chain.anchor).toEqual(NEXT)
    expect(chain.startTarget).toEqual({ kind: 'linePoint', lineId: 7, pointId: 8 })
  })

  it('dikey adımda verilen yeni kotu alır', () => {
    const chain = advanceChain(startChain(ANCHOR, null, 0), ANCHOR, WRITTEN, 25)

    expect(chain.elevationCm).toBe(25)
  })
})

describe('rewindChain', () => {
  it('geri alınan zincirde kot bir önceki adımınkine döner', () => {
    const advanced = advanceChain(startChain(ANCHOR, null, 0), ANCHOR, WRITTEN, 25)
    const { chain, removedLineId } = rewindChain(advanced)

    expect(removedLineId).toBe(7)
    expect(chain?.elevationCm).toBe(0)
  })

  it('adım yoksa zincir tümüyle düşer', () => {
    const { chain, removedLineId } = rewindChain(startChain(ANCHOR, null, 0))

    expect(chain).toBeNull()
    expect(removedLineId).toBeNull()
  })
})
