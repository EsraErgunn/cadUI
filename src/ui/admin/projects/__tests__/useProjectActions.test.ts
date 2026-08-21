import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { submitProjectDecision } from '../../../../api/projectDetail'
import { deleteProject, submitProject } from '../../../../api/projects'
import { useProjectActions } from '../useProjectActions'

/**
 * KISMİ mock: `api/projectDetail` → `projectDetailTypes` zinciri
 * `PROJECT_STATUSES` sabitini bu modülden okuyor. Tam mock, o sabiti
 * kaybettirip modülü import edilemez hâle getiriyordu.
 */
vi.mock('../../../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../api/projects')>()),
  deleteProject: vi.fn(),
  submitProject: vi.fn(),
}))

vi.mock('../../../../api/projectDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../api/projectDetail')>()),
  submitProjectDecision: vi.fn(),
}))

const deleteProjectMock = vi.mocked(deleteProject)
const submitProjectMock = vi.mocked(submitProject)
const submitDecisionMock = vi.mocked(submitProjectDecision)

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

/**
 * Onay/ret. Uç `POST /api/projects/{id}/approve|reject`; çağrı proje detayıyla
 * AYNI fonksiyondan (`submitProjectDecision`) geçiyor.
 */
describe('useProjectActions — onay/ret', () => {
  it('onay isteği doğrudan gider, gerekçe sormaz', async () => {
    submitDecisionMock.mockResolvedValue({ status: 'onaylanan', approvalCode: null })
    const onChanged = vi.fn()
    const { result } = renderHook(() => useProjectActions({ onChanged }))

    act(() => result.current.decide('approve', PROJECT_ID))

    expect(result.current.rejectTargetId).toBeNull()
    await waitFor(() => expect(submitDecisionMock).toHaveBeenCalledWith(PROJECT_ID, 'approve', null))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  /** Gerekçe kuralı `requiresReason`'da; diyalog açılmadan istek ATILMAZ. */
  it('ret önce gerekçe bekler, istek atmaz', () => {
    const { result } = renderHook(() => useProjectActions({ onChanged: vi.fn() }))

    act(() => result.current.decide('reject', PROJECT_ID))

    expect(result.current.rejectTargetId).toBe(PROJECT_ID)
    expect(submitDecisionMock).not.toHaveBeenCalled()
  })

  it('gerekçe onaylanınca ret isteği gider', async () => {
    submitDecisionMock.mockResolvedValue({ status: 'reddedilen', approvalCode: null })
    const onChanged = vi.fn()
    const { result } = renderHook(() => useProjectActions({ onChanged }))

    act(() => result.current.decide('reject', PROJECT_ID))
    await act(async () => {
      await result.current.confirmReject('Kolon çapı yetersiz')
    })

    expect(submitDecisionMock).toHaveBeenCalledWith(PROJECT_ID, 'reject', 'Kolon çapı yetersiz')
    expect(result.current.rejectTargetId).toBeNull()
    expect(onChanged).toHaveBeenCalled()
  })

  it('gerekçe iptal edilince istek atmaz', () => {
    const { result } = renderHook(() => useProjectActions({ onChanged: vi.fn() }))

    act(() => result.current.decide('reject', PROJECT_ID))
    act(() => result.current.cancelReject())

    expect(result.current.rejectTargetId).toBeNull()
    expect(submitDecisionMock).not.toHaveBeenCalled()
  })

  it('uç hata verirse listeyi tazelemez ve hata bildirir', async () => {
    submitDecisionMock.mockRejectedValue(new Error('403'))
    const onChanged = vi.fn()
    const { result } = renderHook(() => useProjectActions({ onChanged }))

    act(() => result.current.decide('approve', PROJECT_ID))

    await waitFor(() => expect(result.current.notice?.tone).toBe('error'))
    expect(onChanged).not.toHaveBeenCalled()
  })
})
