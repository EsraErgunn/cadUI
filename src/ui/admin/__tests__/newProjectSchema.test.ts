import { describe, expect, it } from 'vitest'

import { buildDefaultValues } from '../projects/newProjectDefaults'
import {
  firstErrorField,
  MAX_CAPACITY_CUBIC_METER_PER_HOUR,
  NEW_PROJECT_ERRORS,
  toCreateProjectPayload,
  validateNewProject,
  type NewProjectFormValues,
} from '../projects/newProjectSchema'

/** Kod kimlikleri kod grubu ucundan gelir; testte yalnız "bir kimlik" olmaları
    yetiyor — sayısal değerler sözleşme değil (bkz. api/codes.ts). */
const PROJECT_TYPE_CODE_ID = 3
const HEATING_TYPE_CODE_ID = 8
const BUILDING_USAGE_TYPE_CODE_ID = 12

function validValues(): NewProjectFormValues {
  return {
    ...buildDefaultValues(),
    name: 'Yıldız Apartmanı Doğalgaz Tesisatı',
    projectFirmId: 11,
    gasDistributionFirmId: 101,
    cityId: 6,
    districtId: 64,
    address: 'Çankaya Mahallesi 12. Sokak No 5',
    projectTypeCodeId: PROJECT_TYPE_CODE_ID,
    heatingTypeCodeId: HEATING_TYPE_CODE_ID,
    buildingUsageTypeCodeId: BUILDING_USAGE_TYPE_CODE_ID,
  }
}

function errorsFor(values: NewProjectFormValues, isAdmin: boolean) {
  return validateNewProject(values, { isAdmin }).errors
}

describe('buildDefaultValues', () => {
  it('sayısal alanlar sıfır, S.K. basıncı 21 gelir', () => {
    const values = buildDefaultValues()

    expect(values.apartmentCount).toBe(0)
    expect(values.workplaceCount).toBe(0)
    expect(values.areaSquareMeters).toBe(0)
    expect(values.capacityCubicMeterPerHour).toBe(0)
    expect(values.serviceBoxPressureMbar).toBe(21)
  })

  it('ruhsat proje işaretsiz, seçim kutuları boş başlar', () => {
    const values = buildDefaultValues()

    expect(values.isPermitProject).toBe(false)
    expect(values.projectFirmId).toBeNull()
    expect(values.gasDistributionFirmId).toBeNull()
  })

  it('ısınma tipi ve bina kullanımı tipi BOŞ açılır — sessizce ilk seçeneğe düşmez', () => {
    const values = buildDefaultValues()

    expect(values.heatingTypeCodeId).toBeNull()
    expect(values.buildingUsageTypeCodeId).toBeNull()
  })

  it('boş bırakılan ısınma / bina kullanımı tipi zorunluluk hatası verir', () => {
    const errors = validateNewProject(buildDefaultValues(), { isAdmin: true }).errors

    expect(errors.heatingTypeCodeId).toBe(NEW_PROJECT_ERRORS.heatingType)
    expect(errors.buildingUsageTypeCodeId).toBe(NEW_PROJECT_ERRORS.buildingUsageType)
  })
})

describe('validateNewProject', () => {
  it('geçerli değerleri kabul eder', () => {
    expect(validateNewProject(validValues(), { isAdmin: true }).data).not.toBeNull()
  })

  it('boş formda her zorunlu alan için belgedeki mesajı üretir', () => {
    const errors = errorsFor(buildDefaultValues(), true)

    expect(errors.name).toBe(NEW_PROJECT_ERRORS.name)
    expect(errors.projectFirmId).toBe(NEW_PROJECT_ERRORS.projectFirm)
    expect(errors.gasDistributionFirmId).toBe(NEW_PROJECT_ERRORS.gasDistributionFirm)
    expect(errors.address).toBe(NEW_PROJECT_ERRORS.address)
    expect(errors.projectTypeCodeId).toBe(NEW_PROJECT_ERRORS.projectType)
    expect(errors.heatingTypeCodeId).toBe(NEW_PROJECT_ERRORS.heatingType)
    expect(errors.buildingUsageTypeCodeId).toBe(NEW_PROJECT_ERRORS.buildingUsageType)
  })

  it('yalnız boşluktan oluşan proje adını boş sayar', () => {
    expect(errorsFor({ ...validValues(), name: '   ' }, true).name).toBe(NEW_PROJECT_ERRORS.name)
  })

  it('negatif sayısal değeri reddeder', () => {
    const errors = errorsFor(
      { ...validValues(), apartmentCount: -1, capacityCubicMeterPerHour: -5 },
      true,
    )

    expect(errors.apartmentCount).toBe(NEW_PROJECT_ERRORS.negative)
    expect(errors.capacityCubicMeterPerHour).toBe(NEW_PROJECT_ERRORS.negative)
  })

  it('daire ve işyeri adedini kesirli kabul etmez', () => {
    const errors = errorsFor({ ...validValues(), apartmentCount: 2.5, workplaceCount: 1.5 }, true)

    expect(errors.apartmentCount).toBe(NEW_PROJECT_ERRORS.integer)
    expect(errors.workplaceCount).toBe(NEW_PROJECT_ERRORS.integer)
  })

  it('kapasite tavanı aşılırsa hata verir', () => {
    const errors = errorsFor(
      { ...validValues(), capacityCubicMeterPerHour: MAX_CAPACITY_CUBIC_METER_PER_HOUR + 1 },
      true,
    )

    expect(errors.capacityCubicMeterPerHour).toBe(NEW_PROJECT_ERRORS.maxCapacity)
  })

  it('kapasite tavanın kendisini kabul eder', () => {
    const errors = errorsFor(
      { ...validValues(), capacityCubicMeterPerHour: MAX_CAPACITY_CUBIC_METER_PER_HOUR },
      true,
    )

    expect(errors.capacityCubicMeterPerHour).toBeUndefined()
  })

  /** Uçtaki karşılıklarının hepsi int32; ondalık gövde 400 döner. */
  it('alan, kapasite ve S.K. basıncı da kesirli kabul etmez', () => {
    const errors = errorsFor(
      {
        ...validValues(),
        areaSquareMeters: 120.5,
        capacityCubicMeterPerHour: 4.2,
        serviceBoxPressureMbar: 21.5,
      },
      true,
    )

    expect(errors.areaSquareMeters).toBe(NEW_PROJECT_ERRORS.integer)
    expect(errors.capacityCubicMeterPerHour).toBe(NEW_PROJECT_ERRORS.integer)
    expect(errors.serviceBoxPressureMbar).toBe(NEW_PROJECT_ERRORS.integer)
  })

  it('admin değilse firma alanları boş olsa da geçerli', () => {
    const errors = errorsFor(
      { ...validValues(), projectFirmId: null, gasDistributionFirmId: null },
      false,
    )

    expect(errors.projectFirmId).toBeUndefined()
    expect(errors.gasDistributionFirmId).toBeUndefined()
  })

  it('bağlantı nesnesi ve ada/pafta/parsel boş bırakılabilir', () => {
    const errors = errorsFor({ ...validValues(), connectionObject: '', parcelInfo: '' }, true)

    expect(errors.connectionObject).toBeUndefined()
    expect(errors.parcelInfo).toBeUndefined()
  })
})

describe('firstErrorField', () => {
  it('şema sırasını değil ekran sırasını izler', () => {
    expect(firstErrorField({ address: 'x', name: 'y' })).toBe('name')
    expect(firstErrorField({ heatingTypeCodeId: 'x', cityId: 'y' })).toBe('cityId')
  })

  it('hata yoksa null döner', () => {
    expect(firstErrorField({})).toBeNull()
  })
})

describe('toCreateProjectPayload', () => {
  function parse(values: NewProjectFormValues, isAdmin: boolean) {
    const { data } = validateNewProject(values, { isAdmin })
    if (data === null) throw new Error('geçerli değerler bekleniyordu')
    return toCreateProjectPayload(data, { isAdmin })
  }

  /** Kod METNİ değil KİMLİK taşınır: uç `*CodeId` istiyor (api/codes.ts). */
  it('üç tipin kod kimliğini gövdeye taşır', () => {
    const payload = parse(validValues(), true)

    expect(payload.projectTypeCodeId).toBe(PROJECT_TYPE_CODE_ID)
    expect(payload.heatingTypeCodeId).toBe(HEATING_TYPE_CODE_ID)
    expect(payload.buildingUsageTypeCodeId).toBe(BUILDING_USAGE_TYPE_CODE_ID)
  })

  it('tesisat ve yapı alanlarını gövdeye taşır', () => {
    const payload = parse(
      {
        ...validValues(),
        isPermitProject: true,
        apartmentCount: 4,
        workplaceCount: 2,
        areaSquareMeters: 120,
        connectionObject: 'Servis kutusu',
        capacityCubicMeterPerHour: 12,
        serviceBoxPressureMbar: 21,
        coverNote: ' Kapak açıklaması ',
      },
      true,
    )

    expect(payload).toMatchObject({
      isPermitProject: true,
      apartmentCount: 4,
      workplaceCount: 2,
      areaSquareMeters: 120,
      connectionObject: 'Servis kutusu',
      capacityCubicMeterPerHour: 12,
      serviceBoxPressureMbar: 21,
      coverNote: 'Kapak açıklaması',
    })
  })

  it('admin gövdesinde firma kimlikleri bulunur', () => {
    const payload = parse(validValues(), true)

    expect(payload.projectFirmId).toBe(11)
    expect(payload.gasDistributionFirmId).toBe(101)
  })

  it('admin değilse firma kimlikleri gövdeye HİÇ konmaz', () => {
    const payload = parse({ ...validValues(), projectFirmId: 11 }, false)

    expect('projectFirmId' in payload).toBe(false)
    expect('gasDistributionFirmId' in payload).toBe(false)
  })

  it('boş opsiyonel metinler null gider, dolu olanlar kırpılır', () => {
    const payload = parse(
      { ...validValues(), connectionObject: '  ', parcelInfo: ' 12/3 ', coverNote: '' },
      true,
    )

    expect(payload.connectionObject).toBeNull()
    expect(payload.parcelInfo).toBe('12/3')
    expect(payload.coverNote).toBeNull()
  })

  it('P_ID gövdede yer almaz — sunucu üretir', () => {
    expect('pId' in parse(validValues(), true)).toBe(false)
  })
})
