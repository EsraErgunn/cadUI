import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Wall } from '../Wall'

/**
 * drei `<Line>` yerine kaydedici: gelen `points` dizisinin KİMLİĞİ ve render
 * sayısı ölçülüyor. Gerçek Line three.js kurulumu ister, buradaki soru ise saf
 * React — hangi prop hangi yeniden kurulumu tetikliyor.
 */
const lineRenders: { points: unknown }[] = []

vi.mock('@react-three/drei', () => ({
  Line: (props: { points: unknown }) => {
    lineRenders.push({ points: props.points })
    return null
  },
}))

const WALL = { id: 1, floorId: 1, p1Id: 2, p2Id: 3, thickness: 20, height: 280 }

function renderWall(overrides: Partial<Parameters<typeof Wall>[0]> = {}) {
  return (
    <Wall
      wall={WALL}
      p1x={0}
      p1y={0}
      p2x={500}
      p2y={0}
      tone="normal"
      zoom={1}
      {...overrides}
    />
  )
}

describe('Wall — drei <Line> geometri çöpü', () => {
  it('uçlar aynı kalınca points dizisinin KİMLİĞİ korunur', () => {
    lineRenders.length = 0
    const view = render(renderWall())
    // Yalnız zoom değişiyor: kalınlık güncellenmeli ama geometri DURMALI.
    view.rerender(renderWall({ zoom: 2 }))

    expect(lineRenders).toHaveLength(2)
    // Aynı referans = drei geometriyi yeniden kurmaz, GPU tamponu yüklenmez.
    expect(lineRenders[1].points).toBe(lineRenders[0].points)
  })

  it('uç oynayınca points dizisi YENİLENİR', () => {
    lineRenders.length = 0
    const view = render(renderWall())
    view.rerender(renderWall({ p2y: 100 }))

    expect(lineRenders[1].points).not.toBe(lineRenders[0].points)
  })

  it('memo: hiçbir prop değişmediyse yeniden render EDİLMEZ', () => {
    lineRenders.length = 0
    const view = render(renderWall())
    view.rerender(renderWall())

    // İkinci render memo tarafından durduruldu; Line hiç çağrılmadı.
    expect(lineRenders).toHaveLength(1)
  })
})
