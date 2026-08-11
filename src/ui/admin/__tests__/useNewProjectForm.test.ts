import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NEW_PROJECT_ERRORS } from '../projects/newProjectSchema'
import { useNewProjectForm } from '../projects/useNewProjectForm'

const createProject = vi.hoisted(() => vi.fn())

vi.mock('../../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/projects')>()),
  createProject,
}))

const TODAY = new Date(2026, 7, 4)

function fillValidValues(form: { setValue: ReturnType<typeof useNewProjectForm>['setValue'] }) {
  form.setValue('name', 'Yıldız Apartmanı')
  form.setValue('projectFirmId', 11)
  form.setValue('gasDistributionFirmId', 101)
  form.setValue('engineerUserId', 501)
  form.setValue('cityId', 6)
  form.setValue('districtId', 64)
  form.setValue('address', 'Çankaya 12. Sokak No 5')
  form.setValue('projectType', 'ILAVE')
  form.setValue('heatingType', 'bireysel')
  form.setValue('buildingUsageType', 'coklu')
}

beforeEach(() => {
  createProject.mockReset()
  createProject.mockResolvedValue({ id: 99, pId: '24999', status: 'taslak' })
})

describe('useNewProjectForm', () => {
  it('varsayılan değerlerle açılır ve temizdir', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    expect(result.current.values.startDate).toBe('2026-08-04')
    expect(result.current.values.endDate).toBe('2026-10-04')
    expect(result.current.values.serviceBoxPressureMbar).toBe(21)
    expect(result.current.isDirty).toBe(false)
  })

  it('bir alana dokununca kirlenir', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => result.current.setValue('name', 'A'))

    expect(result.current.isDirty).toBe(true)
  })

  it('proje firması değişince mühendis ve GD firması temizlenir', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => {
      result.current.setValue('projectFirmId', 11)
    })
    act(() => {
      result.current.setValue('engineerUserId', 501)
      result.current.setValue('gasDistributionFirmId', 101)
    })
    act(() => {
      result.current.setValue('projectFirmId', 12)
    })

    expect(result.current.values.engineerUserId).toBeNull()
    expect(result.current.values.gasDistributionFirmId).toBeNull()
  })

  it('başlama tarihi silinince bitiş tarihi de düşer', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => {
      result.current.setValue('startDate', '')
    })

    expect(result.current.values.endDate).toBe('')
  })

  it('başlama tarihi değişince bitiş tarihi iki ay sonrası olarak yeniden hesaplanır', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => {
      result.current.setValue('startDate', '2026-09-01')
    })

    expect(result.current.values.endDate).toBe('2026-11-01')
  })

  it('elle girilen bitiş tarihi, başlama sonradan değişince türetilene bırakır', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => {
      result.current.setValue('endDate', '2026-09-01')
    })
    act(() => {
      result.current.setValue('startDate', '2026-10-01')
    })

    // Sıra kuralı: bitişi önce girmek, başlama değişince anlamını yitirir.
    expect(result.current.values.endDate).toBe('2026-12-01')
  })

  it('ay sonu başlangıcında bitiş tarihi taşmaz', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => {
      result.current.setValue('startDate', '2026-12-31')
    })

    // 31 Aralık + 2 ay ham hesapta 3 Mart'a kayardı.
    expect(result.current.values.endDate).toBe('2027-02-28')
  })

  it('aynı firma yeniden seçilirse mühendis korunur', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => {
      result.current.setValue('projectFirmId', 11)
    })
    act(() => {
      result.current.setValue('engineerUserId', 501)
    })
    act(() => {
      result.current.setValue('projectFirmId', 11)
    })

    expect(result.current.values.engineerUserId).toBe(501)
  })

  it('proje tipi seçenekleri gelince ilk seçenek varsayılan olur', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => result.current.applyProjectTypeOptions(['ILAVE', 'KOLON']))

    expect(result.current.values.projectType).toBe('ILAVE')
  })

  it('kullanıcı seçim yaptıysa gelen liste seçimi ezmez', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => result.current.setValue('projectType', 'KOLON'))
    act(() => result.current.applyProjectTypeOptions(['ILAVE', 'KOLON']))

    expect(result.current.values.projectType).toBe('KOLON')
  })

  it('seçili tip Ayarlar’dan kaldırılmışsa seçim temizlenir', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => result.current.setValue('projectType', 'KOLON'))
    act(() => result.current.applyProjectTypeOptions(['ILAVE', 'RUHSAT']))

    // Sunucuya listede olmayan kod gitmemeli; kullanıcı yeniden seçmeli.
    expect(result.current.values.projectType).toBe('')
  })

  it('temizlenen seçim sonraki liste tazelemesinde geri gelmez', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => result.current.setValue('projectType', 'KOLON'))
    act(() => result.current.applyProjectTypeOptions(['ILAVE', 'RUHSAT']))
    act(() => result.current.applyProjectTypeOptions(['ILAVE', 'RUHSAT']))

    expect(result.current.values.projectType).toBe('')
  })

  it('boş liste gelirse mevcut seçim korunur', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    act(() => result.current.setValue('projectType', 'KOLON'))
    act(() => result.current.applyProjectTypeOptions([]))

    expect(result.current.values.projectType).toBe('KOLON')
  })

  it('ısınma ve bina kullanımı tipi varsayılan almaz, boş açılır', () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    expect(result.current.values.heatingType).toBe('')
    expect(result.current.values.buildingUsageType).toBe('')
  })

  it('geçersiz formda createProject ÇAĞRILMAZ ve hatalar dolar', async () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    await act(async () => {
      await result.current.submit()
    })

    expect(createProject).not.toHaveBeenCalled()
    expect(result.current.errors.name).toBe(NEW_PROJECT_ERRORS.name)
    // Odak ekrandaki ilk hatalı alana taşınır.
    expect(result.current.focusField).toBe('name')
  })

  it('alan düzeltilince o alanın hatası kaybolur', async () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

    await act(async () => {
      await result.current.submit()
    })
    act(() => result.current.setValue('name', 'Yıldız Apartmanı'))

    expect(result.current.errors.name).toBeUndefined()
  })

  it('geçerli formda doğru gövdeyle gönderir', async () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

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
      engineerUserId: 501,
      heatingType: 'bireysel',
      serviceBoxPressureMbar: 21,
    })
  })

  it('admin olmayan kullanıcıda firma alanları gövdeye girmez', async () => {
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: false, today: TODAY }))

    act(() => {
      result.current.setValue('name', 'Yıldız Apartmanı')
      result.current.setValue('engineerUserId', 501)
      result.current.setValue('cityId', 6)
      result.current.setValue('districtId', 64)
      result.current.setValue('address', 'Çankaya 12. Sokak No 5')
      result.current.setValue('projectType', 'ILAVE')
      result.current.setValue('heatingType', 'bireysel')
      result.current.setValue('buildingUsageType', 'coklu')
    })
    await act(async () => {
      await result.current.submit()
    })

    expect(createProject).toHaveBeenCalledTimes(1)
    expect('projectFirmId' in createProject.mock.calls[0][0]).toBe(false)
  })

  it('sunucu hatasında form verisi korunur ve mesaj gösterilir', async () => {
    createProject.mockRejectedValue(new Error('500'))
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

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
    const { result } = renderHook(() => useNewProjectForm({ isAdmin: true, today: TODAY }))

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
