import { describe, expect, it } from 'vitest'

import type { ProjectFirm, ProjectFirmFullDto } from '../../../../api/projectFirmDto'
import { toProjectFirmPayloadDto } from '../../../../api/projectFirmDto'
import {
  PROJECT_FIRM_ERRORS,
  toProjectFirmFormValues,
  toProjectFirmPayload,
  validateProjectFirm,
} from '../projectFirmSchema'
import { findTakenProjectFirmErrors } from '../projectFirmUniqueness'

/** `GET /api/projectfirms/{id}` yanıtının sözleşmedeki tam şekli. */
function buildDetail(overrides: Partial<ProjectFirmFullDto> = {}): ProjectFirmFullDto {
  return {
    id: 7,
    companyType: 2,
    title: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
    taxNumber: '1234567890',
    nationalIdNumber: null,
    accountingCode: 'CARI-1',
    serialNumber: 'SR-001',
    contactPerson: 'Ahmet Yılmaz',
    email: 'bilgi@adana.com.tr',
    phone: '0532 100 00 00',
    phone2: '0532 200 00 00',
    address: 'Merkez Mah. No:1',
    ...overrides,
  }
}

function buildListRow(overrides: Partial<ProjectFirm> = {}): ProjectFirm {
  return {
    id: 7,
    serialNumber: null,
    qualificationNumber: null,
    name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
    authorizedPerson: 'Ahmet Yılmaz',
    email: 'bilgi@adana.com.tr',
    phone: '05321000000',
    mobilePhone: null,
    taxNumber: '1234567890',
    ...overrides,
  }
}

describe('toProjectFirmFormValues', () => {
  it('detay yanıtındaki tüm alanları forma taşır', () => {
    const values = toProjectFirmFormValues(buildDetail())

    expect(values).toEqual({
      name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
      accountingCode: 'CARI-1',
      serialNumber: 'SR-001',
      authorizedPerson: 'Ahmet Yılmaz',
      email: 'bilgi@adana.com.tr',
      taxNumber: '1234567890',
      isSoleProprietorship: false,
      nationalId: '',
      address: 'Merkez Mah. No:1',
      // Sunucudaki maskeli numara HAM rakama indirgenir.
      phoneDigits: '05321000000',
      phone2Digits: '05322000000',
    })
  })

  it('null alanları boş dizeye çevirir', () => {
    const values = toProjectFirmFormValues(
      buildDetail({ accountingCode: null, serialNumber: null, address: null, phone2: null }),
    )

    expect(values.accountingCode).toBe('')
    expect(values.serialNumber).toBe('')
    expect(values.address).toBe('')
    expect(values.phone2Digits).toBe('')
  })

  it('companyType 1 ise şahıs şirketi işaretlenir ve kimlik taşınır', () => {
    const values = toProjectFirmFormValues(
      buildDetail({ companyType: 1, taxNumber: null, nationalIdNumber: '12345678901' }),
    )

    expect(values.isSoleProprietorship).toBe(true)
    expect(values.nationalId).toBe('12345678901')
  })
})

/**
 * PUT gövdesi sözleşmenin ON BİR alanını da taşımalı: eksik gönderilen alan
 * sunucuda SİLİNİR (`PUT` kısmi güncelleme yapmıyor).
 */
describe('PUT gövdesi', () => {
  it('sözleşmedeki tüm alanları sunucunun adlarıyla gönderir', () => {
    const { data } = validateProjectFirm(toProjectFirmFormValues(buildDetail()))
    const dto = toProjectFirmPayloadDto(toProjectFirmPayload(data!))

    expect(dto).toEqual({
      companyType: 2,
      title: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
      taxNumber: '1234567890',
      nationalIdNumber: null,
      accountingCode: 'CARI-1',
      serialNumber: 'SR-001',
      contactPerson: 'Ahmet Yılmaz',
      email: 'bilgi@adana.com.tr',
      phone: '05321000000',
      phone2: '05322000000',
      address: 'Merkez Mah. No:1',
    })
  })

  it('detaydan gelen değerler tur atınca korunur (alan kaybı yok)', () => {
    const detail = buildDetail()
    const { data } = validateProjectFirm(toProjectFirmFormValues(detail))
    const dto = toProjectFirmPayloadDto(toProjectFirmPayload(data!))

    expect(dto.serialNumber).toBe(detail.serialNumber)
    expect(dto.address).toBe(detail.address)
    expect(dto.accountingCode).toBe(detail.accountingCode)
  })

  /** Sözleşmedeki alan KÜMESİ: fazlası da eksiği de sözleşme ihlali. */
  it('gövde tam olarak sözleşmenin on bir alanını taşır', () => {
    const { data } = validateProjectFirm(toProjectFirmFormValues(buildDetail()))
    const dto = toProjectFirmPayloadDto(toProjectFirmPayload(data!))

    expect(Object.keys(dto).sort()).toEqual(
      [
        'accountingCode',
        'address',
        'companyType',
        'contactPerson',
        'email',
        'nationalIdNumber',
        'phone',
        'phone2',
        'serialNumber',
        'taxNumber',
        'title',
      ].sort(),
    )
  })

  /**
   * TÜZEL firmada da kimlik numarası taşınır. Alan formda pasif ama değer
   * state'te duruyor; gönderilmeseydi kayıt güncellendiğinde sunucudaki
   * `nationalIdNumber` SİLİNİRDİ (PUT kısmi güncelleme yapmıyor).
   */
  it('tüzel firmanın kimlik numarası PUT gövdesinde korunur', () => {
    const detail = buildDetail({ companyType: 2, nationalIdNumber: '12345678901' })
    const values = toProjectFirmFormValues(detail)

    expect(values.isSoleProprietorship).toBe(false)
    expect(values.nationalId).toBe('12345678901')

    const { data } = validateProjectFirm(values)
    const dto = toProjectFirmPayloadDto(toProjectFirmPayload(data!))

    expect(dto.nationalIdNumber).toBe('12345678901')
    expect(dto.taxNumber).toBe('1234567890')
  })

  it('şahıs şirketi kaydı tur atınca kimliğini korur', () => {
    const detail = buildDetail({
      companyType: 1,
      taxNumber: null,
      nationalIdNumber: '12345678901',
    })
    const { data } = validateProjectFirm(toProjectFirmFormValues(detail))
    const dto = toProjectFirmPayloadDto(toProjectFirmPayload(data!))

    expect(dto.companyType).toBe(1)
    expect(dto.nationalIdNumber).toBe('12345678901')
    expect(dto.taxNumber).toBeNull()
  })
})

describe('güncellemede benzersizlik', () => {
  it('kaydın KENDİSİ çakışma sayılmaz', () => {
    const { data } = validateProjectFirm(toProjectFirmFormValues(buildDetail()))

    // Aynı kimlik dışlanınca hiçbir hata kalmamalı.
    expect(findTakenProjectFirmErrors([buildListRow()], data!, 7)).toEqual({})
  })

  it('BAŞKA bir kaydın vergi numarası hâlâ çakışır', () => {
    const { data } = validateProjectFirm(toProjectFirmFormValues(buildDetail()))

    expect(findTakenProjectFirmErrors([buildListRow({ id: 99 })], data!, 7)).toEqual({
      taxNumber: PROJECT_FIRM_ERRORS.taxNumberTaken,
    })
  })

  it('ekleme yolunda dışlama yapılmaz', () => {
    const { data } = validateProjectFirm(toProjectFirmFormValues(buildDetail()))

    expect(findTakenProjectFirmErrors([buildListRow()], data!).taxNumber).toBe(
      PROJECT_FIRM_ERRORS.taxNumberTaken,
    )
  })
})
