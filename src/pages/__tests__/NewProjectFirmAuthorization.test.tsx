import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  addAuthorization,
  groupSelect,
  openAuthorizationDraft,
  regionSelect,
  renderNewProjectFirmPage,
  selectGroup,
} from './newProjectFirmFixture'
import { GAS_FIRM_SELECTION_CLEARED_NOTICE } from '../../ui/admin/projectFirms/useProjectFirmAuthorizationDraft'

const formApi = vi.hoisted(() => ({
  createProjectFirm: vi.fn(),
  saveProjectFirmAuthorizations: vi.fn(),
}))

const firmsApi = vi.hoisted(() => ({
  getFirmGroups: vi.fn(),
  getGasDistributionFirmsByGroup: vi.fn(),
}))

const projectFirmsApi = vi.hoisted(() => ({ getProjectFirmList: vi.fn() }))

vi.mock('../../api/projectFirmForm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmForm')>()),
  ...formApi,
}))

vi.mock('../../api/adminFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminFirms')>()),
  ...firmsApi,
}))

vi.mock('../../api/projectFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirms')>()),
  ...projectFirmsApi,
}))

function openForm() {
  renderNewProjectFirmPage({
    form: formApi,
    lookups: { ...firmsApi, ...projectFirmsApi },
  })
}

afterEach(() => vi.clearAllMocks())

describe('KK-1 — ekran açılışı', () => {
  it('iki bölüm, belgedeki kırılım ve boş yetkilendirme listesiyle açılır', async () => {
    openForm()

    expect(
      await screen.findByRole('heading', { name: 'Yeni Proje Firması Ekle' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'G.D. Firması & Bölge Yetkilendirme' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Firma Bilgileri' })).toBeInTheDocument()

    const breadcrumb = screen.getByRole('navigation', { name: 'Konum' })
    expect(breadcrumb).toHaveTextContent(
      'Anasayfa/Firmalar/Proje Firmaları/Yeni Proje Firması Ekle',
    )

    expect(screen.getByText('Henüz yetkilendirme eklenmedi.')).toBeInTheDocument()
  })
})

describe('KK-2 — grup seçimi ve bölge listesi', () => {
  it('yalnız seçilen gruba bağlı bölgeleri yükler', async () => {
    openForm()
    await selectGroup('AKSA')

    expect(screen.getByRole('option', { name: 'Gemlik Gaz Dağıtım A.Ş.' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Konya Doğalgaz A.Ş.' })).not.toBeInTheDocument()

    await selectGroup('ENERYA')

    expect(screen.getByRole('option', { name: 'Konya Doğalgaz A.Ş.' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Gemlik Gaz Dağıtım A.Ş.' })).not.toBeInTheDocument()
  })

  it('grup değişince işaretleri temizler ve bunu kullanıcıya bildirir', async () => {
    openForm()
    await selectGroup('AKSA')
    await userEvent.selectOptions(regionSelect(), 'Gemlik Gaz Dağıtım A.Ş.')

    await selectGroup('ENERYA')

    expect(screen.getByText(GAS_FIRM_SELECTION_CLEARED_NOTICE)).toBeInTheDocument()
    expect(regionSelect()).toHaveValue('')
  })

  // İlk seçimde kaybolan bir şey yok; "temizlendi" demek yanıltıcı olurdu.
  it('hiçbir şey işaretli değilken bildirim çıkmaz', async () => {
    openForm()
    await selectGroup('AKSA')

    expect(screen.queryByText(GAS_FIRM_SELECTION_CLEARED_NOTICE)).not.toBeInTheDocument()
  })
})

describe('KK-3 — bölge seçimi', () => {
  /**
   * Bölge bir SEÇİM KUTUSU: bir "Ekle" tek bölge bağlıyor ve ikinci seçim
   * birinciyi düşürüyor. Birden fazla bölge, çiplerin yanındaki "+" ile
   * ardışık eklemelerle kuruluyor.
   */
  it('kutu tek değer taşır, ikinci seçim birinciyi düşürür', async () => {
    openForm()
    await selectGroup('AKSA')

    await userEvent.selectOptions(regionSelect(), 'Adana Doğalgaz Dağıtım A.Ş.')
    await userEvent.selectOptions(regionSelect(), 'Bolu Şehiriçi Doğalgaz A.Ş.')

    expect(regionSelect()).toHaveDisplayValue('Bolu Şehiriçi Doğalgaz A.Ş.')
  })

  /** Grup seçilmeden bölge listesi çekilmiyor; kutu sebebini söylüyor. */
  it('grup seçilmeden bölge kutusu pasiftir', async () => {
    openForm()
    await openAuthorizationDraft()

    expect(regionSelect()).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Önce grup firması seçiniz' })).toBeInTheDocument()
  })

  /** Kutu tarayıcının kendi tuşla-bul davranışını getiriyor; ayrı arama YOK. */
  it('ayrı bir bölge arama kutusu yoktur', async () => {
    openForm()
    await selectGroup('AKSA')

    expect(screen.queryByLabelText('Bölge ara')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Tümünü Seç' })).not.toBeInTheDocument()
  })

  it('bölge işaretlenmeden "Ekle" yetkilendirme eklemez', async () => {
    openForm()
    await selectGroup('AKSA')

    await userEvent.click(screen.getByRole('button', { name: 'Ekle' }))

    expect(screen.getByText('Gaz dağıtım firması seçiniz.')).toBeInTheDocument()
    expect(screen.getByText('Henüz yetkilendirme eklenmedi.')).toBeInTheDocument()
  })

  // "Yeterlilik No" kalktı (K102): kayıtta sertifika no dışında numara yok.
  it('yeterlilik no diye bir alan yoktur', async () => {
    openForm()
    await selectGroup('AKSA')

    expect(screen.queryByLabelText(/^Yeterlilik No/)).not.toBeInTheDocument()
  })

  /**
   * Sertifika numarası ve geçerlilik başlangıcı uçta ZORUNLU
   * (`ProjectFirmAuthorizationCreateDto`). Eksik satır gönderilseydi firma
   * kaydedilmişken yetkilendirme 400 alıp sessizce düşerdi.
   */
  it('sertifika no ve geçerlilik başlangıcı boşken kayıt eklenmez', async () => {
    openForm()
    await selectGroup('AKSA')
    await userEvent.selectOptions(regionSelect(), 'Gemlik Gaz Dağıtım A.Ş.')
    await userEvent.click(screen.getByRole('button', { name: 'Ekle' }))

    expect(screen.getByText('Sertifika numarası zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Geçerlilik başlangıcı zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Henüz yetkilendirme eklenmedi.')).toBeInTheDocument()
  })
})

describe('KK-4 — yetkilendirme ekleme', () => {
  it('eklenen kayıt listede görünür ve kaldırılabilir', async () => {
    openForm()
    await selectGroup('AKSA')
    await addAuthorization()

    expect(screen.getByText('1 yetkilendirme eklendi.')).toBeInTheDocument()
    // Sertifika bilgisi yalnız EKLENEN kayıtta yazıyor; "Yeterlilik No" kalktı (K102).
    expect(screen.getByText(/AKSA · Sertifika No: ST-1/)).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Gemlik Gaz Dağıtım A.Ş. yetkilendirmesini kaldır' }),
    )

    expect(screen.getByText('Henüz yetkilendirme eklenmedi.')).toBeInTheDocument()
  })

  it('aynı bölge ikinci kez eklenemez', async () => {
    openForm()
    await selectGroup('AKSA')
    await addAuthorization()

    // Numara BİLEREK farklı: engellenen şey bölgenin tekrarı, numaranın değil.
    await addAuthorization('Gemlik Gaz Dağıtım A.Ş.', 'ST-2')

    expect(
      screen.getByText('Bu firmalar için yetkilendirme zaten eklendi: Gemlik Gaz Dağıtım A.Ş.'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 yetkilendirme eklendi.')).toBeInTheDocument()
  })

  it('farklı gruplar için birden fazla yetkilendirme eklenebilir', async () => {
    openForm()
    await selectGroup('AKSA')
    await addAuthorization()

    await selectGroup('ENERYA')
    await addAuthorization('Konya Doğalgaz A.Ş.', 'ST-2')

    expect(screen.getByText('2 yetkilendirme eklendi.')).toBeInTheDocument()
    // Ad hem onay kutusunda hem listede geçiyor; kaldırma düğmesi listeye özgü.
    expect(
      screen.getByRole('button', { name: 'Konya Doğalgaz A.Ş. yetkilendirmesini kaldır' }),
    ).toBeInTheDocument()
  })

  // Ekledikten sonra numaralar sıfırlanır, grup kalır: kullanıcı çoğunlukla
  // aynı grubun başka bölgesi için ikinci kaydı ekliyor.
  /**
   * Panel eklemeden sonra KAPANIYOR (çip listesi öne çıksın); "+" ile yeniden
   * açıldığında alanlar boş, grup seçimi ise korunmuş olmalı — kullanıcı
   * çoğunlukla aynı grubun başka firmasını ekliyor.
   */
  it('ekledikten sonra panel kapanır, yeniden açılınca alanlar sıfırdır', async () => {
    openForm()
    await selectGroup('AKSA')
    await addAuthorization()

    expect(screen.queryByLabelText(/^Sertifika No/)).not.toBeInTheDocument()

    await openAuthorizationDraft()

    expect(screen.getByLabelText(/^Sertifika No/)).toHaveValue('')
    expect(regionSelect()).toHaveValue('')
    // Grup KALIYOR: kullanıcı çoğunlukla aynı grubun başka bölgesini ekliyor.
    expect(groupSelect()).toHaveValue('1')
  })

  /**
   * Sertifika numarası yeterlilik BELGESİNE ait: aynı numarayı ikinci bir
   * bölgeye yazmak belgeyi kopyalamak olurdu.
   */
  it('aynı sertifika numarası ikinci bir bölgede kullanılamaz', async () => {
    openForm()
    await selectGroup('AKSA')
    await addAuthorization('Gemlik Gaz Dağıtım A.Ş.', 'ST-1')

    await addAuthorization('Adana Doğalgaz Dağıtım A.Ş.', 'st-1 ')

    expect(
      screen.getByText('Bu sertifika numarası başka bir gaz dağıtım firmasında kullanıldı.'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 yetkilendirme eklendi.')).toBeInTheDocument()
  })
})
