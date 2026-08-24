import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CREATE_ROUTE,
  EMPTY_FIRM_PAGE,
  FIRM_GROUPS,
  NEXT_DFIRM_NO,
  renderFirmFormPage,
} from './gasFirmFormFixture'

const formApi = vi.hoisted(() => ({
  getNextDfirmNo: vi.fn(),
  getGasDistributionFirm: vi.fn(),
  createGasDistributionFirm: vi.fn(),
  updateGasDistributionFirm: vi.fn(),
}))

const listApi = vi.hoisted(() => ({
  getFirmGroups: vi.fn(),
  getGasDistributionFirms: vi.fn(),
  createFirmGroup: vi.fn(),
}))

vi.mock('../../api/adminFirmForm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminFirmForm')>()),
  ...formApi,
}))

vi.mock('../../api/adminFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/adminFirms')>()),
  ...listApi,
}))

const NEW_GROUP = { id: 9, name: 'Yeni Grup' }

beforeEach(() => {
  formApi.getNextDfirmNo.mockResolvedValue(NEXT_DFIRM_NO)
  listApi.getFirmGroups.mockResolvedValue(FIRM_GROUPS)
  listApi.getGasDistributionFirms.mockResolvedValue(EMPTY_FIRM_PAGE)
  listApi.createFirmGroup.mockResolvedValue(NEW_GROUP)
})

afterEach(() => {
  vi.clearAllMocks()
})

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  renderFirmFormPage({ form: formApi, list: listApi }, CREATE_ROUTE)
  await user.click(await screen.findByRole('button', { name: 'Yeni gaz dağıtım grubu ekle' }))

  // "Kaydet" ekranda İKİ tane: biri diyalogun, biri firma formunun.
  return within(screen.getByRole('dialog'))
}

/**
 * Grup firması ekleme diyalogu, FİRMA FORMUNUN İÇİNDE açılıyor. `submit` olayı
 * DOM'da yukarı baloncuklandığı için, diyalogun kendi "Kaydet" düğmesi dıştaki
 * firma formunun `onSubmit`'ini de tetikliyordu: grup kaydedilmiyor, bunun
 * yerine yarım doldurulmuş firma formu gönderilmeye çalışılıyordu.
 */
describe('grup firması ekleme diyalogu', () => {
  it('grubu kaydeder', async () => {
    const user = userEvent.setup()
    const dialog = await openDialog(user)

    await user.type(dialog.getByLabelText(/^Grup Adı/), NEW_GROUP.name)
    await user.click(dialog.getByRole('button', { name: 'Kaydet' }))

    await waitFor(() => expect(listApi.createFirmGroup).toHaveBeenCalledWith(NEW_GROUP.name))
  })

  /** Asıl kusur: dıştaki firma formu HİÇ gönderilmemeli. */
  it('dıştaki firma formunu göndermez', async () => {
    const user = userEvent.setup()
    const dialog = await openDialog(user)

    await user.type(dialog.getByLabelText(/^Grup Adı/), NEW_GROUP.name)
    await user.click(dialog.getByRole('button', { name: 'Kaydet' }))

    await waitFor(() => expect(listApi.createFirmGroup).toHaveBeenCalled())
    expect(formApi.createGasDistributionFirm).not.toHaveBeenCalled()
  })
})

describe('iç içe form kusuru', () => {
  /**
   * Diyalog `document.body`'ye portal ile basılıyor; firma formunun DOM
   * ağacında DEĞİL. Yerinde render edilseydi `submit` olayı dıştaki forma da
   * ulaşır, kullanıcı grubu kaydederken firma formu doğrulama hatalarıyla
   * dolardı.
   */
  it('dıştaki formun doğrulamasını tetiklemez', async () => {
    const user = userEvent.setup()
    const dialog = await openDialog(user)

    await user.type(dialog.getByLabelText(/^Grup Adı/), NEW_GROUP.name)
    await user.click(dialog.getByRole('button', { name: 'Kaydet' }))

    await waitFor(() => expect(listApi.createFirmGroup).toHaveBeenCalled())
    // Dış form gönderilmiş olsaydı zorunlu alan hataları görünürdü.
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })
})
