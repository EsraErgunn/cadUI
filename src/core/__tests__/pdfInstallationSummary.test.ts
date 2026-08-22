import { describe, expect, it, vi } from 'vitest'

import { getInstallationSummary } from '../pdf/installationSummary'

/**
 * Sayaç/cihaz izini `buildMeterReport` sürüyor; burada onun ÇIKTISINI özetleme
 * kuralları sınanıyor. Gerçek izleme mantığının kendi testleri var — burada
 * taklit edilmesi, aynı grafiği iki kez kurmak olurdu.
 */
vi.mock('../../plumbing/core/meterReport', () => ({
  buildMeterReport: vi.fn(),
}))

const { buildMeterReport } = await import('../../plumbing/core/meterReport')
const mockedReport = vi.mocked(buildMeterReport)

type Row = { flowCubicMeterPerHour: number; pressureMbar: number; deviceCount: number }

function withRows(rows: readonly Row[]) {
  mockedReport.mockReturnValue(
    rows.map((row, index) => ({
      meterElementId: index + 1,
      meterOrder: index,
      unitNumber: '',
      subscriberName: '',
      subscriberNo: '',
      classLabel: '',
      flowCubicMeterPerHour: row.flowCubicMeterPerHour,
      pressureMbar: row.pressureMbar,
      areaSquareMeters: 0,
      pipeTypeName: null,
      fittingElementIds: [],
      devices: Array.from({ length: row.deviceCount }, () => ({
        elementId: 0,
        type: 'combiBoiler' as const,
        label: '',
        brand: '',
        model: '',
        capacity: '',
        flowCubicMeterPerHour: 0,
        flueLabel: '',
      })),
    })),
  )

  return getInstallationSummary({
    installationElements: [],
    installationLines: [],
    installationConnections: [],
  })
}

describe('getInstallationSummary', () => {
  it('sayaç, cihaz ve toplam debiyi çizimden sayar', () => {
    const summary = withRows([
      { flowCubicMeterPerHour: 4, pressureMbar: 21, deviceCount: 2 },
      { flowCubicMeterPerHour: 3, pressureMbar: 21, deviceCount: 1 },
    ])

    expect(summary.meterCount).toBe('2')
    expect(summary.deviceCount).toBe('3')
    expect(summary.totalFlowCubicMeterPerHour).toBe('7')
    expect(summary.usagePressure).toBe('21 mbar')
  })

  it('sayaçların basıncı FARKLIYSA basınç yazmaz', () => {
    // Tek sayı seçmek "tesisatın basıncı budur" demek olurdu; çelişkiyi
    // gizlemektense söylememek doğru.
    const summary = withRows([
      { flowCubicMeterPerHour: 4, pressureMbar: 21, deviceCount: 0 },
      { flowCubicMeterPerHour: 3, pressureMbar: 300, deviceCount: 0 },
    ])

    expect(summary.usagePressure).toBe('')
  })

  it('girilmemiş değeri SIFIR olarak yazmaz', () => {
    const summary = withRows([{ flowCubicMeterPerHour: 0, pressureMbar: 0, deviceCount: 0 }])

    expect(summary.meterCount).toBe('1')
    expect(summary.deviceCount).toBe('0')
    expect(summary.totalFlowCubicMeterPerHour).toBe('')
    expect(summary.usagePressure).toBe('')
  })

  it('ondalık debiyi tek hanede yazar', () => {
    const summary = withRows([{ flowCubicMeterPerHour: 5.25, pressureMbar: 21, deviceCount: 0 }])

    expect(summary.totalFlowCubicMeterPerHour).toBe('5.3')
  })

  it('sayaç yoksa hepsini boş bırakır', () => {
    const summary = withRows([])

    expect(summary).toEqual({
      meterCount: '',
      deviceCount: '',
      totalFlowCubicMeterPerHour: '',
      usagePressure: '',
    })
  })
})
