import { describe, expect, it } from 'vitest'

import {
  FLOOR_ID,
  GROUND_FLOOR,
  SERVICE_BOX,
  WALL_IDS,
  makeDoor,
  makeElement,
  makeSource,
  makeValidProject,
  ruleIds,
} from './validationFixture'
import { validateProject } from '../validate'

describe('validateProject — kuralsız taban', () => {
  it('kusursuz projede hata bulmaz', () => {
    expect(validateProject(makeValidProject())).toEqual([])
  })

  it('her satır kat künyesi taşır', () => {
    const issues = validateProject(makeSource({ walls: [], points: [], rooms: [] }))
    expect(issues.every((issue) => issue.location.floorId === FLOOR_ID)).toBe(true)
  })

  it('aynı proje iki kez denetlenince aynı anahtarları verir', () => {
    const source = makeValidProject({ openings: [] })
    expect(validateProject(source).map((issue) => issue.key)).toEqual(
      validateProject(source).map((issue) => issue.key),
    )
  })
})

describe('Hata1 — kat planı', () => {
  it('duvarsız kat mimari planı ister', () => {
    const issues = ruleIds(makeSource({ walls: [], points: [], rooms: [] }))
    expect(issues).toContain('architecturePlan')
  })

  it('mimari yokken mahal kuralları çalışmaz', () => {
    const issues = ruleIds(makeSource({ walls: [], points: [], rooms: [] }))
    expect(issues).not.toContain('roomDoorAccess')
  })

  it('tesisatı olmayan kat tesisat planı ister', () => {
    expect(ruleIds(makeSource())).toContain('installationPlan')
  })

  it('yalnız servis kutusu konmuş kat tesisat planı istemez', () => {
    const issues = ruleIds(
      makeSource({ installationElements: [makeElement(40, 'serviceBox', SERVICE_BOX)] }),
    )
    expect(issues).not.toContain('installationPlan')
  })

  it('her kat kendi başına denetlenir', () => {
    const source = makeSource({
      floors: [GROUND_FLOOR, { id: 2, name: '1. Kat', heightCm: 300, isBasement: false }],
    })
    const floorIds = validateProject(source)
      .filter((issue) => issue.ruleId === 'architecturePlan')
      .map((issue) => issue.location.floorId)
    expect(floorIds).toEqual([2])
  })
})

describe('Hata2 — mahal kapısı', () => {
  it('kapısız mahali bildirir ve adını yazar', () => {
    const issues = validateProject(makeValidProject({ openings: [makeDoor(30, WALL_IDS.leftLower)] }))
    const doorIssues = issues.filter((issue) => issue.ruleId === 'roomDoorAccess')
    expect(doorIssues).toHaveLength(1)
    expect(doorIssues[0].location.roomName).toBe('Salon')
  })

  it('göster hedefi mimari görünümde mahalin duvarlarıdır', () => {
    const issue = validateProject(makeValidProject({ openings: [] })).find(
      (candidate) => candidate.ruleId === 'roomDoorAccess',
    )
    expect(issue?.focus?.view).toBe('architecture')
  })
})
