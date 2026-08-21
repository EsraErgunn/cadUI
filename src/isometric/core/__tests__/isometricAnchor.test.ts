import { describe, expect, it } from 'vitest'

import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../../plumbing/core/installationModel'
import { DEFAULT_PIPE_TYPE_NAME } from '../../../plumbing/core/pipeTypes'
import type { SymbolMetadata } from '../../../plumbing/core/symbolMetadata'
import { getElementIsometricAnchor } from '../isometricAnchor'

/** Portları GÖVDENİN DIŞINDA duran sembol: çapa ofseti sıfır değil. */
const METER_METADATA: SymbolMetadata = {
  id: 'gasMeter',
  label: 'Sayaç',
  asset: 'gasMeter.svg',
  viewBox: [0, 0, 40, 40],
  origin: [20, 20],
  ports: [
    { id: 'in', type: 'input', position: [0, 20], direction: [1, 0] },
    { id: 'out', type: 'output', position: [40, 20], direction: [1, 0] },
  ],
  bounds: { min: [0, 0], max: [40, 40] },
}

const METER: InstallationElement = {
  id: 900,
  floorId: 10,
  type: 'gasMeter',
  position: { x: 100, y: 50 },
  angleDeg: 0,
  scale: 1,
}

const LINE: InstallationLine = {
  id: 1,
  floorId: 10,
  kind: 'pipe',
  pipeTypeName: DEFAULT_PIPE_TYPE_NAME,
  points: [
    { id: 100, position: { x: 0, y: 50 } },
    { id: 101, position: { x: 80, y: 50 } },
  ],
  segments: [{ id: 1000, fromPointId: 100, toPointId: 101 }],
  pipe: { startHeightCm: 200, endHeightCm: 200, description: '' },
}

const TO_METER: InstallationConnection = {
  lineId: 1,
  end: 'end',
  target: { kind: 'port', elementId: 900, portId: 'in' },
}

describe('getElementIsometricAnchor', () => {
  it('porta bağlı eleman PORT konumuna çapalanır, orijinine değil', () => {
    const anchor = getElementIsometricAnchor(METER, METER_METADATA, [LINE], [TO_METER])

    // Giriş portu gövdenin 20 cm solunda: çapa oraya düşer.
    expect(anchor.position).toEqual({ x: 80, y: 50 })
    expect(anchor.localOffsetCm).toEqual({ x: -20, y: 0 })
  })

  it('çapa boru ucuyla TAM çakışır — kayma kalmaz', () => {
    const anchor = getElementIsometricAnchor(METER, METER_METADATA, [LINE], [TO_METER])

    expect(anchor.position).toEqual(LINE.points[1].position)
  })

  it('döndürülmüş elemanda çapa döner ama YEREL ofset dönmez (sembol billboard)', () => {
    const rotated = { ...METER, angleDeg: 90 }
    const anchor = getElementIsometricAnchor(rotated, METER_METADATA, [LINE], [TO_METER])

    expect(anchor.position).toEqual({ x: 100, y: 30 })
    expect(anchor.localOffsetCm).toEqual({ x: -20, y: 0 })
  })

  it('boruya oturan armatür DÜĞÜMÜN kendisine çapalanır', () => {
    const valve: InstallationElement = { ...METER, id: 901, type: 'valve' }
    const withValve: InstallationLine = {
      ...LINE,
      points: [LINE.points[0], { ...LINE.points[1], inlineElementId: 901 }],
    }

    const anchor = getElementIsometricAnchor(valve, METER_METADATA, [withValve], [])

    expect(anchor.position).toEqual({ x: 80, y: 50 })
    // İki portlu (akış geçişli) sembolün çapası merkezidir.
    expect(anchor.localOffsetCm).toEqual({ x: 0, y: 0 })
  })

  it('hiçbir şeye bağlı olmayan eleman kendi konumunda kalır', () => {
    const anchor = getElementIsometricAnchor(METER, METER_METADATA, [LINE], [])

    expect(anchor.position).toEqual({ x: 100, y: 50 })
    expect(anchor.localOffsetCm).toEqual({ x: 0, y: 0 })
  })
})
