import { describe, expect, it } from 'vitest'

import type { ProjectDeviceRow, ProjectUnitRow } from '../../../../api/projectDetail'
import { flattenUnitDeviceRows } from '../unitDeviceRows'

function buildDevice(id: number, name: string): ProjectDeviceRow {
  return {
    id,
    name,
    capacityKcalPerHour: 13200,
    flowCubicMeterPerHour: 1.6,
    brand: null,
    model: null,
    flueType: 'AÇIK',
  }
}

function buildUnit(id: number, devices: ProjectDeviceRow[]): ProjectUnitRow {
  return {
    id,
    unitNumber: `D${id}`,
    subscriberName: 'ABONE',
    subscriberNo: '1',
    meterSerial: 'G4',
    flowCubicMeterPerHour: 3.5,
    pressureMbar: 21,
    areaSquareMeters: 64,
    pipeType: 'Fleks',
    devices,
  }
}

describe('flattenUnitDeviceRows', () => {
  it('her cihaz için ayrı satır üretir', () => {
    const rows = flattenUnitDeviceRows([
      buildUnit(1, [buildDevice(11, 'Ocak'), buildDevice(12, 'Kombi')]),
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0].device?.name).toBe('Ocak')
    expect(rows[1].device?.name).toBe('Kombi')
  })

  it('birim bilgisini yalnız ilk satırda işaretler', () => {
    const rows = flattenUnitDeviceRows([
      buildUnit(1, [buildDevice(11, 'Ocak'), buildDevice(12, 'Kombi')]),
    ])

    expect(rows[0].isFirstOfUnit).toBe(true)
    expect(rows[1].isFirstOfUnit).toBe(false)
  })

  it('cihazı olmayan birim için tek satır üretir', () => {
    const rows = flattenUnitDeviceRows([buildUnit(1, [])])

    expect(rows).toHaveLength(1)
    expect(rows[0].device).toBeNull()
    expect(rows[0].isFirstOfUnit).toBe(true)
  })

  it('her birimin ilk satırı yeniden işaretlenir', () => {
    const rows = flattenUnitDeviceRows([
      buildUnit(1, [buildDevice(11, 'Ocak'), buildDevice(12, 'Kombi')]),
      buildUnit(2, [buildDevice(21, 'Kombi')]),
    ])

    expect(rows.map((row) => row.isFirstOfUnit)).toEqual([true, false, true])
  })

  it('satır anahtarları benzersizdir', () => {
    const rows = flattenUnitDeviceRows([
      buildUnit(1, [buildDevice(11, 'Ocak'), buildDevice(12, 'Kombi')]),
      buildUnit(2, []),
    ])

    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length)
  })

  it('birim yoksa boş dizi döner', () => {
    expect(flattenUnitDeviceRows([])).toEqual([])
  })
})
