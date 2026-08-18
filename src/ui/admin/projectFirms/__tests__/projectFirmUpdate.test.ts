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

/** Sağlaması TUTAN örnek; gerçek kişiden alınmadı, kuraldan üretildi. */
const VALID_NATIONAL_ID = '12345678950'

/** `GET /api/projectfirms/{id}` yanıtının sözleşmedeki tam şekli. */
function buildDetail(overrides: Partial<ProjectFirmFullDto> = {}): ProjectFirmFullDto {
  return {
    id: 7,
    companyType: 2,
    title: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
    taxNumber: '1234567890',
    nationalIdNumber: null,
    accountingCode: 'CARI-1',
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
    name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
    authorizedPerson: 'Ahmet Yılmaz',
    email: 'bilgi@adana.com.tr',
    phone: '05321000000',
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
      buildDetail({ accountingCode: null, address: null, phone2: null }),
    )

    expect(values.accountingCode).toBe('')
    expect(values.address).toBe('')
    expect(values.phone2Digits).toBe('')
  })

  it('companyType 1 ise şahıs şirketi işaretlenir', () => {
    const values = toProjectFirmFormValues(
      buildDetail({ companyType: 1, taxNumber: null, nationalIdNumber: VALID_NATIONAL_ID }),
    )

    expect(values.isSoleProprietorship).toBe(true)
  })

  /**
   * Yanıttaki kimlik numarası MASKELİ geliyor ("*******1234") ve geri
   * gönderilirse sunucu 400 döner. Yüklemek, maskeli değerin gövdeye
   * ulaşabildiği tek yoldu; yüklememek hatayı yapısal olarak imkânsız kılıyor.
   */
  it('kimlik numarasını forma HİÇ yüklemez', () => {
    const masked = toProjectFirmFormValues(
      buildDetail({ companyType: 1, taxNumber: null, nationalIdNumber: '*******1234' }),
    )
    expect(masked.nationalId).toBe('')

    // Maskesiz gelse bile yüklenmiyor: kural yanıtın biçimine bağlı değil.
    const plain = toProjectFirmFormValues(
      buildDetail({ companyType: 1, taxNumber: null, nationalIdNumber: VALID_NATIONAL_ID }),
    )
    expect(plain.nationalId).toBe('')
  })
})

/**
 * PUT gövdesi sözleşmenin alanlarını taşımalı: eksik gönderilen alan sunucuda
 * SİLİNİR (`PUT` kısmi güncelleme yapmıyor).
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

    expect(dto.address).toBe(detail.address)
    // Cari Kodu AYRI bir alan ve KALIYOR; seri no ile karıştırılmamalı.
    expect(dto.accountingCode).toBe(detail.accountingCode)
  })

  /** Sözleşmedeki alan KÜMESİ: fazlası da eksiği de sözleşme ihlali. */
  it('gövde tam olarak sözleşmenin on alanını taşır, seri no YOKTUR', () => {
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
        'taxNumber',
        'title',
      ].sort(),
    )
  })

  /**
   * TÜZEL firmada kimlik numarası gövdeye `null` gider (§10). Okunan değeri
   * korumak ARTIK YANLIŞ: yanıt maskeli geliyor ve maskeli metin "boş olmalı"
   * kuralını çiğnediği için 400 dönerdi.
   */
  it('tüzel firmada kimlik numarası null gider', () => {
    const detail = buildDetail({ companyType: 2, nationalIdNumber: '*******1234' })
    const { data } = validateProjectFirm(toProjectFirmFormValues(detail))
    const dto = toProjectFirmPayloadDto(toProjectFirmPayload(data!))

    expect(dto.nationalIdNumber).toBeNull()
    expect(dto.taxNumber).toBe('1234567890')
  })

  it('şahıs firması yeniden girilen kimliği gönderir, vergi noyu boş bırakır', () => {
    const detail = buildDetail({
      companyType: 1,
      taxNumber: null,
      nationalIdNumber: '*******1234',
    })
    // Alan boş açılıyor; kullanıcı gerçek numarayı yeniden giriyor.
    const values = { ...toProjectFirmFormValues(detail), nationalId: VALID_NATIONAL_ID }
    const { data } = validateProjectFirm(values)
    const dto = toProjectFirmPayloadDto(toProjectFirmPayload(data!))

    expect(dto.companyType).toBe(1)
    expect(dto.nationalIdNumber).toBe(VALID_NATIONAL_ID)
    expect(dto.taxNumber).toBeNull()
  })

  /** Boş bırakılan alan kaydetmeyi ENGELLER; maskeli değer sessizce gitmez. */
  it('şahıs firmasında kimlik girilmeden kaydedilemez', () => {
    const detail = buildDetail({
      companyType: 1,
      taxNumber: null,
      nationalIdNumber: '*******1234',
    })
    const { errors, data } = validateProjectFirm(toProjectFirmFormValues(detail))

    expect(data).toBeNull()
    expect(errors.nationalId).toBe(PROJECT_FIRM_ERRORS.nationalId)
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
