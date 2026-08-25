import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FIRM_GROUPS, UPDATE_ROUTE, renderFirmFormPage } from './gasFirmFormFixture'
import { DfirmNoTakenError } from '../../api/adminFirmForm'
import { GAS_FIRM_ERRORS } from '../../ui/admin/firms/gasFirmSchema'

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

const SAVED_FIRM_ID = 500

afterEach(() => vi.clearAllMocks())

async function openForm(route?: string) {
  renderFirmFormPage({ form: firmFormApi, list: firmListApi }, route)
  return await screen.findByLabelText(/Firma No/)
}

/** Gönderim sürerken etiket "Kaydediliyor…" olur; bu yüzden tam eşleşme değil. */
const saveButton = () => screen.getByRole('button', { name: /^Kaydet$/ })

/** Grup zorunlu; seçenekler ayrı sorgudan geldiği için beklenerek seçilir. */
async function selectGroup() {
  const [group] = FIRM_GROUPS
  await screen.findByRole('option', { name: group.name })
  await userEvent.selectOptions(screen.getByLabelText(/Grup Firması/), String(group.id))
}

describe('zorunlu alan doğrulaması', () => {
  // KK-8: kayıt gerçekleşmez, hata metinleri görünür, imleç ilk hatalı alana gider.
  it('boş zorunlu alanlarda kaydetmez ve hepsinin hatasını gösterir', async () => {
    const dfirmNoInput = await openForm()

    await userEvent.clear(dfirmNoInput)
    await userEvent.click(saveButton())

    expect(await screen.findByText(GAS_FIRM_ERRORS.dfirmNo)).toBeInTheDocument()
    expect(screen.getByText(GAS_FIRM_ERRORS.name)).toBeInTheDocument()
    expect(screen.getByText(GAS_FIRM_ERRORS.phone)).toBeInTheDocument()
    expect(firmFormApi.createGasDistributionFirm).not.toHaveBeenCalled()
  })

  it('odağı ilk hatalı alana taşır', async () => {
    const dfirmNoInput = await openForm()

    await userEvent.clear(dfirmNoInput)
    await userEvent.click(saveButton())

    await waitFor(() => expect(dfirmNoInput).toHaveFocus())
  })

  it('hatalı alanın kenarlığı işaretlenir', async () => {
    const dfirmNoInput = await openForm()

    await userEvent.clear(dfirmNoInput)
    await userEvent.click(saveButton())

    await waitFor(() => expect(dfirmNoInput).toHaveAttribute('aria-invalid', 'true'))
  })

  // Belge: kullanıcı alanı geçerli doldurunca hata ANINDA kalkar.
  it('alan düzeltilince hata anında kalkar', async () => {
    const dfirmNoInput = await openForm()

    await userEvent.clear(dfirmNoInput)
    await userEvent.click(saveButton())
    expect(await screen.findByText(GAS_FIRM_ERRORS.dfirmNo)).toBeInTheDocument()

    await userEvent.type(dfirmNoInput, '115')

    expect(screen.queryByText(GAS_FIRM_ERRORS.dfirmNo)).not.toBeInTheDocument()
    expect(dfirmNoInput).not.toHaveAttribute('aria-invalid')
  })

  /** Grup OPSİYONEL: seçilmeden de kayıt gitmeli, gövdede `groupId: null`. */
  it('grup seçilmeden kaydeder ve gövdeye null gönderir', async () => {
    await openForm()

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'YENİ FİRMA')
    await userEvent.type(screen.getByLabelText(/Telefon/), '05551234567')
    await userEvent.click(saveButton())

    await waitFor(() => expect(firmFormApi.createGasDistributionFirm).toHaveBeenCalled())
    const [payload] = firmFormApi.createGasDistributionFirm.mock.calls[0]
    expect(payload.groupId).toBeNull()
  })

  it('eksik haneli telefonda biçim hatası verir', async () => {
    await openForm()

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'YENİ FİRMA')
    await userEvent.type(screen.getByLabelText(/Telefon/), '0555')
    await userEvent.click(saveButton())

    expect(await screen.findByText(GAS_FIRM_ERRORS.phoneInvalid)).toBeInTheDocument()
  })
})

describe('benzersizlik', () => {
  // KK-9: sunucu çakışma bildirince kayıt olmaz ve belgedeki mesaj görünür.
  it('sunucu çakışmasında belgedeki mesajı Firma No altında gösterir', async () => {
    firmFormApi.createGasDistributionFirm.mockRejectedValue(new DfirmNoTakenError())
    const dfirmNoInput = await openForm()

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'YENİ FİRMA')
    await userEvent.type(screen.getByLabelText(/Telefon/), '05551234567')
    await selectGroup()
    await userEvent.click(saveButton())

    expect(await screen.findByText(GAS_FIRM_ERRORS.dfirmNoTaken)).toBeInTheDocument()
    await waitFor(() => expect(dfirmNoInput).toHaveFocus())
    // Liste ekranına GEÇİLMEZ; kullanıcı formda kalır.
    expect(screen.queryByRole('heading', { name: 'Gaz Dağıtım Firmaları' })).not.toBeInTheDocument()
  })
})

describe('kaydetme', () => {
  // KK-10: başarılı kayıtta liste ekranına dönülür.
  it('geçerli formda listeye döner ve kayıt kimliğini taşır', async () => {
    firmFormApi.createGasDistributionFirm.mockResolvedValue(SAVED_FIRM_ID)
    await openForm()

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'YENİ FİRMA')
    await userEvent.type(screen.getByLabelText(/Telefon/), '05551234567')
    await selectGroup()
    await userEvent.click(saveButton())

    expect(
      await screen.findByRole('heading', { name: 'Gaz Dağıtım Firmaları' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('list-state')).toHaveTextContent(`"savedFirmId":${SAVED_FIRM_ID}`)
  })

  it('güncelleme modunda güncelleme ucunu çağırır', async () => {
    firmFormApi.updateGasDistributionFirm.mockResolvedValue(42)
    await openForm(UPDATE_ROUTE)

    await userEvent.type(screen.getByLabelText(/Yetkili Kişi/), ' Bey')
    await userEvent.click(saveButton())

    await waitFor(() => expect(firmFormApi.updateGasDistributionFirm).toHaveBeenCalledTimes(1))
    expect(firmFormApi.createGasDistributionFirm).not.toHaveBeenCalled()
  })

  // Belge: kayıt sürerken buton pasifleşir, mükerrer kayıt engellenir.
  it('kayıt sürerken buton pasifleşir ve ikinci tıklama yeni istek başlatmaz', async () => {
    await openForm()
    let finishSave: (id: number) => void = () => undefined
    firmFormApi.createGasDistributionFirm.mockReturnValue(
      new Promise<number>((resolve) => {
        finishSave = resolve
      }),
    )

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'YENİ FİRMA')
    await userEvent.type(screen.getByLabelText(/Telefon/), '05551234567')
    await selectGroup()
    await userEvent.click(saveButton())

    // Gönderim sürerken butonun etiketi de değişir; alanlar `fieldset` ile kilitli.
    const pendingButton = await screen.findByRole('button', { name: /Kaydediliyor/ })
    expect(pendingButton).toBeDisabled()
    expect(screen.getByLabelText(/Firma Adı/)).toBeDisabled()

    await userEvent.click(pendingButton)
    expect(firmFormApi.createGasDistributionFirm).toHaveBeenCalledTimes(1)

    finishSave(SAVED_FIRM_ID)
    await screen.findByRole('heading', { name: 'Gaz Dağıtım Firmaları' })
  })

  it('sunucu hatasında girilen veri korunur', async () => {
    firmFormApi.createGasDistributionFirm.mockRejectedValue(new Error('ağ'))
    await openForm()

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'YENİ FİRMA')
    await userEvent.type(screen.getByLabelText(/Telefon/), '05551234567')
    await selectGroup()
    await userEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText(/Firma Adı/)).toHaveValue('YENİ FİRMA')
  })
})

describe('iptal', () => {
  // KK-12: değişiklik varsa onay çıkar, onaylanınca kaydedilmeden dönülür.
  it('değişiklik varsa belgedeki onay metnini gösterir', async () => {
    await openForm()

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'YENİ FİRMA')
    await userEvent.click(screen.getByRole('button', { name: 'İptal' }))

    expect(
      await screen.findByText('Yapılan değişiklikler kaydedilmeden çıkılacaktır.'),
    ).toBeInTheDocument()
  })

  it('onaylanınca kaydetmeden listeye döner', async () => {
    await openForm()

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'YENİ FİRMA')
    await userEvent.click(screen.getByRole('button', { name: 'İptal' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Listeye dön' }))

    expect(
      await screen.findByRole('heading', { name: 'Gaz Dağıtım Firmaları' }),
    ).toBeInTheDocument()
    expect(firmFormApi.createGasDistributionFirm).not.toHaveBeenCalled()
  })

  it('vazgeçilince formda kalınır ve veri durur', async () => {
    await openForm()

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'YENİ FİRMA')
    await userEvent.click(screen.getByRole('button', { name: 'İptal' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Formda kal' }))

    expect(screen.getByLabelText(/Firma Adı/)).toHaveValue('YENİ FİRMA')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // Hiçbir alana dokunulmadıysa onay sormak gereksiz sürtünme.
  it('değişiklik yoksa onay sormadan listeye döner', async () => {
    await openForm()

    await userEvent.click(screen.getByRole('button', { name: 'İptal' }))

    expect(
      await screen.findByRole('heading', { name: 'Gaz Dağıtım Firmaları' }),
    ).toBeInTheDocument()
  })
})
