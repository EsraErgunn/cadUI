import { describe, expect, it } from 'vitest'

import { addMonths, buildDefaultValues } from '../projects/newProjectDefaults'
import {
  createNewProjectSchema,
  firstErrorField,
  MAX_CAPACITY_CUBIC_METER_PER_HOUR,
  NEW_PROJECT_ERRORS,
  toCreateProjectPayload,
  validateNewProject,
  type NewProjectFormValues,
} from '../projects/newProjectSchema'

const TODAY = new Date(2026, 7, 4)

function validValues(): NewProjectFormValues {
  return {
    ...buildDefaultValues(TODAY),
    name: 'Yıldız Apartmanı Doğalgaz Tesisatı',
    projectFirmId: 11,
    gasDistributionFirmId: 101,
    engineerUserId: 501,
    cityId: 6,
    districtId: 64,
    address: 'Çankaya Mahallesi 12. Sokak No 5',
    projectType: 'ILAVE',
    heatingType: 'bireysel',
    buildingUsageType: 'coklu',
  }
}

function errorsFor(values: NewProjectFormValues, isAdmin: boolean) {
  return validateNewProject(values, { isAdmin }).errors
}

describe('buildDefaultValues', () => {
  it('başlama tarihi bugün, bitiş tarihi iki ay sonrası', () => {
    const values = buildDefaultValues(TODAY)

    expect(values.startDate).toBe('2026-08-04')
    expect(values.endDate).toBe('2026-10-04')
  })

  it('sayısal alanlar sıfır, S.K. basıncı 21 gelir', () => {
    const values = buildDefaultValues(TODAY)

    expect(values.apartmentCount).toBe(0)
    expect(values.workplaceCount).toBe(0)
    expect(values.areaSquareMeters).toBe(0)
    expect(values.capacityCubicMeterPerHour).toBe(0)
    expect(values.serviceBoxPressureMbar).toBe(21)
  })

  it('ruhsat proje işaretsiz, seçim kutuları boş başlar', () => {
    const values = buildDefaultValues(TODAY)

    expect(values.isPermitProject).toBe(false)
    expect(values.projectFirmId).toBeNull()
    expect(values.engineerUserId).toBeNull()
  })

  it('ısınma tipi ve bina kullanımı tipi BOŞ açılır — sessizce ilk seçeneğe düşmez', () => {
    const values = buildDefaultValues(TODAY)

    expect(values.heatingType).toBe('')
    expect(values.buildingUsageType).toBe('')
  })

  it('boş bırakılan ısınma / bina kullanımı tipi zorunluluk hatası verir', () => {
    const errors = validateNewProject(buildDefaultValues(TODAY), { isAdmin: true }).errors

    expect(errors.heatingType).toBe(NEW_PROJECT_ERRORS.heatingType)
    expect(errors.buildingUsageType).toBe(NEW_PROJECT_ERRORS.buildingUsageType)
  })
})

describe('addMonths', () => {
  it('karşılığı olmayan günü ayın son gününe çeker', () => {
    // 31 Aralık + 2 ay JavaScript'te 3 Mart'a kayar; beklenen 28 Şubat.
    expect(addMonths(new Date(2026, 11, 31), 2)).toEqual(new Date(2027, 1, 28))
  })

  it('normal günlerde günü korur', () => {
    expect(addMonths(new Date(2026, 7, 4), 2)).toEqual(new Date(2026, 9, 4))
  })
})

describe('validateNewProject', () => {
  it('geçerli değerleri kabul eder', () => {
    expect(validateNewProject(validValues(), { isAdmin: true }).data).not.toBeNull()
  })

  it('boş formda her zorunlu alan için belgedeki mesajı üretir', () => {
    const errors = errorsFor(buildDefaultValues(TODAY), true)

    expect(errors.name).toBe(NEW_PROJECT_ERRORS.name)
    expect(errors.projectFirmId).toBe(NEW_PROJECT_ERRORS.projectFirm)
    expect(errors.gasDistributionFirmId).toBe(NEW_PROJECT_ERRORS.gasDistributionFirm)
    expect(errors.engineerUserId).toBe(NEW_PROJECT_ERRORS.engineer)
    expect(errors.address).toBe(NEW_PROJECT_ERRORS.address)
    expect(errors.projectType).toBe(NEW_PROJECT_ERRORS.projectType)
    expect(errors.heatingType).toBe(NEW_PROJECT_ERRORS.heatingType)
    expect(errors.buildingUsageType).toBe(NEW_PROJECT_ERRORS.buildingUsageType)
  })

  it('yalnız boşluktan oluşan proje adını boş sayar', () => {
    expect(errorsFor({ ...validValues(), name: '   ' }, true).name).toBe(NEW_PROJECT_ERRORS.name)
  })

  it('bitiş tarihi başlama tarihinden önceyse hata verir', () => {
    const errors = errorsFor(
      { ...validValues(), startDate: '2026-08-04', endDate: '2026-08-03' },
      true,
    )

    expect(errors.endDate).toBe(NEW_PROJECT_ERRORS.endBeforeStart)
  })

  /**
   * TUZAK TESTİ: tarih kuralı bilerek şemanın DIŞINDA (zod'un refine'ı kardeş alan
   * hatalıyken çalışmıyor). Biri şemayı tek başına `parse` ederse kural sessizce
   * kaybolur. Kural şemaya geri taşınırsa buradaki ilk beklenti kırılır — o zaman
   * bu test silinir, ama kimse durumu fark etmeden geçemez.
   */
  it('şema TEK BAŞINA tarih kuralını bilmez; doğrulama validateNewProject üzerinden yapılmalı', () => {
    const values = { ...validValues(), startDate: '2026-08-04', endDate: '2026-08-03' }

    expect(createNewProjectSchema({ isAdmin: true }).safeParse(values).success).toBe(true)
    expect(validateNewProject(values, { isAdmin: true }).errors.endDate).toBe(
      NEW_PROJECT_ERRORS.endBeforeStart,
    )
    expect(validateNewProject(values, { isAdmin: true }).data).toBeNull()
  })

  it('bitiş tarihi başlama tarihine eşitse kabul eder', () => {
    const errors = errorsFor(
      { ...validValues(), startDate: '2026-08-04', endDate: '2026-08-04' },
      true,
    )

    expect(errors.endDate).toBeUndefined()
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

  it('alan ve kapasite kesirli olabilir', () => {
    const errors = errorsFor(
      { ...validValues(), areaSquareMeters: 120.5, capacityCubicMeterPerHour: 4.2 },
      true,
    )

    expect(errors.areaSquareMeters).toBeUndefined()
    expect(errors.capacityCubicMeterPerHour).toBeUndefined()
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
    expect(firstErrorField({ heatingType: 'x', engineerUserId: 'y' })).toBe('engineerUserId')
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
