import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteProject, submitProject } from '../../../../api/projects'
import { useProjectActions } from '../useProjectActions'

vi.mock('../../../../api/projects', () => ({
  deleteProject: vi.fn(),
  submitProject: vi.fn(),
}))

const deleteProjectMock = vi.mocked(deleteProject)
const submitProjectMock = vi.mocked(submitProject)

const PROJECT_ID = 7

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useProjectActions', () => {
  it('silme onayı iptal edilince istek atmaz', () => {
    const onChanged = vi.fn()
    const { result } = renderHook(() => useProjectActions({ onChanged }))

    act(() => result.current.requestDelete(PROJECT_ID))
    expect(result.current.deleteTargetId).toBe(PROJECT_ID)
    expect(deleteProjectMock).not.toHaveBeenCalled()

    act(() => result.current.cancelDelete())

    expect(result.current.deleteTargetId).toBeNull()
    expect(deleteProjectMock).not.toHaveBeenCalled()
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('onaylanan silmede isteği atar ve listeyi tazeler', async () => {
    const onChanged = vi.fn()
    deleteProjectMock.mockResolvedValue()
    const { result } = renderHook(() => useProjectActions({ onChanged }))

    act(() => result.current.requestDelete(PROJECT_ID))
    await act(async () => {
      await result.current.confirmDelete()
    })

    expect(deleteProjectMock).toHaveBeenCalledWith(PROJECT_ID)
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(result.current.notice?.tone).toBe('success')
    expect(result.current.deleteTargetId).toBeNull()
  })

  it('eksik evrakta projeyi listede tutar ve eksikleri sayar', async () => {
    const onChanged = vi.fn()
    submitProjectMock.mockResolvedValue({
      ok: false,
      missingDocuments: ['Tapu fotokopisi', 'Yapı ruhsatı'],
    })
    const { result } = renderHook(() => useProjectActions({ onChanged }))

    await act(async () => {
      await result.current.submit(PROJECT_ID)
    })

    expect(result.current.notice).toEqual({
      tone: 'error',
      message: expect.stringContaining('eksik'),
      details: ['Tapu fotokopisi', 'Yapı ruhsatı'],
    })
    // Liste tazelenmez: proje taslak sekmesinde kalmalı.
    expect(onChanged).not.toHaveBeenCalled()
    expect(result.current.pendingProjectId).toBeNull()
  })

  it('başarılı göndermede listeyi tazeler', async () => {
    const onChanged = vi.fn()
    submitProjectMock.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useProjectActions({ onChanged }))

    await act(async () => {
      await result.current.submit(PROJECT_ID)
    })

    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(result.current.notice?.tone).toBe('success')
  })

  it('istek hata verirse anlaşılır Türkçe mesaj gösterir', async () => {
    const onChanged = vi.fn()
    submitProjectMock.mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useProjectActions({ onChanged }))

    await act(async () => {
      await result.current.submit(PROJECT_ID)
    })

    await waitFor(() => expect(result.current.notice?.tone).toBe('error'))
    expect(result.current.notice?.message).toContain('tekrar deneyin')
    expect(onChanged).not.toHaveBeenCalled()
  })
})
