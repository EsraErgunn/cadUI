import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AGENCY_NAME,
  AMOUNT_FORMATTED,
  AMOUNT_INPUT,
  COMPANY_NAME,
  END_DATE,
  POLICY_NUMBER,
  PROJECT_ID,
  PROJECT_NAME,
  fillFirmStep,
  fillInfoStep,
  fillUntilSummary,
  goToFirmStep,
  nextButton,
  renderPolicyPage,
  stubProjectFetch,
} from './newPolicyFixture'
import { addMockPolicy, getMockPolicies, resetMockPolicies } from '../../api/policiesMock'
import { toIsoDate } from '../../ui/admin/adminDateRange'

const TODAY = toIsoDate(new Date())

/** Adım 1 → 3: firma adımı doldurulup geçilir. */
async function goToInfoStep(user: ReturnType<typeof userEvent.setup>) {
  await goToFirmStep(user)
  await fillFirmStep(user)
  await user.click(nextButton())
}

beforeEach(() => {
  resetMockPolicies()
  stubProjectFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Poliçe firması adımı', () => {
  it('iki kutu "Seçiniz" ile açılır, acente listesi seçilen şirkete bağlıdır (KK-18)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToFirmStep(user)

    const company = await screen.findByLabelText('Sigorta Şirketi')
    const agency = screen.getByLabelText('Acente / Poliçe Firması')
    expect(company).toHaveValue('')
    expect(agency).toHaveValue('')
    // Şirket seçilmeden acente kutusu pasif: boş liste "acente yok" gibi okunurdu.
    expect(agency).toBeDisabled()

    await fillFirmStep(user)

    expect(within(agency).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Seçiniz',
      AGENCY_NAME,
      `${COMPANY_NAME} — Örnek Acente 2`,
    ])
  })

  it('şirket değişince seçili acente düşer (KK-18)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToFirmStep(user)
    await fillFirmStep(user)

    const agency = screen.getByLabelText('Acente / Poliçe Firması')
    expect(agency).not.toHaveValue('')

    await user.selectOptions(
      screen.getByLabelText('Sigorta Şirketi'),
      await screen.findByRole('option', { name: 'Aksigorta' }),
    )

    expect(agency).toHaveValue('')
  })
})

describe('Poliçe bilgileri adımı', () => {
  it('dört alan; poliçe no yer tutuculu, başlangıç bugün dolu (KK-19)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToInfoStep(user)

    expect(await screen.findByLabelText('Poliçe No')).toHaveAttribute(
      'placeholder',
      'POL-2026-....',
    )
    expect(screen.getByLabelText('Başlangıç Tarihi')).toHaveValue(TODAY)
    // Bitiş başlangıçtan önce SEÇİLEMEZ; takvim sınırı da konuyor.
    expect(screen.getByLabelText('Bitiş Tarihi')).toHaveAttribute('min', TODAY)
  })

  it('teminat tutarı odaktan çıkınca binlik ayraç ve "₺" ile görünür (KK-19)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToInfoStep(user)

    const amount = await screen.findByLabelText('Teminat Tutarı')
    await user.type(amount, AMOUNT_INPUT)
    await user.tab()

    expect(amount).toHaveValue(AMOUNT_FORMATTED)
    expect(screen.getByText('₺')).toBeInTheDocument()
  })

  it('bitiş tarihi başlangıçtan önceyse geçiş olmaz (KK-19)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToInfoStep(user)
    await fillInfoStep(user)

    fireEvent.change(screen.getByLabelText('Bitiş Tarihi'), { target: { value: '2020-01-01' } })
    await user.click(nextButton())

    expect(
      await screen.findByText('Bitiş tarihi, başlangıç tarihinden önce olamaz.'),
    ).toBeInTheDocument()
  })

  it('sistemde kayıtlı poliçe numarası kabul edilmez (KK-19)', async () => {
    addMockPolicy({
      projectId: PROJECT_ID,
      method: 'manual',
      insuranceCompanyId: 1,
      agencyId: 1,
      policyNumber: POLICY_NUMBER,
      amount: 1000,
      startDate: TODAY,
      endDate: END_DATE,
    })

    const user = userEvent.setup()
    renderPolicyPage()
    await goToInfoStep(user)
    await fillInfoStep(user)
    await user.click(nextButton())

    expect(await screen.findByText('Bu poliçe numarası sistemde kayıtlı.')).toBeInTheDocument()
  })

  it('boş bırakılan alanlar tek tek işaretlenir (KK-19)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToInfoStep(user)

    await user.click(nextButton())

    expect(await screen.findByText('Poliçe no zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Teminat tutarı zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Bitiş tarihi zorunludur.')).toBeInTheDocument()
  })
})

describe('Poliçe özeti ve tamamlanma', () => {
  it('özet salt okunur; girilen bilgiler beş satırda görünür (KK-20)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user)

    for (const label of ['Yöntem', 'Sigorta Şirketi', 'Poliçe No', 'Teminat', 'Geçerlilik']) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }

    expect(screen.getByText('Manuel Poliçe')).toBeInTheDocument()
    expect(screen.getByText(COMPANY_NAME)).toBeInTheDocument()
    expect(screen.getByText(POLICY_NUMBER)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(AMOUNT_FORMATTED.replaceAll('.', '\\.')))).toBeInTheDocument()
    // Geçerlilik İKİ tarihi birlikte gösterir.
    expect(screen.getByText(/–\s*01\.01\.2027/)).toBeInTheDocument()
    // Salt okunur: özet adımında düzenlenebilir alan yok.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('"Geri" ile dönülen adımda bilgiler durur ve düzeltilebilir (KK-20)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user)

    await user.click(await screen.findByRole('button', { name: 'Geri' }))

    const policyNumber = screen.getByLabelText('Poliçe No')
    expect(policyNumber).toHaveValue(POLICY_NUMBER)

    await user.clear(policyNumber)
    await user.type(policyNumber, 'POL-2026-0009')
    await user.click(nextButton())

    expect(await screen.findByText('POL-2026-0009')).toBeInTheDocument()
  })

  it('"Bitir" kaydeder, sonuç adımını gösterir ve proje detayına döndürür (KK-21)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user)

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))

    expect(
      await screen.findByText(/Poliçe kaydedildi ve projeyle ilişkilendirildi/),
    ).toBeInTheDocument()

    // Depo tohumlu (K69); yeni kayıt EN ÜSTTE duruyor.
    const saved = getMockPolicies()[0]
    expect(saved.projectId).toBe(PROJECT_ID)
    expect(saved.policyNumber).toBe(POLICY_NUMBER)
    expect(saved.amount).toBe(1500000)
    // Künye gerçek uçtan geldi: liste ekranı projeyi adıyla gösterebilir.
    expect(saved.projectName).toBe(PROJECT_NAME)

    await user.click(screen.getByRole('button', { name: 'Proje Detayına Dön' }))

    expect(await screen.findByText(/numaralı poliçe oluşturuldu/)).toBeInTheDocument()
    // Kalıcı olmadığı SÖYLENMELİ: kayıt sunucuya gitmiyor.
    expect(screen.getByText(/sunucuya yazılmadı/)).toBeInTheDocument()

    const table = await screen.findByRole('table', { name: /Projeye bağlı poliçeler/ })
    expect(within(table).getByText(POLICY_NUMBER)).toBeInTheDocument()
    expect(within(table).getByText(COMPANY_NAME)).toBeInTheDocument()
  })
})
