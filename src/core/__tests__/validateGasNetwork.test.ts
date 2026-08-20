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
  makeStove,
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

  it('cihaz KOLUYLA biten hat sonlanmış sayılır', () => {
    // Gerçek yerleştirmenin (placeElementWithStub) ürettiği şekil: her iki
    // bağlantı da KOLA yazılır, ana borunun kendi ucuna kayıt YAZILMAZ.
    const source = makeValidProject({
      installationElements: [
        makeElement(40, 'serviceBox', SERVICE_BOX),
        makeMeter(41, METER, true),
        makeStove(42, IN_KITCHEN),
      ],
      installationLines: [
        makeLine(50, 'pipe', [SERVICE_BOX, METER], 500),
        makeLine(51, 'pipe', [METER, { x: 210, y: 160 }], 510),
        makeLine(52, 'applianceStub', [{ x: 210, y: 160 }, IN_KITCHEN], 520),
      ],
      installationConnections: [
        connectToPort(50, 'start', 40),
        connectToPort(50, 'end', 41),
        connectToPort(51, 'start', 41),
        // 511 = 51 numaralı hattın SON noktası; kol oraya oturuyor.
        { lineId: 52, end: 'start' as const, target: { kind: 'line' as const, lineId: 51, pointId: 511 } },
        connectToPort(52, 'end', 42),
      ],
    })

    expect(ruleIds(source)).not.toContain('lineTermination')
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
