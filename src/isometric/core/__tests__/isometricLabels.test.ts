import { describe, expect, it } from 'vitest'

import type {
  InstallationElement,
  InstallationLine,
} from '../../../plumbing/core/installationModel'
import type { IsometricElevationContext } from '../isometricElevation'
import {
  getIsometricElementLabelLines,
  getIsometricLineLabelAnchor,
  getIsometricLineLabelLines,
} from '../isometricLabels'

function makeLine(overrides: Partial<InstallationLine> = {}): InstallationLine {
  return {
    id: 1,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: 11, position: { x: 0, y: 0 } },
      { id: 12, position: { x: 400, y: 0 } },
    ],
    segments: [{ id: 13, fromPointId: 11, toPointId: 12 }],
    pipe: { startHeightCm: 0, endHeightCm: 0, description: '' },
    ...overrides,
  }
}

/** Etiket testlerinin çoğu tek hatlı: bağlam boş, kot hattın kendisinden gelir. */
const EMPTY_CONTEXT: IsometricElevationContext = { lines: [], connections: [] }

function makeElement(overrides: Partial<InstallationElement> = {}): InstallationElement {
  return {
    id: 100,
    floorId: 1,
    type: 'valve',
    position: { x: 0, y: 0 },
    angleDeg: 0,
    scale: 1,
    ...overrides,
  }
}

describe('getIsometricLineLabelLines', () => {
  it('sıra, 3B boy ve çapı bu düzende yazar', () => {
    expect(getIsometricLineLabelLines(makeLine(), 3, EMPTY_CONTEXT)).toEqual(['(3)', '4,00 m', 'DN25'])
  })

  it('boy GERÇEK 3B uzunluktur (kot farkı dahil)', () => {
    // 400 cm plan + 300 cm kot farkı → 500 cm (3-4-5 üçgeni).
    const line = makeLine({ pipe: { startHeightCm: 0, endHeightCm: 300, description: '' } })
    expect(getIsometricLineLabelLines(line, 1, EMPTY_CONTEXT)).toEqual(['(1)', '5,00 m', 'DN25'])
  })

  it('saf dikey bağlantının boyu yalnız kot farkıdır', () => {
    const line = makeLine({
      points: [
        { id: 11, position: { x: 0, y: 0 } },
        { id: 12, position: { x: 0, y: 0 } },
      ],
      pipe: { startHeightCm: 0, endHeightCm: 275, description: '' },
    })
    expect(getIsometricLineLabelLines(line, 2, EMPTY_CONTEXT)).toEqual(['(2)', '2,75 m', 'DN25'])
  })

  it('deşarj hattında ÇAP yazılmaz, boy baca kotundan hesaplanır', () => {
    const chimney = makeLine({
      kind: 'chimney',
      pipe: undefined,
      chimney: { type: 'Tek cidarlı', startHeightCm: 100, endHeightCm: 400 },
      points: [
        { id: 11, position: { x: 0, y: 0 } },
        { id: 12, position: { x: 0, y: 0 } },
      ],
    })
    expect(getIsometricLineLabelLines(chimney, 7, EMPTY_CONTEXT)).toEqual(['(7)', '3,00 m'])
  })

  it('sıfır boylu hatta boy satırı ÜRETİLMEZ', () => {
    const degenerate = makeLine({
      points: [
        { id: 11, position: { x: 0, y: 0 } },
        { id: 12, position: { x: 0, y: 0 } },
      ],
    })
    expect(getIsometricLineLabelLines(degenerate, 1, EMPTY_CONTEXT)).toEqual(['(1)', 'DN25'])
  })

  it('izometrik kaydırma boyu DEĞİŞTİRMEZ', () => {
    const moved = makeLine()
    moved.points[1].isometricOffsetCm = { x: 900, y: -900 }
    expect(getIsometricLineLabelLines(moved, 1, EMPTY_CONTEXT)).toEqual(
      getIsometricLineLabelLines(makeLine(), 1, EMPTY_CONTEXT),
    )
  })
})

describe('getIsometricElementLabelLines — sayaç', () => {
  it('daire numarası ve birim alanını künye olarak yazar', () => {
    const element = makeElement({
      type: 'gasMeter',
      gasMeter: {
        classLabel: 'G4',
        inletConsumptionPoint: '',
        outletConsumptionPoint: '',
        isIndoor: true,
        isAccessible247: false,
        hasCorrector: false,
        unitNumber: '1',
        areaSquareMeters: 202.1,
        flowCubicMeterPerHour: 6.9,
      },
    })

    expect(getIsometricElementLabelLines(element)).toEqual([
      'Sayaç Daire 1',
      'G4',
      'Birim Alanı (m²): 202,1',
      '6,9 m³/h',
    ])
  })

  it('boş opsiyonel alanlar satır ÜRETMEZ', () => {
    const element = makeElement({
      type: 'gasMeter',
      gasMeter: {
        classLabel: '',
        inletConsumptionPoint: '',
        outletConsumptionPoint: '',
        isIndoor: true,
        isAccessible247: false,
        hasCorrector: false,
      },
    })

    expect(getIsometricElementLabelLines(element)).toEqual(['Sayaç'])
  })

  it('özellikleri hiç doldurulmamış sayaç yalnız adıyla yazılır', () => {
    expect(getIsometricElementLabelLines(makeElement({ type: 'gasMeter' }))).toEqual(['Sayaç'])
  })
})

describe('getIsometricElementLabelLines — yakıcı cihaz', () => {
  it('sınıf + tür, marka/model, kapasite/güç ve debiyi yazar', () => {
    const element = makeElement({
      type: 'combiBoiler',
      combiBoiler: {
        applianceType: 'hermetic',
        brand: 'Marka',
        model: 'X20',
        description: '',
        capacity: '20640 kcal/h',
        power: '24 kW',
        flowCubicMeterPerHour: 2.4,
      },
    })

    expect(getIsometricElementLabelLines(element)).toEqual([
      'Hermetik Kombi',
      'Marka X20',
      '20640 kcal/h · 24 kW',
      '2,4 m³/h',
    ])
  })

  it('kapasite ve güç SERBEST METİN — birim eklenmez', () => {
    const element = makeElement({
      type: 'boiler',
      boiler: {
        applianceType: 'flued',
        brand: '',
        model: '',
        description: '',
        capacity: '13200',
        power: '',
      },
    })

    expect(getIsometricElementLabelLines(element)).toEqual(['Bacalı Kazan', '13200'])
  })

  it('ocak sınıf taşımaz, yalnız adıyla başlar', () => {
    const element = makeElement({
      type: 'stove',
      stove: { brand: '', model: '', description: '', capacity: '', power: '' },
    })

    expect(getIsometricElementLabelLines(element)).toEqual(['Ocak'])
  })

  it('diğer yakıcı cihazda sınıf ve tür birleşir', () => {
    const element = makeElement({
      type: 'otherAppliance',
      otherAppliance: {
        type: 'oven',
        classLabel: 'hermetic',
        brand: '',
        model: '',
        description: '',
        capacity: '',
        power: '',
      },
    })

    expect(getIsometricElementLabelLines(element)).toEqual(['Hermetik Fırın'])
  })
})

describe('getIsometricElementLabelLines — künyesiz elemanlar', () => {
  it('armatürler yalnız adıyla yazılır', () => {
    expect(getIsometricElementLabelLines(makeElement({ type: 'valve' }))).toEqual(['Vana'])
    expect(getIsometricElementLabelLines(makeElement({ type: 'serviceBox' }))).toEqual([
      'Servis Kutusu',
    ])
  })
})

describe('getIsometricLineLabelAnchor', () => {
  it('tek segmentte segmentin ortasını verir', () => {
    expect(getIsometricLineLabelAnchor([[0, 0, 0], [400, 200, 0]])).toEqual([200, 100, 0])
  })

  it('çok köşeli hatta ORTA segmentin ortasına oturur (uca kaçmaz)', () => {
    // L biçimli boru: ilk segmentin ortası seçilseydi etiket hattın ucunda kalırdı.
    const anchor = getIsometricLineLabelAnchor([
      [0, 0, 0],
      [400, 0, 0],
      [400, 0, -300],
      [800, 0, -300],
    ])
    expect(anchor).toEqual([400, 0, -150])
  })

  it('iki noktadan az olan hatta çapa YOKTUR', () => {
    expect(getIsometricLineLabelAnchor([])).toBeNull()
    expect(getIsometricLineLabelAnchor([[0, 0, 0]])).toBeNull()
  })
})
