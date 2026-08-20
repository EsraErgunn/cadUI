import { describe, expect, it } from 'vitest'

import type { InstallationLine } from '../../../plumbing/core/installationModel'
import type { PipeTypeName } from '../../../plumbing/core/pipeTypes'
import { getUsedPipeTypeNames } from '../isometricLegend'

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

describe('getUsedPipeTypeNames', () => {
  it('yalnız çizimde geçen çapları verir', () => {
    expect(getUsedPipeTypeNames([makeLine(1, 'DN25'), makeLine(2, 'DN15')])).toEqual([
      'DN15',
      'DN25',
    ])
  })

  it('sıra KATALOG sırasıdır, çizim sırası değil', () => {
    // Çizim sırası kullanılsaydı aynı proje iki açılışta farklı sıralanabilirdi.
    expect(
      getUsedPipeTypeNames([makeLine(1, 'DN50'), makeLine(2, 'DN15'), makeLine(3, 'DN32')]),
    ).toEqual(['DN15', 'DN32', 'DN50'])
  })

  it('aynı çap iki kez listelenmez', () => {
    expect(getUsedPipeTypeNames([makeLine(1, 'DN25'), makeLine(2, 'DN25')])).toEqual(['DN25'])
  })

  it('deşarj hatları sayılmaz — çapları yok', () => {
    expect(
      getUsedPipeTypeNames([
        makeLine(1, 'DN25', 'chimney'),
        makeLine(2, 'DN32', 'ventilationDuct'),
      ]),
    ).toEqual([])
  })

  it('boş çizimde boş liste', () => {
    expect(getUsedPipeTypeNames([])).toEqual([])
  })
})
