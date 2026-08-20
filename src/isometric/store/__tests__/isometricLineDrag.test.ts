import { beforeEach, describe, expect, it } from 'vitest'

import { undoActiveView } from '../../../store/activeViewHistory'
import { useCadStore } from '../../../store/cadStore'
import { useUiStore } from '../../../store/uiStore'

function seedPipe(): { lineId: number; pointIds: number[] } {
  const result = useCadStore.getState().addLine({
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 300 },
    ],
  })
  // `addLine` uç bağlanamazsa null döner; fixture'ın kurulamaması testin
  // sessizce boş geçmesi demek olurdu.
  if (!result) throw new Error('Test borusu kurulamadı')

  const line = useCadStore
    .getState()
    .installationLines.find((candidate) => candidate.id === result.lineId)
  return { lineId: result.lineId, pointIds: (line?.points ?? []).map((point) => point.id) }
}

function readPoints(lineId: number) {
  return (
    useCadStore.getState().installationLines.find((candidate) => candidate.id === lineId)?.points ??
    []
  )
}

beforeEach(() => {
  useCadStore.getState().resetProject()
})

describe('applyIsometricLineDrag', () => {
  it('sürüklenen noktadan SONRAKİLER birlikte kayar, ÖNCEKİLER durur', () => {
    const { lineId, pointIds } = seedPipe()

    useCadStore.getState().applyIsometricLineDrag(lineId, pointIds[1], { x: 50, y: -80 })

    const points = readPoints(lineId)
    expect(points[0].isometricOffsetCm).toBeUndefined()
    expect(points[0].inheritedIsometricOffsetCm).toBeUndefined()
    expect(points[1].isometricOffsetCm).toEqual({ x: 50, y: -80 })
    expect(points[2].inheritedIsometricOffsetCm).toEqual({ x: 50, y: -80 })
  })

  it('PLAN konumlarına dokunmaz — izometrik ayıklama çizimi bozmaz', () => {
    const { lineId, pointIds } = seedPipe()
    const before = readPoints(lineId).map((point) => ({ ...point.position }))

    useCadStore.getState().applyIsometricLineDrag(lineId, pointIds[0], { x: 999, y: -999 })

    expect(readPoints(lineId).map((point) => point.position)).toEqual(before)
  })

  it('bir sürükleme = bir Ctrl+Z (izometrik TESİSAT geçmişine yazar)', () => {
    // Proje geçmişine yazsaydı izometrikte Ctrl+Z en son çizilen duvarı geri
    // alırdı; dallanma `activeViewHistory.ts`'te.
    useUiStore.setState({ activeViewId: 'isometric' })
    const { lineId, pointIds } = seedPipe()
    useCadStore.getState().applyIsometricLineDrag(lineId, pointIds[1], { x: 50, y: -80 })

    undoActiveView()

    expect(readPoints(lineId)[1].isometricOffsetCm).toBeUndefined()
  })

  it('sıfır kayma ve bilinmeyen hat durumu değiştirmez', () => {
    const { lineId, pointIds } = seedPipe()
    const before = readPoints(lineId)

    useCadStore.getState().applyIsometricLineDrag(lineId, pointIds[1], { x: 0, y: 0 })
    useCadStore.getState().applyIsometricLineDrag(9999, pointIds[1], { x: 5, y: 5 })

    expect(readPoints(lineId)).toEqual(before)
  })

  it('sıfırlama sürükleme kaymalarını da temizler', () => {
    const { lineId, pointIds } = seedPipe()
    useCadStore.getState().applyIsometricLineDrag(lineId, pointIds[1], { x: 50, y: -80 })

    useCadStore.getState().resetIsometricPositions()

    for (const point of readPoints(lineId)) {
      expect(point.isometricOffsetCm).toBeUndefined()
      expect(point.inheritedIsometricOffsetCm).toBeUndefined()
    }
  })
})
