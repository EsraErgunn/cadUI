import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NEW_PROJECT_ERRORS } from '../projects/newProjectSchema'
import { useNewProjectForm } from '../projects/useNewProjectForm'

const createProject = vi.hoisted(() => vi.fn())

vi.mock('../../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/projects')>()),
  createProject,
}))

/** Kod kimlikleri kod grubu ucundan gelir; testte sayısal değerleri sözleşme değil. */
const PROJECT_TYPE_CODE_ID = 3
const HEATING_TYPE_CODE_ID = 8
const BUILDING_USAGE_TYPE_CODE_ID = 12

function fillValidValues(form: { setValue: ReturnType<typeof useNewProjectForm>['setValue'] }) {
  form.setValue('name', 'Yıldız Apartmanı')
  form.setValue('projectFirmId', 11)
  form.setValue('gasDistributionFirmId', 101)
  form.setValue('cityId', 6)
  form.setValue('districtId', 64)
  form.setValue('address', 'Çankaya 12. Sokak No 5')
  form.setValue('projectTypeCodeId', PROJECT_TYPE_CODE_ID)
  form.setValue('heatingTypeCodeId', HEATING_TYPE_CODE_ID)
  form.setValue('buildingUsageTypeCodeId', BUILDING_USAGE_TYPE_CODE_ID)
}

beforeEach(() => {
  createProject.mockReset()
  createProject.mockResolvedValue({ id: 99, pId: '24999', status: 'taslak' })
})

describe('useNewProjectForm', () => {
  it('varsayılan değerlerle açılır ve temizdir', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    expect(result.current.values.serviceBoxPressureMbar).toBe(21)
    expect(result.current.isDirty).toBe(false)
  })

  it('bir alana dokununca kirlenir', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    act(() => result.current.setValue('name', 'A'))

    expect(result.current.isDirty).toBe(true)
  })

  it('proje firması değişince GD firması temizlenir', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    act(() => {
      result.current.setValue('projectFirmId', 11)
    })
    act(() => {
      result.current.setValue('gasDistributionFirmId', 101)
    })
    act(() => {
      result.current.setValue('projectFirmId', 12)
    })

    expect(result.current.values.gasDistributionFirmId).toBeNull()
  })

  it('proje tipi seçenekleri gelince ilk seçenek varsayılan olur', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    act(() => result.current.applyProjectTypeOptions([3, 5]))

    expect(result.current.values.projectTypeCodeId).toBe(3)
  })

  it('kullanıcı seçim yaptıysa gelen liste seçimi ezmez', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    act(() => result.current.setValue('projectTypeCodeId', 5))
    act(() => result.current.applyProjectTypeOptions([3, 5]))

    expect(result.current.values.projectTypeCodeId).toBe(5)
  })

  it('seçili tip Ayarlar’dan kaldırılmışsa seçim temizlenir', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    act(() => result.current.setValue('projectTypeCodeId', 5))
    act(() => result.current.applyProjectTypeOptions([3, 7]))

    // Sunucuya listede olmayan kimlik gitmemeli; kullanıcı yeniden seçmeli.
    expect(result.current.values.projectTypeCodeId).toBeNull()
  })

  it('temizlenen seçim sonraki liste tazelemesinde geri gelmez', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    act(() => result.current.setValue('projectTypeCodeId', 5))
    act(() => result.current.applyProjectTypeOptions([3, 7]))
    act(() => result.current.applyProjectTypeOptions([3, 7]))

    expect(result.current.values.projectTypeCodeId).toBeNull()
  })

  it('boş liste gelirse mevcut seçim korunur', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    act(() => result.current.setValue('projectTypeCodeId', 5))
    act(() => result.current.applyProjectTypeOptions([]))

    expect(result.current.values.projectTypeCodeId).toBe(5)
  })

  it('ısınma ve bina kullanımı tipi varsayılan almaz, boş açılır', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    expect(result.current.values.heatingTypeCodeId).toBeNull()
    expect(result.current.values.buildingUsageTypeCodeId).toBeNull()
  })

  it('geçersiz formda createProject ÇAĞRILMAZ ve hatalar dolar', async () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    await act(async () => {
      await result.current.submit()
    })

    expect(createProject).not.toHaveBeenCalled()
    expect(result.current.errors.name).toBe(NEW_PROJECT_ERRORS.name)
    // Odak ekrandaki ilk hatalı alana taşınır.
    expect(result.current.focusField).toBe('name')
  })

  it('alan düzeltilince o alanın hatası kaybolur', async () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    await act(async () => {
      await result.current.submit()
    })
    act(() => result.current.setValue('name', 'Yıldız Apartmanı'))

    expect(result.current.errors.name).toBeUndefined()
  })

  it('geçerli formda doğru gövdeyle gönderir', async () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    act(() => fillValidValues(result.current))
    let created: unknown
    await act(async () => {
      created = await result.current.submit()
    })

    expect(created).toEqual({ id: 99, pId: '24999', status: 'taslak' })
    expect(createProject).toHaveBeenCalledTimes(1)
    expect(createProject.mock.calls[0][0]).toMatchObject({
      name: 'Yıldız Apartmanı',
      projectFirmId: 11,
      gasDistributionFirmId: 101,
      projectTypeCodeId: PROJECT_TYPE_CODE_ID,
      heatingTypeCodeId: HEATING_TYPE_CODE_ID,
      buildingUsageTypeCodeId: BUILDING_USAGE_TYPE_CODE_ID,
      serviceBoxPressureMbar: 21,
    })
    // Uçta karşılığı olmayan alanlar gövdeye HİÇ girmez.
    for (const field of ['startDate', 'endDate', 'engineerUserId']) {
      expect(createProject.mock.calls[0][0]).not.toHaveProperty(field)
    }
  })

  it('admin olmayan kullanıcıda firma alanları gövdeye girmez', async () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: false }))

    act(() => {
      result.current.setValue('name', 'Yıldız Apartmanı')
      result.current.setValue('cityId', 6)
      result.current.setValue('districtId', 64)
      result.current.setValue('address', 'Çankaya 12. Sokak No 5')
      result.current.setValue('projectTypeCodeId', PROJECT_TYPE_CODE_ID)
      result.current.setValue('heatingTypeCodeId', HEATING_TYPE_CODE_ID)
      result.current.setValue('buildingUsageTypeCodeId', BUILDING_USAGE_TYPE_CODE_ID)
    })
    await act(async () => {
      await result.current.submit()
    })

    expect(createProject).toHaveBeenCalledTimes(1)
    expect('projectFirmId' in createProject.mock.calls[0][0]).toBe(false)
  })

  it('sunucu hatasında form verisi korunur ve mesaj gösterilir', async () => {
    createProject.mockRejectedValue(new Error('500'))
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    act(() => fillValidValues(result.current))
    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.submitError).not.toBeNull()
    expect(result.current.values.name).toBe('Yıldız Apartmanı')
    expect(result.current.isSubmitting).toBe(false)
  })

  it('gönderim sürerken isSubmitting açık kalır', async () => {
    let release = () => {}
    createProject.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ id: 1, pId: '1', status: 'taslak' })
        }),
    )
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true }))

    act(() => fillValidValues(result.current))
    let pending: Promise<unknown> | undefined
    act(() => {
      pending = result.current.submit()
    })

    await waitFor(() => expect(result.current.isSubmitting).toBe(true))

    await act(async () => {
      release()
      await pending
    })

    expect(result.current.isSubmitting).toBe(false)
  })
})
