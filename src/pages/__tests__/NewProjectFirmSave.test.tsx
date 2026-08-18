import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  EXISTING_PROJECT_FIRM,
  NEW_FIRM_ID,
  addAuthorization,
  fillFirmInfo,
  renderNewProjectFirmPage,
  selectGroup,
} from './newProjectFirmFixture'
import { PROJECT_FIRM_ERRORS } from '../../ui/admin/projectFirms/projectFirmSchema'

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

/** Kaydetmeye hazır form: bir yetkilendirme + geçerli firma bilgileri. */
async function fillReadyForm(overrides: Record<string, string> = {}) {
  openForm()
  await selectGroup('AKSA')
  await addAuthorization()
  await fillFirmInfo(overrides)
}

function save() {
  return userEvent.click(screen.getByRole('button', { name: /^Kaydet$/ }))
}

afterEach(() => vi.clearAllMocks())

describe('KK-5 — şahıs şirketi geçişi', () => {
  it('varsayılan olarak Tc Kimlik No pasiftir ve sebebini söyler', async () => {
    openForm()

    const nationalId = await screen.findByLabelText(/^Tc Kimlik No/)
    expect(nationalId).toBeDisabled()
    expect(nationalId).toHaveAttribute('placeholder', 'Şahıs şirketi seçilince aktif olur')
  })

  it('işaretlenince alan aktifleşir ve yalnız 11 haneli sayı kabul eder', async () => {
    openForm()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Şahıs Şirketi' }))

    const nationalId = screen.getByLabelText(/^Tc Kimlik No/)
    expect(nationalId).toBeEnabled()

    await userEvent.type(nationalId, '1a2345678950234')
    expect(nationalId).toHaveValue('12345678950')
  })

  it('işaret kaldırılınca alan temizlenir ve yeniden pasifleşir', async () => {
    openForm()
    const checkbox = await screen.findByRole('checkbox', { name: 'Şahıs Şirketi' })
    await userEvent.click(checkbox)
    await userEvent.type(screen.getByLabelText(/^Tc Kimlik No/), '12345678950')

    await userEvent.click(checkbox)

    const nationalId = screen.getByLabelText(/^Tc Kimlik No/)
    expect(nationalId).toHaveValue('')
    expect(nationalId).toBeDisabled()
  })

  it('işaretliyken vergi no zorunluluktan çıkar, kimlik zorunlu olur', async () => {
    await fillReadyForm({ 'Vergi No': '' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Şahıs Şirketi' }))

    await save()

    expect(screen.getByText(PROJECT_FIRM_ERRORS.nationalId)).toBeInTheDocument()
    expect(screen.queryByText(PROJECT_FIRM_ERRORS.taxNumber)).not.toBeInTheDocument()
  })
})

describe('KK-6 — zorunlu alan doğrulaması', () => {
  it('boş formda kaydetmez, alanları işaretler ve odağı ilk hataya taşır', async () => {
    openForm()
    await selectGroup('AKSA')
    await addAuthorization()

    await save()

    expect(formApi.createProjectFirm).not.toHaveBeenCalled()
    expect(screen.getByText(PROJECT_FIRM_ERRORS.name)).toBeInTheDocument()
    expect(screen.getByText(PROJECT_FIRM_ERRORS.taxNumber)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Ünvan/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/^Ünvan/)).toHaveFocus()
  })

  it('geçersiz e-postada belgedeki mesajı gösterir', async () => {
    await fillReadyForm({ 'E-mail': 'bilgi@' })

    await save()

    expect(screen.getByText('Geçerli bir e-posta adresi giriniz.')).toBeInTheDocument()
    expect(formApi.createProjectFirm).not.toHaveBeenCalled()
  })

  it('alan düzeltilince hatası anında kalkar', async () => {
    await fillReadyForm({ Ünvan: '' })
    await save()
    expect(screen.getByText(PROJECT_FIRM_ERRORS.name)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/^Ünvan/), 'A')

    expect(screen.queryByText(PROJECT_FIRM_ERRORS.name)).not.toBeInTheDocument()
  })
})

describe('KK-7 — yetkilendirme kaydı olmadan kaydetme', () => {
  it('kaydı tamamlamaz ve kullanıcıyı uyarır', async () => {
    openForm()
    await screen.findByRole('heading', { name: 'Firma Bilgileri' })
    await fillFirmInfo()

    await save()

    expect(screen.getByText(PROJECT_FIRM_ERRORS.noAuthorization)).toBeInTheDocument()
    expect(formApi.createProjectFirm).not.toHaveBeenCalled()
  })

  it('yetkilendirme eklenince uyarı kalkar', async () => {
    openForm()
    await screen.findByRole('heading', { name: 'Firma Bilgileri' })
    await fillFirmInfo()
    await save()

    await selectGroup('AKSA')
    await addAuthorization()

    expect(screen.queryByText(PROJECT_FIRM_ERRORS.noAuthorization)).not.toBeInTheDocument()
  })
})

describe('KK-8 — benzersizlik ve başarılı kayıt', () => {
  it('kullanılmış vergi numarasında kaydetmez', async () => {
    await fillReadyForm({ 'Vergi No': EXISTING_PROJECT_FIRM.taxNumber ?? '' })

    await save()

    expect(screen.getByText(PROJECT_FIRM_ERRORS.taxNumberTaken)).toBeInTheDocument()
    expect(formApi.createProjectFirm).not.toHaveBeenCalled()
  })

  // Seri No ve Yeter No sütun/alan olarak tümüyle kalktı (K102).
  it('formda Seri No alanı bulunmaz', async () => {
    openForm()
    await screen.findByRole('heading', { name: 'Firma Bilgileri' })

    expect(screen.queryByLabelText(/^Seri No/)).not.toBeInTheDocument()
  })

  it('yetkilendirme bölümünde Yeterlilik No alanı bulunmaz', async () => {
    openForm()
    await screen.findByRole('heading', { name: 'Firma Bilgileri' })

    expect(screen.queryByLabelText(/^Yeterlilik No/)).not.toBeInTheDocument()
  })

  it('geçerli formda kaydeder, yetkilendirmeleri gönderir ve listeye döner', async () => {
    await fillReadyForm()

    await save()

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Proje Firmaları' })).toBeInTheDocument(),
    )

    expect(formApi.createProjectFirm).toHaveBeenCalledWith(
      expect.objectContaining({
        companyType: 2,
        name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
        taxNumber: '1234567890',
        phone: '05321000000',
      }),
    )
    // Gövdede seri no anahtarı HİÇ yok; `null` bile gitmiyor.
    expect(formApi.createProjectFirm.mock.calls[0][0]).not.toHaveProperty('serialNumber')
    expect(formApi.saveProjectFirmAuthorizations).toHaveBeenCalledWith(NEW_FIRM_ID, [
      { gasDistributionFirmId: 11, certificateNumber: null },
    ])
    // Liste ekranı başarı mesajını bu durumdan üretiyor (useSavedFirmNotice).
    expect(screen.getByTestId('list-state')).toHaveTextContent(String(NEW_FIRM_ID))
  })

  it('sunucu hatasında girilen veri korunur ve mesaj gösterilir', async () => {
    const { ApiError } = await import('../../api/http')
    formApi.createProjectFirm.mockRejectedValueOnce(
      new ApiError(400, 'Şu an yalnızca tüzel firma (CompanyType=2) eklenebilir.'),
    )
    await fillReadyForm()

    await save()

    expect(
      await screen.findByText(/Şu an yalnızca tüzel firma \(CompanyType=2\) eklenebilir\./),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^Ünvan/)).toHaveValue('ADANA MÜHENDİSLİK LTD. ŞTİ.')
  })
})
