import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setAuthSession } from '../../api/authToken'
import { submitProjectDecision } from '../../api/projectDetail'
import { submitProject } from '../../api/projects'
import { ROLE_CODES, type RoleCode } from '../../api/roles'
import type { ValidationIssue } from '../../core/validate'
import { runProjectValidation } from '../../ui/validation/useProjectValidation'
import { useEditorSubmit } from '../useEditorSubmit'

/**
 * KISMİ mock: `api/projectDetail` → `projectDetailTypes` zinciri
 * `PROJECT_STATUSES` sabitini `api/projects`ten okuyor; tam mock o sabiti
 * kaybettirip modülü import edilemez hâle getiriyor (useProjectActions
 * testindeki tuzağın aynısı).
 */
vi.mock('../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projects')>()),
  submitProject: vi.fn(),
}))

vi.mock('../../api/projectDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectDetail')>()),
  submitProjectDecision: vi.fn(),
}))

// Denetimin KENDİSİ değil, düğmenin ona nasıl tepki verdiği ölçülüyor; kural
// motorunun testleri `core/__tests__` altında.
vi.mock('../../ui/validation/useProjectValidation', () => ({
  runProjectValidation: vi.fn(() => []),
}))

const submitProjectMock = vi.mocked(submitProject)
const submitDecisionMock = vi.mocked(submitProjectDecision)
const runValidationMock = vi.mocked(runProjectValidation)

const PROJECT_ID = 7

/** Kurala değil SAYIYA bakılıyor; künye alanları boş bırakılabilir. */
function makeIssues(count: number): ValidationIssue[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `issue-${index}`,
    ruleId: 'architecturePlan',
    message: 'test',
    location: { floorId: 1 },
  }))
}

function signIn(roleCode: RoleCode): void {
  setAuthSession({
    token: 'test',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    fullName: 'Test',
    roleCode,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  runValidationMock.mockReturnValue([])
  signIn(ROLE_CODES.projectFirmUser)
})

afterEach(() => {
  setAuthSession(undefined)
})

describe('useEditorSubmit', () => {
  it('rol gönderim düğmesinin yüzünü seçer', () => {
    const firmUser = renderHook(() => useEditorSubmit(PROJECT_ID))
    expect(firmUser.result.current.kind).toBe('submit')

    signIn(ROLE_CODES.admin)
    const admin = renderHook(() => useEditorSubmit(PROJECT_ID))
    expect(admin.result.current.kind).toBe('submit')

    signIn(ROLE_CODES.gasDistributionUser)
    const gasUser = renderHook(() => useEditorSubmit(PROJECT_ID))
    expect(gasUser.result.current.kind).toBe('approve')
  })

  it('denetim temizken onay penceresi AÇILMADAN gönderir', async () => {
    submitProjectMock.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useEditorSubmit(PROJECT_ID))

    act(() => result.current.request())

    expect(result.current.confirmIssueCount).toBeNull()
    // Beklenen ŞERİT: isteğin atıldığını beklemek yetmiyor, `setNotice` çağrının
    // devamında koşuyor ve mock'un çağrılması ondan önce görünür oluyor.
    await waitFor(() =>
      expect(result.current.notice).toEqual({
        tone: 'success',
        message: 'Proje onaya gönderildi.',
      }),
    )
    expect(submitProjectMock).toHaveBeenCalledWith(PROJECT_ID)
  })

  it('hata varsa istek ATILMAZ, onay penceresi açılır', () => {
    runValidationMock.mockReturnValue(makeIssues(3))
    const { result } = renderHook(() => useEditorSubmit(PROJECT_ID))

    act(() => result.current.request())

    expect(result.current.confirmIssueCount).toBe(3)
    expect(submitProjectMock).not.toHaveBeenCalled()
  })

  it('vazgeçilen onay isteği atmaz', () => {
    runValidationMock.mockReturnValue(makeIssues(1))
    const { result } = renderHook(() => useEditorSubmit(PROJECT_ID))

    act(() => result.current.request())
    act(() => result.current.cancel())

    expect(result.current.confirmIssueCount).toBeNull()
    expect(submitProjectMock).not.toHaveBeenCalled()
  })

  /** Hata ENGEL değil UYARI: kullanıcı onaylarsa istek gider. */
  it('hataya rağmen onaylanınca gönderir', async () => {
    runValidationMock.mockReturnValue(makeIssues(2))
    submitProjectMock.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useEditorSubmit(PROJECT_ID))

    act(() => result.current.request())
    act(() => result.current.confirm())

    await waitFor(() => expect(submitProjectMock).toHaveBeenCalledWith(PROJECT_ID))
    await waitFor(() => expect(result.current.confirmIssueCount).toBeNull())
  })

  it('eksik evrak yanıtını satır satır taşır', async () => {
    submitProjectMock.mockResolvedValue({ ok: false, missingDocuments: ['Ruhsat', 'Tapu'] })
    const { result } = renderHook(() => useEditorSubmit(PROJECT_ID))

    act(() => result.current.request())

    await waitFor(() => expect(result.current.notice?.tone).toBe('error'))
    expect(result.current.notice?.details).toEqual(['Ruhsat', 'Tapu'])
  })

  it('gaz dağıtım kullanıcısı onay ucuna gider ve onay kodunu yazar', async () => {
    signIn(ROLE_CODES.gasDistributionUser)
    submitDecisionMock.mockResolvedValue({ status: 'onaylanan', approvalCode: 'AB-12' })
    const { result } = renderHook(() => useEditorSubmit(PROJECT_ID))

    act(() => result.current.request())

    await waitFor(() =>
      expect(result.current.notice?.message).toBe('Proje onaylandı. Onay kodu: AB-12.'),
    )
    // Gerekçe YOK: ret editörde teklif edilmiyor.
    expect(submitDecisionMock).toHaveBeenCalledWith(PROJECT_ID, 'approve', null)
    expect(submitProjectMock).not.toHaveBeenCalled()
  })

  it('istek düşerse hata şeridi yazar', async () => {
    submitProjectMock.mockRejectedValue(new Error('ağ'))
    const { result } = renderHook(() => useEditorSubmit(PROJECT_ID))

    act(() => result.current.request())

    await waitFor(() =>
      expect(result.current.notice).toEqual({
        tone: 'error',
        message: 'Proje gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.',
      }),
    )
  })
})
