import { describe, expect, it } from 'vitest'

import {
  FLOOR_ID,
  IN_KITCHEN,
  IN_LIVING,
  METER,
  OUTSIDE,
  SERVICE_BOX,
  WALL_IDS,
  connectToPort,
  makeElement,
  makeLine,
  makeMeter,
  makeStove,
  makeValidProject,
  makeWallVent,
  ruleIds,
} from './validationFixture'
import { validateProject } from '../validate'

describe('Hata9 — baca mahal dışında', () => {
  it('mahal içinde biten bacayı bildirir', () => {
    const source = makeValidProject({
      installationLines: [
        makeLine(50, 'pipe', [SERVICE_BOX, METER], 500),
        makeLine(51, 'pipe', [METER, IN_KITCHEN], 510),
        makeLine(52, 'chimney', [IN_KITCHEN, IN_LIVING], 520),
      ],
      installationConnections: [
        connectToPort(50, 'start', 40),
        connectToPort(50, 'end', 41),
        connectToPort(51, 'start', 41),
        connectToPort(51, 'end', 42),
        connectToPort(52, 'start', 42),
      ],
    })
    expect(ruleIds(source)).toContain('flueOutsideRoom')
  })

  it('dışarı çıkan baca temizdir', () => {
    const source = makeValidProject({
      installationLines: [
        makeLine(50, 'pipe', [SERVICE_BOX, METER], 500),
        makeLine(51, 'pipe', [METER, IN_KITCHEN], 510),
        makeLine(52, 'chimney', [IN_KITCHEN, OUTSIDE], 520),
      ],
      installationConnections: [
        connectToPort(50, 'start', 40),
        connectToPort(50, 'end', 41),
        connectToPort(51, 'start', 41),
        connectToPort(51, 'end', 42),
        connectToPort(52, 'start', 42),
      ],
    })
    expect(ruleIds(source)).not.toContain('flueOutsideRoom')
  })
})

describe('Hata10 — mahal menfezi', () => {
  it('menfezsiz mahalde cihaz varsa uyarır', () => {
    const issue = validateProject(makeValidProject({ symbols: [] })).find(
      (candidate) => candidate.ruleId === 'roomVent',
    )
    expect(issue?.location.roomName).toBe('Mutfak')
  })

  it('iki mahal arasındaki menfez atmosfere çıkmaz', () => {
    const issues = ruleIds(makeValidProject({ symbols: [makeWallVent(35, WALL_IDS.middle)] }))
    expect(issues).toContain('roomVent')
  })

  it('dış duvardaki menfez yeterlidir', () => {
    expect(ruleIds(makeValidProject({ symbols: [makeWallVent(35, WALL_IDS.bottom)] }))).not.toContain(
      'roomVent',
    )
  })

  it('cihazsız mahal menfez istemez', () => {
    const issues = validateProject(makeValidProject({ symbols: [makeWallVent(35, WALL_IDS.bottom)] }))
    expect(issues.filter((issue) => issue.ruleId === 'roomVent')).toHaveLength(0)
  })

  it('aynı mahaldeki iki cihaz TEK satır üretir', () => {
    const source = makeValidProject({
      symbols: [],
      installationElements: [
        makeElement(40, 'serviceBox', SERVICE_BOX),
        makeMeter(41, METER, true),
        makeStove(42, IN_KITCHEN),
        makeStove(43, { x: 250, y: 200 }),
      ],
      installationLines: [
        makeLine(50, 'pipe', [SERVICE_BOX, METER], 500),
        makeLine(51, 'pipe', [METER, IN_KITCHEN], 510),
        makeLine(52, 'pipe', [IN_KITCHEN, { x: 250, y: 200 }], 520),
      ],
      installationConnections: [
        connectToPort(50, 'start', 40),
        connectToPort(50, 'end', 41),
        connectToPort(51, 'start', 41),
        connectToPort(51, 'end', 42),
        connectToPort(52, 'start', 42),
        connectToPort(52, 'end', 43),
      ],
    })
    expect(validateProject(source).filter((issue) => issue.ruleId === 'roomVent')).toHaveLength(1)
  })

  it('serbest duran menfez sayılmaz', () => {
    const freeVent = {
      id: 35,
      type: 'vent' as const,
      label: 'MN-01',
      note: '',
      attachment: 'free' as const,
      floorId: FLOOR_ID,
      x: 100,
      y: 100,
      rotationDeg: 0,
    }
    expect(ruleIds(makeValidProject({ symbols: [freeVent] }))).toContain('roomVent')
  })

  it('komşu mahalin menfezi bu mahali kurtarmaz', () => {
    // Menfez Salon'un dış duvarında; cihaz Mutfak'ta. Duvar mahalin çevriminde
    // olmadığı için sayılmaz.
    const issues = validateProject(makeValidProject({ symbols: [makeWallVent(36, WALL_IDS.leftUpper)] }))
    const ventIssues = issues.filter((issue) => issue.ruleId === 'roomVent')
    expect(ventIssues).toHaveLength(1)
    expect(ventIssues[0].location.roomName).toBe('Mutfak')
  })
})
