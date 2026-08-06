import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildEmptyGasFirmValues } from '../firms/gasFirmValues'
import { useGasFirmForm } from '../firms/useGasFirmForm'

vi.mock('../../../api/adminFirmForm', async () => {
  const actual = await vi.importActual<typeof import('../../../api/adminFirmForm')>(
    '../../../api/adminFirmForm',
  )
  return { ...actual, createGasDistributionFirm: vi.fn() }
})

vi.mock('../../../api/adminFirms', async () => {
  const actual = await vi.importActual<typeof import('../../../api/adminFirms')>(
    '../../../api/adminFirms',
  )
  return { ...actual, getGasDistributionFirms: vi.fn() }
})

const { createGasDistributionFirm } = await import('../../../api/adminFirmForm')
const { getGasDistributionFirms } = await import('../../../api/adminFirms')

const createMock = vi.mocked(createGasDistributionFirm)
const listMock = vi.mocked(getGasDistributionFirms)

const NEW_FIRM_ID = 500

function renderForm(firmId: number | null = null) {
  const initialValues = {
    ...buildEmptyGasFirmValues(),
    dfirmNo: '1300',
    name: 'ADANA DOĞALGAZ',
    phoneDigits: '05551234567',
  }
  return renderHook(() => useGasFirmForm({ firmId, initialValues }))
}

function buildListPage(items: { id: number; name: string }[]) {
  return {
    items: items.map((item) => ({ ...item, dfirmNo: 1, groupName: null, region: 'Ege' })),
    totalCount: items.length,
    page: 1,
    pageSize: 30,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

/**
 * Belge madde 9: aynı isimde firma varsa kullanıcı uyarılır ama kayıt
 * ENGELLENMEZ. Eşleşme birebir değil benzerlik — arama zaten büyük/küçük harf
 * ve Türkçe karakter duyarsız, içerik bazlı (KK-4).
 */
describe('benzer isim uyarısı', () => {
  it('benzeyen kayıtları sayar ve adlarını listeler', async () => {
    listMock.mockResolvedValue(
      buildListPage([
        { id: 1, name: 'Adana Doğalgaz Dağıtım A.Ş.' },
        { id: 2, name: 'Adana Gaz Dağıtım A.Ş.' },
      ]),
    )
    const { result } = renderForm()

    await act(async () => void (await result.current.checkSimilarNames()))

    expect(result.current.nameWarning).toContain('2 kayıt var')
    expect(result.current.nameWarning).toContain('Adana Doğalgaz Dağıtım A.Ş.')
  })

  it('eşleşme yoksa uyarı çıkmaz', async () => {
    listMock.mockResolvedValue(buildListPage([]))
    const { result } = renderForm()

    await act(async () => void (await result.current.checkSimilarNames()))

    expect(result.current.nameWarning).toBeNull()
  })

  // Yoksa mevcut firmayı açan herkes uyarıyı kendisi için görürdü.
  it('güncelleme modunda kaydın kendisi elenir', async () => {
    listMock.mockResolvedValue(buildListPage([{ id: 7, name: 'ADANA DOĞALGAZ' }]))
    const { result } = renderForm(7)

    await act(async () => void (await result.current.checkSimilarNames()))

    expect(result.current.nameWarning).toBeNull()
  })

  // Kolaylık, kritik yol değil.
  it('sorgu hata verirse sessizce geçer ve kaydetmeyi engellemez', async () => {
    listMock.mockRejectedValue(new Error('ağ'))
    createMock.mockResolvedValue(NEW_FIRM_ID)
    const { result } = renderForm()

    await act(async () => void (await result.current.checkSimilarNames()))
    expect(result.current.nameWarning).toBeNull()
    expect(result.current.submitError).toBeNull()

    let saved: number | null = null
    await act(async () => {
      saved = await result.current.submit()
    })

    expect(saved).toBe(NEW_FIRM_ID)
  })

  it('uyarı hata değildir: odak mantığına girmez, Kaydet çalışır', async () => {
    listMock.mockResolvedValue(buildListPage([{ id: 1, name: 'Adana Doğalgaz Dağıtım A.Ş.' }]))
    createMock.mockResolvedValue(NEW_FIRM_ID)
    const { result } = renderForm()

    await act(async () => void (await result.current.checkSimilarNames()))
    expect(result.current.nameWarning).not.toBeNull()

    let saved: number | null = null
    await act(async () => {
      saved = await result.current.submit()
    })

    expect(saved).toBe(NEW_FIRM_ID)
    expect(result.current.errors).toEqual({})
    expect(result.current.focusField).toBeNull()
  })

  it('ad değişince eski uyarı düşer', async () => {
    listMock.mockResolvedValue(buildListPage([{ id: 1, name: 'Adana Doğalgaz Dağıtım A.Ş.' }]))
    const { result } = renderForm()

    await act(async () => void (await result.current.checkSimilarNames()))
    expect(result.current.nameWarning).not.toBeNull()

    act(() => result.current.setValue('name', 'BAŞKA FİRMA'))

    expect(result.current.nameWarning).toBeNull()
  })

  it('boş adda sorgu hiç atılmaz', async () => {
    const { result } = renderForm()

    act(() => result.current.setValue('name', '   '))
    await act(async () => void (await result.current.checkSimilarNames()))

    expect(listMock).not.toHaveBeenCalled()
    expect(result.current.nameWarning).toBeNull()
  })
})
