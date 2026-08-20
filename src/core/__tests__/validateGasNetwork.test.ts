import { describe, expect, it } from 'vitest'

import {
  FLOOR_ID,
  IN_KITCHEN,
  IN_LIVING,
  METER,
  OUTSIDE,
  SERVICE_BOX,
  connectToPort,
  makeElement,
  makeLine,
  makeMeter,
  makeValidProject,
  ruleIds,
} from './validationFixture'

describe('Hata6 — hat sonlandırma', () => {
  it('bağlantısız uç hata verir', () => {
    const source = makeValidProject({
      installationLines: [
        makeLine(50, 'pipe', [SERVICE_BOX, METER], 500),
        makeLine(51, 'pipe', [METER, IN_KITCHEN], 510),
        makeLine(52, 'pipe', [IN_KITCHEN, IN_LIVING], 520),
      ],
    })
    expect(ruleIds(source).filter((id) => id === 'lineTermination')).toHaveLength(2)
  })

  it('sayaçta biten hat sonlanmış sayılmaz', () => {
    const source = makeValidProject({
      installationElements: [
        makeElement(40, 'serviceBox', SERVICE_BOX),
        makeMeter(41, METER, true),
      ],
      installationLines: [makeLine(50, 'pipe', [SERVICE_BOX, METER], 500)],
      installationConnections: [connectToPort(50, 'start', 40), connectToPort(50, 'end', 41)],
    })
    expect(ruleIds(source)).toContain('lineTermination')
  })

  it('yakıcı cihazda biten hat temizdir', () => {
    expect(ruleIds(makeValidProject())).not.toContain('lineTermination')
  })

  it('üst kata devam eden uç serbest sayılmaz', () => {
    const source = makeValidProject({
      installationLines: [
        makeLine(50, 'pipe', [SERVICE_BOX, METER], 500),
        makeLine(51, 'pipe', [METER, IN_KITCHEN], 510),
        makeLine(52, 'pipe', [IN_KITCHEN, IN_LIVING], 520),
      ],
      floorPipeLinks: [
        { id: 60, belowFloorId: FLOOR_ID, aboveFloorId: 2, belowPointId: 521, abovePointId: 700, position: IN_LIVING },
      ],
    })
    expect(ruleIds(source).filter((id) => id === 'lineTermination')).toHaveLength(1)
  })

  it('baca hattı gaz kuralına girmez', () => {
    const source = makeValidProject({
      installationLines: [
        makeLine(50, 'pipe', [SERVICE_BOX, METER], 500),
        makeLine(51, 'pipe', [METER, IN_KITCHEN], 510),
        makeLine(52, 'chimney', [IN_KITCHEN, OUTSIDE], 520),
      ],
    })
    expect(ruleIds(source)).not.toContain('lineTermination')
  })
})
