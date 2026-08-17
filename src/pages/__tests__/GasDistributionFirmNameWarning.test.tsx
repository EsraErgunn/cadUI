import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EXISTING_FIRM, UPDATE_ROUTE, renderFirmFormPage } from './gasFirmFormFixture'

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

async function openForm(route?: string) {
  renderFirmFormPage({ form: firmFormApi, list: firmListApi }, route)
  return await screen.findByLabelText(/Firma No/)
}

function buildPage(items: { id: number; name: string }[]) {
  return {
    items: items.map((item) => ({ ...item, dfirmNo: 1, groupId: null, groupName: null })),
    totalCount: items.length,
    page: 1,
    pageSize: 30,
  }
}

afterEach(() => vi.clearAllMocks())

/**
 * Belge madde 9: aynı isimde firma varsa kullanıcı UYARILIR, kayıt engellenmez.
 * Eşleşme birebir değil benzerlik — arama zaten büyük/küçük harf ve Türkçe
 * karakter duyarsız, içerik bazlı (KK-4).
 */
describe('benzer isim uyarısı', () => {
  // Şart (a): sorgu yalnızca alandan ÇIKINCA atılır, her tuş vuruşunda değil.
  it('yazarken sorgu atmaz, yalnızca alandan çıkınca atar', async () => {
    await openForm()
    firmListApi.getGasDistributionFirms.mockResolvedValue(buildPage([]))

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'ADANA DOĞALGAZ')
    expect(firmListApi.getGasDistributionFirms).not.toHaveBeenCalled()

    await userEvent.tab()

    await waitFor(() => expect(firmListApi.getGasDistributionFirms).toHaveBeenCalledTimes(1))
  })

  it('benzeyen kayıtları sayar, adlarını listeler ve kaydetmeyi engellemez', async () => {
    // Mock'lar openForm SONRASINDA kuruluyor: ortak kurulum kendi varsayılanlarını
    // yazıyor, önce ayarlansaydı üstüne binerdi.
    await openForm()
    firmListApi.getGasDistributionFirms.mockResolvedValue(
      buildPage([{ id: 1, name: 'Adana Doğalgaz Dağıtım A.Ş.' }]),
    )
    firmFormApi.createGasDistributionFirm.mockResolvedValue(SAVED_FIRM_ID)

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'ADANA DOĞALGAZ')
    await userEvent.tab()

    expect(await screen.findByText(/Bu isme benzeyen 1 kayıt var/)).toBeInTheDocument()
    // Uyarı hata DEĞİL: alan geçersiz işaretlenmez, kenarlık kırmızıya dönmez.
    expect(screen.getByLabelText(/Firma Adı/)).not.toHaveAttribute('aria-invalid')

    await userEvent.type(screen.getByLabelText(/Telefon/), '05551234567')
    await userEvent.click(screen.getByRole('button', { name: /^Kaydet$/ }))

    expect(
      await screen.findByRole('heading', { name: 'Gaz Dağıtım Firmaları' }),
    ).toBeInTheDocument()
  })

  // Şart (c): güncellenen kaydın KENDİSİ eşleşmelerden çıkarılır; yoksa mevcut
  // firmayı açan herkes uyarıyı kendisi için görürdü.
  it('güncelleme modunda kaydın kendisi elenir', async () => {
    await openForm(UPDATE_ROUTE)
    firmListApi.getGasDistributionFirms.mockResolvedValue(
      buildPage([{ id: EXISTING_FIRM.id, name: EXISTING_FIRM.name }]),
    )

    await userEvent.click(screen.getByLabelText(/Firma Adı/))
    await userEvent.tab()

    await waitFor(() => expect(firmListApi.getGasDistributionFirms).toHaveBeenCalled())
    expect(screen.queryByText(/Bu isme benzeyen/)).not.toBeInTheDocument()
  })

  // Şart (b): kolaylık, kritik yol değil — sessizce geçilir.
  it('sorgu hata verirse sessizce geçilir ve kaydetmeyi etkilemez', async () => {
    await openForm()
    firmListApi.getGasDistributionFirms.mockRejectedValue(new Error('ağ'))
    firmFormApi.createGasDistributionFirm.mockResolvedValue(SAVED_FIRM_ID)

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'ADANA')
    await userEvent.tab()

    await waitFor(() => expect(firmListApi.getGasDistributionFirms).toHaveBeenCalled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/Telefon/), '05551234567')
    await userEvent.click(screen.getByRole('button', { name: /^Kaydet$/ }))

    expect(
      await screen.findByRole('heading', { name: 'Gaz Dağıtım Firmaları' }),
    ).toBeInTheDocument()
  })

  it('ad değişince eski uyarı düşer', async () => {
    await openForm()
    firmListApi.getGasDistributionFirms.mockResolvedValue(
      buildPage([{ id: 1, name: 'Adana Doğalgaz Dağıtım A.Ş.' }]),
    )

    await userEvent.type(screen.getByLabelText(/Firma Adı/), 'ADANA')
    await userEvent.tab()
    expect(await screen.findByText(/Bu isme benzeyen/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/Firma Adı/), ' X')

    expect(screen.queryByText(/Bu isme benzeyen/)).not.toBeInTheDocument()
  })
})
