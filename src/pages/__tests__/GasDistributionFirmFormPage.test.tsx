import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  EXISTING_FIRM,
  NEXT_DFIRM_NO,
  UPDATE_ROUTE,
  renderFirmFormPage,
} from './gasFirmFormFixture'

const firmFormApi = vi.hoisted(() => ({
  getNextDfirmNo: vi.fn(),
  getGasDistributionFirm: vi.fn(),
  createGasDistributionFirm: vi.fn(),
  updateGasDistributionFirm: vi.fn(),
}))

const firmListApi = vi.hoisted(() => ({
  getFirmGroups: vi.fn(),
  getGasDistributionFirms: vi.fn(),
}))

vi.mock('../../api/adminFirmForm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminFirmForm')>()),
  ...firmFormApi,
}))

vi.mock('../../api/adminFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminFirms')>()),
  ...firmListApi,
}))

const renderPage = (route?: string) =>
  renderFirmFormPage({ form: firmFormApi, list: firmListApi }, route)

afterEach(() => {
  vi.clearAllMocks()
})

describe('ekleme ekranı', () => {
  // KK-7: ekran açılınca "Firma No" alanında sıradaki uygun numara dolu gelir.
  it('sıradaki firma numarasıyla açılır', async () => {
    renderPage()

    expect(await screen.findByLabelText(/Firma No/)).toHaveValue(String(NEXT_DFIRM_NO))
  })

  it('belgedeki yedi alanı da gösterir', async () => {
    renderPage()
    await screen.findByLabelText(/Firma No/)

    for (const label of [
      /Firma No/,
      /Firma Adı/,
      /Grup Firması/,
      /Açıklama/,
      /Yetkili Kişi/,
      /Adres/,
      /Telefon/,
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('zorunlu alanların etiketinde yıldız vardır, opsiyonellerde yoktur', async () => {
    renderPage()
    await screen.findByLabelText(/Firma No/)

    expect(screen.getByLabelText('Firma No *')).toBeInTheDocument()
    expect(screen.getByLabelText('Firma Adı *')).toBeInTheDocument()
    expect(screen.getByLabelText('Telefon *')).toBeInTheDocument()
    // Grup firması OPSİYONEL oldu: yıldız YOK (sunucu `GroupId`'yi `int?` alıyor).
    expect(screen.getByLabelText('Grup Firması')).toBeInTheDocument()
    expect(screen.getByLabelText('Adres')).toBeInTheDocument()
  })

  it('grup firması listesi alfabetik gelir ve varsayılan boştur', async () => {
    renderPage()
    // Seçenekler ayrı bir sorgudan geliyor; alan görünür olsa da liste geç dolar.
    await screen.findByRole('option', { name: 'Aksa Enerji Grubu' })

    const select = screen.getByLabelText(/Grup Firması/)
    const options = Array.from(select.querySelectorAll('option')).map((option) => option.textContent)

    expect(select).toHaveValue('')
    expect(options).toEqual(['Seçiniz', 'Aksa Enerji Grubu', 'Çalık Enerji Grubu'])
  })

  it('firma numarası ekleme modunda değiştirilebilir', async () => {
    renderPage()

    expect(await screen.findByLabelText(/Firma No/)).not.toHaveAttribute('readonly')
  })
})

describe('güncelleme ekranı', () => {
  // KK-11: aynı form, seçilen firmanın bilgileriyle dolu açılır.
  it('firmanın verisiyle dolu açılır', async () => {
    renderPage(UPDATE_ROUTE)

    expect(await screen.findByLabelText(/Firma Adı/)).toHaveValue(EXISTING_FIRM.name)
    expect(screen.getByLabelText(/Yetkili Kişi/)).toHaveValue(EXISTING_FIRM.contactPerson)
    expect(screen.getByLabelText(/Adres/)).toHaveValue(EXISTING_FIRM.address)
    expect(screen.getByLabelText(/Açıklama/)).toHaveValue(EXISTING_FIRM.description)

    // Seçenekler ayrı sorgudan gelir; liste dolmadan seçim değeri tutunamaz.
    await screen.findByRole('option', { name: EXISTING_FIRM.groupName })
    // Seçim kutusunun DEĞERİ ad değil kimlik: sunucu grubu `groupId` ile alıyor.
    expect(screen.getByLabelText(/Grup Firması/)).toHaveValue(String(EXISTING_FIRM.groupId))
  })

  it('telefonu maskeli gösterir', async () => {
    renderPage(UPDATE_ROUTE)

    expect(await screen.findByLabelText(/Telefon/)).toHaveValue('0532 100 00 00')
  })

  // KK-11: "Firma No" alanı güncelleme ekranında salt okunurdur.
  it('firma numarası salt okunurdur', async () => {
    renderPage(UPDATE_ROUTE)

    expect(await screen.findByLabelText(/Firma No/)).toHaveAttribute('readonly')
  })

  it('başlık ve konum izi güncelleme metnini gösterir', async () => {
    renderPage(UPDATE_ROUTE)

    expect(
      await screen.findByRole('heading', { name: 'Gaz Dağıtım Firma Güncelle' }),
    ).toBeInTheDocument()
  })
})

// Belge: harf girişine izin verilmez. Maskenin kendisi FormFields testinde.
describe('girdi süzme', () => {
  it('telefona harf girilemez', async () => {
    renderPage()
    await screen.findByLabelText(/Firma No/)
    const phone = screen.getByLabelText(/Telefon/)

    await userEvent.type(phone, '0abc5551234567')

    expect(phone).toHaveValue('0555 123 45 67')
  })

  it('firma numarasına harf girilemez', async () => {
    renderPage()
    const dfirmNoInput = await screen.findByLabelText(/Firma No/)

    await userEvent.clear(dfirmNoInput)
    await userEvent.type(dfirmNoInput, '1a1b5')

    expect(dfirmNoInput).toHaveValue('115')
  })
})

describe('bozuk bağlantı', () => {
  it('sayısal olmayan firma kimliğinde listeye yönlendirir', async () => {
    renderPage('/admin/gas-distribution-firms/abc')

    expect(
      await screen.findByRole('heading', { name: 'Gaz Dağıtım Firmaları' }),
    ).toBeInTheDocument()
    expect(firmFormApi.getGasDistributionFirm).not.toHaveBeenCalled()
  })
})
