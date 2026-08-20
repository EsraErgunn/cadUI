import { describe, expect, it } from 'vitest'

import {
  IN_KITCHEN,
  METER,
  OUTSIDE,
  SERVICE_BOX,
  makeElement,
  makeLine,
  makeMeter,
  makeStove,
  makeValidProject,
  ruleIds,
} from './validationFixture'
import { validateProject } from '../validate'

describe('Hata4 — cihaz marka/model', () => {
  it('marka boşsa uyarır', () => {
    const stove = makeElement(42, 'stove', IN_KITCHEN, {
      stove: { brand: '  ', model: 'PKE6', description: '', capacity: '', power: '' },
    })
    expect(ruleIds(makeValidProject({
      installationElements: [
        makeElement(40, 'serviceBox', SERVICE_BOX),
        makeMeter(41, METER, true),
        stove,
      ],
    }))).toContain('applianceBrandModel')
  })

  it('hiç dokunulmamış cihaz da eksiktir', () => {
    const issue = validateProject(
      makeValidProject({
        installationElements: [
          makeElement(40, 'serviceBox', SERVICE_BOX),
          makeMeter(41, METER, true),
          makeElement(42, 'stove', IN_KITCHEN),
        ],
      }),
    ).find((candidate) => candidate.ruleId === 'applianceBrandModel')

    expect(issue?.location.elementLabel).toBe('Ocak')
    expect(issue?.location.roomName).toBe('Mutfak')
  })
})

describe('Hata5 — cihaz mahal dışında', () => {
  it('mahal dışındaki cihazı bildirir', () => {
    const source = makeValidProject({
      installationElements: [
        makeElement(40, 'serviceBox', SERVICE_BOX),
        makeMeter(41, METER, true),
        makeStove(42, OUTSIDE),
      ],
      installationLines: [
        makeLine(50, 'pipe', [SERVICE_BOX, METER], 500),
        makeLine(51, 'pipe', [METER, OUTSIDE], 510),
      ],
    })
    const issue = validateProject(source).find(
      (candidate) => candidate.ruleId === 'applianceInsideRoom',
    )
    expect(issue?.location.elementLabel).toBe('Ocak')
    expect(issue?.focus?.view).toBe('installation')
  })

  it('servis kutusu mahal dışında olabilir', () => {
    expect(ruleIds(makeValidProject())).not.toContain('applianceInsideRoom')
  })
})

describe('Hata7 — sayaç birim/abone no', () => {
  it('boş alanları bildirir', () => {
    const source = makeValidProject({
      installationElements: [
        makeElement(40, 'serviceBox', SERVICE_BOX),
        makeMeter(41, METER, false),
        makeStove(42, IN_KITCHEN),
      ],
    })
    const issue = validateProject(source).find(
      (candidate) => candidate.ruleId === 'meterSubscriberInfo',
    )
    expect(issue?.location.elementLabel).toBe('Sayaç')
  })

  it('dolu sayaç temizdir', () => {
    expect(ruleIds(makeValidProject())).not.toContain('meterSubscriberInfo')
  })
})
