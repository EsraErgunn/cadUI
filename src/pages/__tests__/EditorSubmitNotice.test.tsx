import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setAuthSession } from '../../api/authToken'
import { ApiError } from '../../api/http'
import { submitProject } from '../../api/projects'
import { ROLE_CODES } from '../../api/roles'
import { EditorNoticeBar } from '../../ui/EditorNoticeBar'
import { runProjectValidation } from '../../ui/validation/useProjectValidation'
import { useEditorSubmit } from '../useEditorSubmit'

/**
 * KISMİ mock: `api/projectDetail` → `projectDetailTypes` zinciri
 * `PROJECT_STATUSES` sabitini `api/projects`ten okuyor; tam mock o sabiti
 * kaybettirip modülü import edilemez hâle getiriyor.
 */
vi.mock('../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projects')>()),
  submitProject: vi.fn(),
}))

vi.mock('../../ui/validation/useProjectValidation', () => ({
  runProjectValidation: vi.fn(() => []),
}))

const submitProjectMock = vi.mocked(submitProject)
const PROJECT_ID = 7

/** Editörün gönderim yolunun EKRANA bakan ucu: düğme + sonuç şeridi. */
function SubmitProbe() {
  const submit = useEditorSubmit(PROJECT_ID)

  return (
    <>
      <button type="button" onClick={submit.request}>
        Gönder
      </button>
      {submit.notice !== null && (
        <EditorNoticeBar notice={submit.notice} onDismiss={submit.dismissNotice} />
      )}
    </>
  )
}

beforeEach(() => {
  vi.mocked(runProjectValidation).mockReturnValue([])
  setAuthSession({
    token: 'jwt-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    fullName: 'Firma Kullanıcısı',
    roleCode: ROLE_CODES.projectFirmUser,
  })
})

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
  vi.clearAllMocks()
})

/**
 * `POST /api/projects/{id}/submit` durum geçişinden ÖNCE iş kurallarını
 * denetliyor (`ProjectApprovalManager.ValidateSubmissionRequirementsAsync`) ve
 * her kural kendi Türkçe metniyle 400 dönüyor. Bu metin bir süre genel bir
 * "gönderilemedi" cümlesine indirgeniyordu: kullanıcı düğmenin neden işe
 * yaramadığını göremiyordu.
 */
describe('editör gönderim şeridi', () => {
  it('eksik sözleşme gerekçesini EKRANDA olduğu gibi gösterir', async () => {
    const user = userEvent.setup()
    submitProjectMock.mockRejectedValue(
      new ApiError(
        400,
        '1 birimde müşteri sözleşmesi eksik. Onaya göndermeden önce her birim ' +
          'için müşteri sözleşmesi yüklenmelidir.',
      ),
    )
    render(<SubmitProbe />)

    await user.click(screen.getByRole('button', { name: 'Gönder' }))

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent('1 birimde müşteri sözleşmesi eksik.')
    // Genel metin ARTIK yazılmıyor; sebep onun yerini alıyor.
    expect(notice).not.toHaveTextContent('Bağlantınızı kontrol edip tekrar deneyin')
  })

  it('poliçesiz projede sunucunun kendi cümlesini gösterir', async () => {
    const user = userEvent.setup()
    submitProjectMock.mockRejectedValue(
      new ApiError(400, 'Projenin en az bir biriminde poliçe olmalı.'),
    )
    render(<SubmitProbe />)

    await user.click(screen.getByRole('button', { name: 'Gönder' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Projenin en az bir biriminde poliçe olmalı.',
    )
  })

  /** Ağ hatasının gerekçesi yok; orada genel metin DOĞRU olan. */
  it('ağ hatasında genel metne düşer', async () => {
    const user = userEvent.setup()
    submitProjectMock.mockRejectedValue(new Error('ağ'))
    render(<SubmitProbe />)

    await user.click(screen.getByRole('button', { name: 'Gönder' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Proje gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.',
      ),
    )
  })
})
