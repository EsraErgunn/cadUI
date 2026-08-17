import { describe, expect, it } from 'vitest'

import { createGroundFloor } from '../floors'
import { DEFAULT_FLOOR_ID, type ProjectData } from '../model'
import { serializeProjectDataForBackend } from '../projectExportFormat'
import { parseProjectJson, serializeProjectData } from '../serialize'

const emptyProject: ProjectData = {
  nextUniqueId: 2,
  activeFloorId: DEFAULT_FLOOR_ID,
  floors: [createGroundFloor()],
  points: [],
  walls: [],
  openings: [],
  rooms: [],
  symbols: [],
  areaObjects: [],
  beams: [],
  installationElements: [],
  installationLines: [],
  installationConnections: [],
}

function projectWithMeter(): ProjectData {
  return {
    ...emptyProject,
    nextUniqueId: 10,
    installationElements: [
      {
        id: 2,
        floorId: DEFAULT_FLOOR_ID,
        type: 'gasMeter',
        position: { x: 0, y: 0 },
        angleDeg: 0,
        scale: 1,
        gasMeter: {
          classLabel: 'G4',
          inletConsumptionPoint: '',
          outletConsumptionPoint: '',
          isIndoor: false,
          isAccessible247: false,
          hasCorrector: false,
          meterOrder: 1,
          unitNumber: 'D20',
          subscriberName: 'FATMA ÇELİK',
          subscriberNo: '10208728',
          flowCubicMeterPerHour: 3.5,
          pressureMbar: 21,
          areaSquareMeters: 64,
        },
      },
    ],
  }
}

describe('serializeProjectDataForBackend', () => {
  it('düzenleme modelinin ÜSTÜNE sayaç bazlı unitReport ekler', () => {
    const json = serializeProjectDataForBackend(projectWithMeter())
    const parsed = JSON.parse(json) as { unitReport: unknown[] }

    expect(parsed.unitReport).toEqual([
      {
        meterElementId: 2,
        meterOrder: 1,
        unitNumber: 'D20',
        subscriberName: 'FATMA ÇELİK',
        subscriberNo: '10208728',
        classLabel: 'G4',
        flowCubicMeterPerHour: 3.5,
        pressureMbar: 21,
        areaSquareMeters: 64,
        pipeTypeName: null,
        fittingElementIds: [],
        devices: [],
      },
    ])
  })

  it('sayaç yoksa unitReport boş dizi olur, düzenleme alanları aynen durur', () => {
    const json = serializeProjectDataForBackend(emptyProject)
    const parsed = JSON.parse(json) as Record<string, unknown>

    expect(parsed.unitReport).toEqual([])
    expect(parsed.nextUniqueId).toBe(2)
    expect(parsed.installationElements).toEqual([])
  })

  it('düzenleme alanları serializeProjectData ile BİREBİR aynı (unitReport hariç)', () => {
    const data = projectWithMeter()
    const editableOnly = JSON.parse(serializeProjectData(data)) as Record<string, unknown>
    const withReport = JSON.parse(serializeProjectDataForBackend(data)) as Record<string, unknown>
    delete withReport.unitReport

    expect(withReport).toEqual(editableOnly)
  })

  it('geri İÇE AKTARILINCA unitReport sessizce yok sayılır, düzenleme modeli bozulmaz', () => {
    const json = serializeProjectDataForBackend(projectWithMeter())

    const reloaded = parseProjectJson(json)

    expect(reloaded.installationElements).toHaveLength(1)
    expect(reloaded.installationElements[0].gasMeter?.unitNumber).toBe('D20')
    expect('unitReport' in reloaded).toBe(false)
  })
})
