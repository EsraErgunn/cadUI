import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DfirmNoTakenError } from '../../../api/adminFirmForm'
import { GAS_FIRM_ERRORS } from '../firms/gasFirmSchema'
import { buildEmptyGasFirmValues } from '../firms/gasFirmValues'
import { useGasFirmForm } from '../firms/useGasFirmForm'

vi.mock('../../../api/adminFirmForm', async () => {
  const actual = await vi.importActual<typeof import('../../../api/adminFirmForm')>(
    '../../../api/adminFirmForm',
  )
  return {
    ...actual,
    createGasDistributionFirm: vi.fn(),
    updateGasDistributionFirm: vi.fn(),
  }
})

const { createGasDistributionFirm, updateGasDistributionFirm } = await import(
  '../../../api/adminFirmForm'
)

const createMock = vi.mocked(createGasDistributionFirm)
const updateMock = vi.mocked(updateGasDistributionFirm)

const NEW_FIRM_ID = 500

function buildValidValues() {
  return {
    ...buildEmptyGasFirmValues(),
    dfirmNo: '1300',
    name: 'ADANA DOĞALGAZ',
    groupId: '3',
    phoneDigits: '05551234567',
  }
}

function renderForm(firmId: number | null = null, values = buildValidValues()) {
  return renderHook(() => useGasFirmForm({ firmId, initialValues: values }))
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('açılış', () => {
  it('verilen değerleri bir kez alır', () => {
    const { result } = renderForm(null, { ...buildValidValues(), dfirmNo: '115' })

    expect(result.current.values.dfirmNo).toBe('115')
    expect(result.current.isDirty).toBe(false)
  })

  it('firma kimliği doluysa güncelleme modundadır', () => {
    expect(renderForm(7).result.current.isUpdateMode).toBe(true)
    expect(renderForm(null).result.current.isUpdateMode).toBe(false)
  })
})

describe('setValue', () => {
  it('dokunulunca form kirlenir', () => {
    const { result } = renderForm()

    act(() => result.current.setValue('name', 'X'))

    expect(result.current.isDirty).toBe(true)
  })

  // Belge: kullanıcı alanı geçerli biçimde doldurduğunda hata ANINDA kalkar.
  it('alan düzeltilince hatası anında kalkar', async () => {
    const { result } = renderForm(null, { ...buildValidValues(), name: '' })

    await act(async () => void (await result.current.submit()))
    expect(result.current.errors.name).toBe(GAS_FIRM_ERRORS.name)

    act(() => result.current.setValue('name', 'ADANA'))
    expect(result.current.errors.name).toBeUndefined()
  })

  it('telefona harf yazılamaz', () => {
    const { result } = renderForm()

    act(() => result.current.setValue('phoneDigits', '0abc555x'))

    expect(result.current.values.phoneDigits).toBe('0555')
  })

  it('firma numarasına harf yazılamaz', () => {
    const { result } = renderForm()

    act(() => result.current.setValue('dfirmNo', '1a2b3'))

    expect(result.current.values.dfirmNo).toBe('123')
  })
})

describe('submit', () => {
  // KK-8: eksik alanda kayıt olmaz ve odak ilk hatalı alana gider.
  it('eksik alanda kaydetmez ve ilk hatalı alanı odağa ister', async () => {
    const { result } = renderForm(null, {
      ...buildValidValues(),
      dfirmNo: '',
      name: '',
      phoneDigits: '',
    })

    let saved: number | null = 1
    await act(async () => {
      saved = await result.current.submit()
    })

    expect(saved).toBeNull()
    expect(createMock).not.toHaveBeenCalled()
    expect(result.current.focusField).toBe('dfirmNo')
  })

  it('geçerli formda ekleme ucunu çağırır', async () => {
    createMock.mockResolvedValue(NEW_FIRM_ID)
    const { result } = renderForm()

    let saved: number | null = null
    await act(async () => {
      saved = await result.current.submit()
    })

    expect(saved).toBe(NEW_FIRM_ID)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ dfirmNo: 1300, name: 'ADANA DOĞALGAZ', phone: '05551234567' }),
    )
  })

  it('güncelleme modunda güncelleme ucunu çağırır', async () => {
    updateMock.mockResolvedValue(7)
    const { result } = renderForm(7)

    await act(async () => void (await result.current.submit()))

    expect(updateMock).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'ADANA DOĞALGAZ' }))
    expect(createMock).not.toHaveBeenCalled()
  })

  it('boş opsiyonel alanları null gönderir', async () => {
    createMock.mockResolvedValue(NEW_FIRM_ID)
    const { result } = renderForm()

    await act(async () => void (await result.current.submit()))

    // Grup zorunlu olduğu için kimlik her zaman dolu gider; boş metin alanları null.
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 3, description: null, address: null }),
    )
  })

  // KK-9: benzersizliğe sunucu karar verir; hata Firma No alanına bağlanır.
  it('sunucu çakışmasını Firma No alanına bağlar ve odağı oraya ister', async () => {
    createMock.mockRejectedValue(new DfirmNoTakenError())
    const { result } = renderForm()

    let saved: number | null = 1
    await act(async () => {
      saved = await result.current.submit()
    })

    expect(saved).toBeNull()
    expect(result.current.errors.dfirmNo).toBe(GAS_FIRM_ERRORS.dfirmNoTaken)
    expect(result.current.focusField).toBe('dfirmNo')
    expect(result.current.submitError).toBeNull()
  })

  it('diğer sunucu hatalarında girilen veri korunur', async () => {
    createMock.mockRejectedValue(new Error('ağ'))
    const { result } = renderForm()

    await act(async () => void (await result.current.submit()))

    expect(result.current.submitError).not.toBeNull()
    expect(result.current.values.name).toBe('ADANA DOĞALGAZ')
    expect(result.current.errors.dfirmNo).toBeUndefined()
  })
})
