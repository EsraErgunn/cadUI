import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setAuthSession, type AuthSession } from '../../../../api/authToken'
import type { ProjectPolicyRow } from '../../../../api/projectDetail'
import { ROLE_CODES } from '../../../../api/roles'
import { ProjectPolicyTab } from '../ProjectPolicyTab'

const PROJECT_ID = 4

const ADMIN_SESSION: AuthSession = {
  token: 'jwt-token',
  expiresAt: '2099-01-01T00:00:00.000Z',
  fullName: 'Yönetici',
  roleCode: ROLE_CODES.admin,
}

const updatePolicy = vi.hoisted(() => vi.fn())

vi.mock('../../../../api/policies', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../api/policies')>()),
  updatePolicy,
}))

function buildPolicy(overrides: Partial<ProjectPolicyRow> = {}): ProjectPolicyRow {
  return {
    id: 7,
    policyNumber: 'ORNEK-POL-0001',
    insuranceCompanyId: 1,
    insuranceCompanyName: 'Anadolu Sigorta',
    projectUnitId: 20,
    unitNumber: 'D20',
    isUnitDeleted: false,
    amount: 480000,
    startDate: '2026-05-10',
    endDate: '2027-05-10',
    ...overrides,
  }
}

function renderTab(roleCode: string = ROLE_CODES.admin, policies = [buildPolicy()]) {
  setAuthSession({ ...ADMIN_SESSION, roleCode })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProjectPolicyTab projectId={PROJECT_ID} policies={policies} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  updatePolicy.mockReset()
  updatePolicy.mockResolvedValue(undefined)
})

/**
 * Sekme, poliçe listesinin diyaloğunu ve hook'unu OLDUĞU GİBİ kullanıyor;
 * testler o paylaşımın gerçekten kurulduğunu (aynı alanlar, aynı gövde, aynı
 * yetki kapısı) doğruluyor.
 */
describe('proje detayı poliçe sekmesi — güncelleme', () => {
  it('düzenleme diyaloğunda birim salt okunur, tutar ve tarih düzenlenebilir', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: 'Düzenle' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('D20')
    // Birim için bir girdi YOK; yalnız okunuyor.
    expect(within(dialog).queryByLabelText('Birim')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Teminat Tutarı/)).toBeEnabled()
    expect(within(dialog).getByLabelText(/Başlangıç Tarihi/)).toBeEnabled()
    expect(within(dialog).getByLabelText(/Bitiş Tarihi/)).toBeEnabled()
  })

  it('kaydederken değişmeyen alanları da geri gönderir', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: 'Düzenle' }))
    const dialog = await screen.findByRole('dialog')

    const amount = within(dialog).getByLabelText(/Teminat Tutarı/)
    await user.clear(amount)
    await user.type(amount, '500000')
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }))

    await waitFor(() => expect(updatePolicy).toHaveBeenCalled())
    const [policyId, payload] = updatePolicy.mock.calls[0]

    expect(policyId).toBe(7)
    expect(payload.amount).toBe(500000)
    // Değişmeyen ikisi gövdede: gönderilmeseler sunucuda null'a düşerlerdi (K159).
    expect(payload.policyNumber).toBe('ORNEK-POL-0001')
    expect(payload.insuranceCompanyId).toBe(1)

    expect(await screen.findByText('Poliçe güncellendi.')).toBeInTheDocument()
  })

  it('gaz dağıtım kullanıcısına düzenleme sunulmaz', async () => {
    renderTab(ROLE_CODES.gasDistributionUser)

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Düzenle' })).not.toBeInTheDocument()
    expect(screen.queryByText('Aksiyonlar')).not.toBeInTheDocument()
  })
})
