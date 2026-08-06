import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderFirmFormPage } from './gasFirmFormFixture'
import { GAS_FIRM_MAX_LENGTHS } from '../../ui/admin/firms/gasFirmSchema'

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

async function openForm(groups?: string[]) {
  renderFirmFormPage({ form: firmFormApi, list: firmListApi }, undefined, groups)
  return await screen.findByLabelText(/Firma No/)
}

afterEach(() => vi.clearAllMocks())

describe('placeholder metinleri', () => {
  // Belge madde 8-14: her alanın placeholder'ı birebir tanımlı.
  it('yedi alanın hepsinde belgedeki metni gösterir', async () => {
    await openForm()

    expect(screen.getByLabelText(/Firma No/)).toHaveAttribute('placeholder', 'Örn. 115')
    expect(screen.getByLabelText(/Firma Adı/)).toHaveAttribute(
      'placeholder',
      'Firma adını giriniz',
    )
    expect(screen.getByRole('option', { name: '—' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Açıklama/)).toHaveAttribute(
      'placeholder',
      'Opsiyonel açıklama',
    )
    expect(screen.getByLabelText(/Yetkili Kişi/)).toHaveAttribute('placeholder', 'Ad Soyad')
    expect(screen.getByLabelText(/Adres/)).toHaveAttribute('placeholder', 'Firma adresi')
    expect(screen.getByLabelText(/Telefon/)).toHaveAttribute('placeholder', '0xxx xxx xx xx')
  })
})

describe('grup firması seçimi', () => {
  // Belge: varsayılan değer "—".
  it('varsayılan olarak "—" seçilidir', async () => {
    await openForm()
    const select = screen.getByLabelText(/Grup Firması/)

    expect(select).toHaveValue('')
    expect(select.querySelector('option')).toHaveTextContent('—')
  })

  /**
   * Belge: liste alfabetik sıralanır. Düz `sort()` kod noktasına göre dizerdi:
   * 'Ç' (U+00C7) 'D'den (U+0044) sonra gelir, yani ÇEDAŞ yanlış yere düşerdi.
   */
  it('Türkçe harfleri doğru sıralar', async () => {
    await openForm(['GAZDAŞ', 'DOĞUGAZ', 'ÇEDAŞ', 'AKSA'])
    await screen.findByRole('option', { name: 'ÇEDAŞ' })

    const options = Array.from(
      screen.getByLabelText(/Grup Firması/).querySelectorAll('option'),
    ).map((option) => option.textContent)

    expect(options).toEqual(['—', 'AKSA', 'ÇEDAŞ', 'DOĞUGAZ', 'GAZDAŞ'])
  })
})

describe('uzunluk sınırları', () => {
  it('belgedeki karakter sınırlarını girdiye yazar', async () => {
    await openForm()

    expect(screen.getByLabelText(/Firma Adı/)).toHaveAttribute(
      'maxlength',
      String(GAS_FIRM_MAX_LENGTHS.name),
    )
    expect(screen.getByLabelText(/Açıklama/)).toHaveAttribute(
      'maxlength',
      String(GAS_FIRM_MAX_LENGTHS.description),
    )
    expect(screen.getByLabelText(/Adres/)).toHaveAttribute(
      'maxlength',
      String(GAS_FIRM_MAX_LENGTHS.address),
    )
  })

  it('sınırı aşan giriş alana yazılamaz', async () => {
    await openForm()
    const name = screen.getByLabelText(/Firma Adı/)

    await userEvent.type(name, 'A'.repeat(GAS_FIRM_MAX_LENGTHS.name + 10))

    expect(name).toHaveValue('A'.repeat(GAS_FIRM_MAX_LENGTHS.name))
  })
})

describe('firma no alanı', () => {
  // Belge: "text input formatında olacak" — artırma/azaltma düğmesi yok.
  it('düz metin girdisidir, sayı çevirici değil', async () => {
    const dfirmNo = await openForm()

    expect(dfirmNo).toHaveAttribute('type', 'text')
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  // Belge: sıradaki numara dolu gelir ama kullanıcı DEĞİŞTİREBİLİR.
  it('ekleme modunda dolu gelen numara değiştirilebilir', async () => {
    const dfirmNo = await openForm()

    await userEvent.clear(dfirmNo)
    await userEvent.type(dfirmNo, '115')

    expect(dfirmNo).toHaveValue('115')
    expect(dfirmNo).not.toHaveAttribute('readonly')
  })
})

describe('telefon maskesi', () => {
  it('yazarken maskeyi kurar', async () => {
    await openForm()
    const phone = screen.getByLabelText(/Telefon/)

    await userEvent.type(phone, '05551234567')

    expect(phone).toHaveValue('0555 123 45 67')
  })

  /**
   * Maske her tuş vuruşunda yeniden kurulduğu için tarayıcı imleci metnin
   * sonuna atıyordu; ortaya yazan kullanıcı her karakterden sonra sona fırlardı.
   */
  it('metnin ortasına yazınca imleç sona atlamaz', async () => {
    await openForm()
    const phone = screen.getByLabelText<HTMLInputElement>(/Telefon/)

    await userEvent.type(phone, '0555123')
    await userEvent.type(phone, '9', { initialSelectionStart: 2, initialSelectionEnd: 2 })

    expect(phone).toHaveValue('0595 512 3')
    // Eklenen rakamdan hemen sonra; metnin sonu (10) DEĞİL.
    expect(phone.selectionStart).toBe(3)
  })

  /**
   * Ayıracın üzerinde geri silme: tarayıcı boşluğu silerdi ama maske hemen
   * yeniden kurulduğu için rakamlar değişmez ve tuş çalışmamış görünürdü.
   * Boşluk yerine ondan ÖNCEKİ rakam siliniyor.
   */
  it('boşluk üzerinde backspace önceki rakamı siler', async () => {
    await openForm()
    const phone = screen.getByLabelText<HTMLInputElement>(/Telefon/)

    await userEvent.type(phone, '0555123')
    expect(phone).toHaveValue('0555 123')

    // İmleç boşluktan hemen sonra (indeks 5).
    phone.setSelectionRange(5, 5)
    await userEvent.keyboard('{Backspace}')

    expect(phone).toHaveValue('0551 23')
    expect(phone.selectionStart).toBe(3)
  })

  it('rakam üzerinde backspace normal çalışır', async () => {
    await openForm()
    const phone = screen.getByLabelText<HTMLInputElement>(/Telefon/)

    await userEvent.type(phone, '0555123')
    await userEvent.keyboard('{Backspace}')

    expect(phone).toHaveValue('0555 12')
  })

  it('hane sınırından fazla rakam kabul etmez', async () => {
    await openForm()
    const phone = screen.getByLabelText(/Telefon/)

    await userEvent.type(phone, '0555123456789')

    expect(phone).toHaveValue('0555 123 45 67')
  })
})

describe('firma adı bilgilendirmesi', () => {
  // Belge madde 9 "büyük harf tercih edilir" diyor; otomatik dönüşüm YOK,
  // yalnız hatırlatma (docs/kararlar.md K26).
  it('büyük harf önerisini gösterir ama girdiyi değiştirmez', async () => {
    await openForm()
    const name = screen.getByLabelText(/Firma Adı/)

    await userEvent.type(name, 'Adana Doğalgaz')

    expect(
      screen.getByText('Mevcut kayıtlarla uyum için büyük harf kullanmanız önerilir.'),
    ).toBeInTheDocument()
    expect(name).toHaveValue('Adana Doğalgaz')
    expect(name).not.toHaveAttribute('aria-invalid')
  })
})

describe('kaydet butonu', () => {
  // Mockup: birincil renkte, kaydet ikonuyla.
  it('ikon taşır', async () => {
    await openForm()

    expect(screen.getByRole('button', { name: /^Kaydet$/ }).querySelector('svg')).toBeTruthy()
  })
})
