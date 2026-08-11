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
 * Yetkilendirme yazan uç yok: gerçek uçta firma sunucuya gidiyor, yetkiler
 * mock'ta kalıyor. Kullanıcı bunu GÖRMELİ — sessiz yarım kayıt olmaz.
 * Şeridin kendisi liste ekranında (`ProjectFirmsNotice.test.tsx`); burada
 * bayrağın doğru üretilip taşındığı sınanıyor.
 */
describe('yarım kayıt görünürlüğü', () => {
  it('yetkilendirmeler kalıcı değilse uyarı bayrağını listeye taşır', async () => {
    formApi.saveProjectFirmAuthorizations.mockResolvedValueOnce({ arePersisted: false })
    await fillReadyForm()

    await save()
    await expectOnList()

    expect(screen.getByTestId('list-state')).toHaveTextContent(
      '"hasPendingAuthorizations":true',
    )
  })

  it('mock modda uyarı bayrağı düşer', async () => {
    await fillReadyForm()

    await save()
    await expectOnList()

    expect(screen.getByTestId('list-state')).toHaveTextContent(
      '"hasPendingAuthorizations":false',
    )
  })
})

/**
 * Sunucunun doğrulayıcısı `companyType == 2` istiyor; şahıs şirketi işaretli
 * her kayıt gerçek ortamda 400 alacak. Ham sunucu metni tek başına neyi
 * düzelteceğini söylemiyordu.
 */
describe('şahıs şirketi sunucuda desteklenmiyor', () => {
  async function saveAsSoleProprietorship() {
    const { ApiError } = await import('../../api/http')
    formApi.createProjectFirm.mockRejectedValueOnce(
      new ApiError(400, 'Şu an yalnızca tüzel firma (CompanyType=2) eklenebilir.'),
    )

    openForm()
    await selectGroup('AKSA')
    await addAuthorization()
    await fillFirmInfo({ 'Vergi No': '' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Şahıs Şirketi' }))
    await userEvent.type(screen.getByLabelText(/^Tc Kimlik No/), '12345678901')

    await save()
  }

  it('sebebi söyleyen mesajı sunucu yanıtıyla birlikte gösterir', async () => {
    await saveAsSoleProprietorship()

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent(PROJECT_FIRM_ERRORS.soleProprietorshipUnsupported)
    // Sunucunun kendi metni de korunuyor: örtülseydi hata izlenemez olurdu.
    expect(notice).toHaveTextContent('Şu an yalnızca tüzel firma (CompanyType=2) eklenebilir.')
  })

  it('odağı düzeltilecek onay kutusuna taşır ve veriyi korur', async () => {
    await saveAsSoleProprietorship()
    await screen.findByRole('alert')

    expect(screen.getByRole('checkbox', { name: 'Şahıs Şirketi' })).toHaveFocus()
    expect(screen.getByLabelText(/^Tc Kimlik No/)).toHaveValue('12345678901')
  })
})
