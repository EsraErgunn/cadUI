import { describe, expect, it } from 'vitest'

import { installationElementSchema } from '../plumbingSerialize'

describe('installationElementSchema — eski kayıtlar (bit-bit tur)', () => {
  it('meterOrder/abone/ölçü alanları olmayan eski bir sayaç elemanını AYNEN açar', () => {
    const legacyElement = {
      id: 1,
      floorId: 1,
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
      },
    }

    const parsed = installationElementSchema.parse(legacyElement)

    // Varsayılan bir değer YAZILMAZ: alan yoksa undefined kalır, `0`/'' DEĞİL —
    // yoksa docs/sample-project.json'daki eski bir sayaç, hiç dokunulmamışken
    // bile yeniden serileştirilince "bit bit aynı" kabul testini kırardı.
    expect(parsed.gasMeter).toEqual({
      classLabel: 'G4',
      inletConsumptionPoint: '',
      outletConsumptionPoint: '',
      isIndoor: false,
      isAccessible247: false,
      hasCorrector: false,
    })
  })

  it('yeni "Debi" alanı olmadan kaydedilmiş eski bir kombi elemanını AYNEN açar', () => {
    const legacyElement = {
      id: 2,
      floorId: 1,
      type: 'combiBoiler',
      position: { x: 0, y: 0 },
      angleDeg: 0,
      scale: 1,
      combiBoiler: {
        applianceType: 'hermetic',
        brand: 'BOSCH',
        model: 'Condens 1200 W',
        description: '',
        capacity: '20640',
        power: '',
      },
    }

    const parsed = installationElementSchema.parse(legacyElement)

    expect(parsed.combiBoiler?.flowCubicMeterPerHour).toBeUndefined()
  })

  it('yeni alanları OLAN bir sayaç kaydını da olduğu gibi korur', () => {
    const freshElement = {
      id: 1,
      floorId: 1,
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
    }

    const parsed = installationElementSchema.parse(freshElement)

    expect(parsed.gasMeter).toMatchObject({
      meterOrder: 1,
      unitNumber: 'D20',
      subscriberName: 'FATMA ÇELİK',
      subscriberNo: '10208728',
      flowCubicMeterPerHour: 3.5,
      pressureMbar: 21,
      areaSquareMeters: 64,
    })
  })
})
