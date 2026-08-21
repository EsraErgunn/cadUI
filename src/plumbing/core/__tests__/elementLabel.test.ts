import { describe, expect, it } from 'vitest'

import { getElementLabelText } from '../elementLabel'
import type { GasMeterProperties } from '../elementProperties'
import type { InstallationElement } from '../installationModel'
import type { SymbolMetadata } from '../symbolMetadata'

const GAS_METER_METADATA: SymbolMetadata = {
  id: 'gasMeter',
  label: 'Sayaç',
  asset: 'gas-meter.svg',
  viewBox: [0, 0, 100, 100],
  origin: [0, 0],
  ports: [],
  bounds: { min: [0, 0], max: [100, 100] },
}

/** Zorunlu alanlar etiketle ilgisiz; her sınavda tekrarlanmasın diye burada. */
const BASE_GAS_METER: GasMeterProperties = {
  classLabel: '',
  inletConsumptionPoint: '',
  outletConsumptionPoint: '',
  isIndoor: false,
  isAccessible247: false,
  hasCorrector: false,
}

function makeGasMeter(gasMeter?: Partial<GasMeterProperties>): InstallationElement {
  return {
    id: 1,
    floorId: 2,
    type: 'gasMeter',
    position: { x: 0, y: 0 },
    angleDeg: 0,
    scale: 1,
    gasMeter: gasMeter && { ...BASE_GAS_METER, ...gasMeter },
  }
}

describe('getElementLabelText — sayaç', () => {
  it('birim, abone adı ve abone numarasını isimden sonra alt alta yazar', () => {
    const label = getElementLabelText(
      makeGasMeter({ unitNumber: '3', subscriberName: 'FATMA ÇELİK', subscriberNo: '10045' }),
      GAS_METER_METADATA,
    )

    expect(label).toBe('Sayaç\nBirim: 3\nFATMA ÇELİK\nAbone No: 10045')
  })

  it('boş bırakılan alanı satır olarak yazmaz', () => {
    const label = getElementLabelText(
      makeGasMeter({ unitNumber: '', subscriberName: 'FATMA ÇELİK', subscriberNo: '  ' }),
      GAS_METER_METADATA,
    )

    expect(label).toBe('Sayaç\nFATMA ÇELİK')
  })

  it('özellikleri hiç girilmemiş sayaçta yalnız tür adını yazar', () => {
    expect(getElementLabelText(makeGasMeter(), GAS_METER_METADATA)).toBe('Sayaç')
  })
})
