import { describe, expect, it } from 'vitest'

import type { InstallationLine } from '../../../plumbing/core/installationModel'
import type { PipeTypeName } from '../../../plumbing/core/pipeTypes'
import { getIsometricLegendRows } from '../isometricLegend'

function makeLine(
  id: number,
  pipeTypeName: PipeTypeName,
  kind: InstallationLine['kind'] = 'pipe',
): InstallationLine {
  return {
    id,
    floorId: 1,
    kind,
    pipeTypeName,
    points: [
      { id: id * 10 + 1, position: { x: 0, y: 0 } },
      { id: id * 10 + 2, position: { x: 100, y: 0 } },
    ],
    segments: [{ id: id * 10 + 3, fromPointId: id * 10 + 1, toPointId: id * 10 + 2 }],
  }
}

describe('getIsometricLegendRows', () => {
  it('yalnız çizimde geçen çapları verir', () => {
    const rows = getIsometricLegendRows([makeLine(1, 'DN25'), makeLine(2, 'DN15')])
    expect(rows.map((row) => row.label)).toEqual(['DN15', 'DN25'])
  })

  it('sıra KATALOG sırasıdır, çizim sırası değil', () => {
    // Çizim sırası kullanılsaydı aynı proje iki açılışta farklı sıralanabilirdi.
    const rows = getIsometricLegendRows([
      makeLine(1, 'DN50'),
      makeLine(2, 'DN15'),
      makeLine(3, 'DN32'),
    ])
    expect(rows.map((row) => row.rowId)).toEqual(['DN15', 'DN32', 'DN50'])
  })

  it('aynı çap iki kez listelenmez', () => {
    expect(getIsometricLegendRows([makeLine(1, 'DN25'), makeLine(2, 'DN25')])).toHaveLength(1)
  })

  it('cihaz kolu da çapıyla sayılır — o da gaz taşıyor', () => {
    const rows = getIsometricLegendRows([makeLine(1, 'DN32', 'applianceStub')])
    expect(rows.map((row) => row.rowId)).toEqual(['DN32'])
  })

  it('deşarj hatları TÜR adıyla ve gaz çaplarından SONRA gelir', () => {
    const rows = getIsometricLegendRows([
      makeLine(1, 'DN25', 'chimney'),
      makeLine(2, 'DN32', 'ventilationDuct'),
      makeLine(3, 'DN25', 'pipe'),
    ])
    expect(rows.map((row) => row.rowId)).toEqual(['DN25', 'chimney', 'ventilationDuct'])
    expect(rows.map((row) => row.label)).toEqual(['DN25', 'Baca', 'Havalandırma Kanalı'])
  })

  it('satırda ölçü YOK — dış çap ve toplam boy açıklamadan kaldırıldı (K166)', () => {
    const [row] = getIsometricLegendRows([makeLine(1, 'DN25')])
    expect(Object.keys(row).sort()).toEqual(['label', 'rowId'])
  })

  it('boş çizimde satır yok', () => {
    expect(getIsometricLegendRows([])).toEqual([])
  })
})
