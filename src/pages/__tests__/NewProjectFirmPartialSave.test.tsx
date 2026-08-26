import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
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

function save() {
  return userEvent.click(screen.getByRole('button', { name: /^Kaydet$/ }))
}

async function fillReadyForm(overrides: Record<string, string> = {}) {
  openForm()
  await selectGroup('AKSA')
  await addAuthorization()
  await fillFirmInfo(overrides)
}

function expectOnList() {
  return waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Proje Firmaları' })).toBeInTheDocument(),
  )
}

afterEach(() => vi.clearAllMocks())

/**
 * Kısmi başarı: firma kaydı geçiyor, bazı yetkilendirme satırları geçmiyor ve
 * geri ALINMIYOR. Kullanıcı bunu GÖRMELİ — sessiz yarım kayıt olmaz. Şeridin
 * kendisi liste ekranında (`ProjectFirmsNotice.test.tsx`); burada başarısız
 * firma ADLARININ doğru üretilip taşındığı sınanıyor.
 */
describe('yarım kayıt görünürlüğü', () => {
  it('kurulamayan yetkilendirmelerin ADLARINI listeye taşır', async () => {
    formApi.saveProjectFirmAuthorizations.mockResolvedValueOnce({
      arePersisted: false,
      failedGasFirmNames: ['Gemlik Gaz Dağıtım A.Ş.'],
    })
    await fillReadyForm()

    await save()
    await expectOnList()

    expect(screen.getByTestId('list-state')).toHaveTextContent(
      '"failedAuthorizationFirms":["Gemlik Gaz Dağıtım A.Ş."]',
    )
  })

  it('hepsi yazıldıysa liste durumunda başarısız firma kalmaz', async () => {
    await fillReadyForm()

    await save()
    await expectOnList()

    expect(screen.getByTestId('list-state')).toHaveTextContent(
      '"failedAuthorizationFirms":[]',
    )
  })
})

/**
 * Şahıs firması ARTIK destekleniyor (§10). Kalan tek çakışma T.C. kimlik
 * numarasının benzersizliği: sunucu 409 döndürüyor ve SİLİNMİŞ firma bile
 * numarayı rezerve tutuyor, bu yüzden kullanıcı listede arayıp bulamıyor —
 * mesaj bunu ayrıca söylemek zorunda.
 */
describe('şahıs firmasında T.C. kimlik çakışması (409)', () => {
  async function saveAsSoleProprietorship() {
    const { ApiError } = await import('../../api/http')
    formApi.createProjectFirm.mockRejectedValueOnce(
      new ApiError(409, 'Bu kimlik numarası kullanımda.'),
    )

    openForm()
    await selectGroup('AKSA')
    await addAuthorization()
    await fillFirmInfo({ 'Vergi No': '' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Şahıs Şirketi' }))
    await userEvent.type(screen.getByLabelText(/^Tc Kimlik No/), '12345678950')

    await save()
  }

  // Genel şerit DEĞİL ALAN hatası: çakışan şey belli bir alan.
  it('çakışmayı kimlik alanının hatası olarak gösterir', async () => {
    await saveAsSoleProprietorship()

    expect(await screen.findByText(PROJECT_FIRM_ERRORS.nationalIdTaken)).toBeInTheDocument()
  })

  it('odağı kimlik alanına taşır ve veriyi korur', async () => {
    await saveAsSoleProprietorship()
    await screen.findByText(PROJECT_FIRM_ERRORS.nationalIdTaken)

    const nationalId = screen.getByLabelText(/^Tc Kimlik No/)
    expect(nationalId).toHaveFocus()
    expect(nationalId).toHaveValue('12345678950')
  })

  // Şahıs seçilince vergi no alanı KAPANIYOR ve gövdeye hiç girmiyor (§10).
  it('şahıs seçilince vergi no alanı kapanır ve temizlenir', async () => {
    openForm()
    await screen.findByRole('heading', { name: 'Firma Bilgileri' })
    await fillFirmInfo()

    const taxNumber = screen.getByLabelText(/^Vergi No/)
    expect(taxNumber).toHaveValue('1234567890')

    await userEvent.click(screen.getByRole('checkbox', { name: 'Şahıs Şirketi' }))

    expect(taxNumber).toBeDisabled()
    expect(taxNumber).toHaveValue('')
  })
})
