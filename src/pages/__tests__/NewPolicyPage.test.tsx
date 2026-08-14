import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PROJECT_ID,
  PROJECT_NAME,
  fillFirmStep,
  fillUntilSummary,
  goToFirmStep,
  nextButton,
  renderPolicyPage,
  stubProjectFetch,
} from './newPolicyFixture'
import { resetMockPolicies } from '../../api/policiesMock'

const STEP_LABELS = [
  'Poliçe Yöntemi',
  'Poliçe Firması',
  'Poliçe Bilgileri',
  'Poliçe Özeti',
  'Poliçe Tamamlandı',
]

function stepItems(): HTMLElement[] {
  return within(screen.getByRole('navigation', { name: 'Poliçe oluşturma adımları' })).getAllByRole(
    'listitem',
  )
}

/** İşaret dairenin üstünde; ekran okuyucu metni yalnız onun içindeki span. */
function stepCircle(item: HTMLElement): HTMLElement | null {
  return within(item).getByText(/adım/).parentElement
}

beforeEach(() => {
  resetMockPolicies()
  stubProjectFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('NewPolicyPage — erişim ve adım göstergesi', () => {
  it('proje kimliği geçersizse ekran boş kalmaz, projelere dönüş sunar', () => {
    // Kimlik YOLDA (K68); bozuk değer rotayla eşleşiyor ama projeye çözülmüyor.
    renderPolicyPage('/projects/abc/policies/new')

    expect(screen.getByRole('alert')).toHaveTextContent(/geçerli bir proje yok/)
    expect(screen.getByRole('link', { name: 'Projelere dön' })).toHaveAttribute('href', '/projects')
  })

  it('kırılım, açıklama ve ilişkilendirilecek proje görünür (KK-15)', async () => {
    renderPolicyPage()

    expect(await screen.findByRole('heading', { name: 'Poliçe Oluşturma' })).toBeInTheDocument()
    expect(
      screen.getByText('Manuel poliçe akışı — adımları takip ederek tamamlayın'),
    ).toBeInTheDocument()

    const trail = screen.getByRole('navigation', { name: 'Konum' })
    expect(within(trail).getByRole('link', { name: 'Anasayfa' })).toBeInTheDocument()
    // Kırılım "Poliçeler" bölümünden GEÇMEZ (K68): ekran projenin altında.
    expect(within(trail).queryByRole('link', { name: 'Poliçeler' })).not.toBeInTheDocument()
    expect(within(trail).getByRole('link', { name: 'Projeler' })).toHaveAttribute(
      'href',
      '/projects',
    )
    expect(within(trail).getByRole('link', { name: PROJECT_NAME })).toHaveAttribute(
      'href',
      `/projects/${PROJECT_ID}`,
    )
    expect(within(trail).getByText('Poliçe Oluşturma')).toHaveAttribute('aria-current', 'page')

    // Poliçe GELİNEN projeyle ilişkilendiriliyor; ekran hangi proje olduğunu
    // yazar (kırılımda da geçtiği için tek eşleşme beklenmiyor).
    expect(screen.getAllByText(PROJECT_NAME).length).toBeGreaterThan(0)
  })

  it('beş adım sırayla görünür, bulunulan adım işaretlidir (KK-16)', async () => {
    renderPolicyPage()
    await screen.findByRole('heading', { name: 'Poliçe Oluşturma' })

    const items = stepItems()
    expect(items).toHaveLength(STEP_LABELS.length)
    STEP_LABELS.forEach((label, index) => {
      expect(within(items[index]).getByText(label)).toBeInTheDocument()
    })

    expect(stepCircle(items[0])).toHaveAttribute('aria-current', 'step')
    expect(stepCircle(items[1])).not.toHaveAttribute('aria-current')
  })

  it('tamamlanan adımda numara yerine onay işareti görünür (KK-16)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToFirmStep(user)

    const items = stepItems()
    // Numara artık yalnız ekran okuyucu metninde; görünen yerde onay işareti var.
    expect(within(items[0]).getByText('1. adım (tamamlandı)')).toBeInTheDocument()
    expect(stepCircle(items[0])).not.toHaveAttribute('aria-current')
    expect(stepCircle(items[1])).toHaveAttribute('aria-current', 'step')
  })
})

describe('NewPolicyPage — yöntem adımı ve gezinme', () => {
  it('"Manuel Poliçe" kart biçiminde ve seçili gelir (KK-17)', async () => {
    renderPolicyPage()

    const method = await screen.findByRole('radio', { name: /Manuel Poliçe/ })
    expect(method).toBeChecked()
    expect(screen.getByText('Poliçe bilgilerini elle girerek oluşturun')).toBeInTheDocument()
    // İkinci seçenek EKLENMEDİ: otomatik poliçe yöntemi henüz yok.
    expect(screen.getAllByRole('radio')).toHaveLength(1)
  })

  it('ilk adımda "Geri" pasif, altta "Vazgeç" ve "İleri" var (KK-22)', async () => {
    renderPolicyPage()

    expect(await screen.findByRole('button', { name: 'Geri' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Vazgeç' })).toBeEnabled()
    expect(nextButton()).toBeEnabled()
  })

  it('eksik alanlı adımda "İleri" geçiş yaptırmaz, eksikler işaretlenir (KK-22)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToFirmStep(user)

    await user.click(nextButton())

    expect(await screen.findByText('Sigorta şirketi seçiniz.')).toBeInTheDocument()
    expect(screen.getByText('Acente / poliçe firması seçiniz.')).toBeInTheDocument()
    // Adım değişmedi: alanlar hâlâ ekranda.
    expect(screen.getByLabelText('Sigorta Şirketi')).toBeInTheDocument()
    expect(stepCircle(stepItems()[1])).toHaveAttribute('aria-current', 'step')
  })

  it('son veri adımında "İleri" yerine "Bitir" görünür (KK-22)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user)

    expect(await screen.findByRole('button', { name: 'Bitir' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'İleri' })).not.toBeInTheDocument()
  })

  it('veri girilmemişken "Vazgeç" doğrudan proje detayına döner (KK-22)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()

    await user.click(await screen.findByRole('button', { name: 'Vazgeç' }))

    expect(await screen.findByRole('tab', { name: 'Poliçe Bilgileri' })).toBeInTheDocument()
  })

  it('veri girilmişse "Vazgeç" önce onay sorar, sonra kaydetmeden döner (KK-22)', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToFirmStep(user)
    await fillFirmStep(user)

    await user.click(screen.getByRole('button', { name: 'Vazgeç' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Devam et' }))
    expect(screen.getByLabelText('Sigorta Şirketi')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Vazgeç' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Vazgeç' }))

    expect(await screen.findByRole('tab', { name: 'Poliçe Bilgileri' })).toBeInTheDocument()
    // Kayıt yok: dönüşte başarı bildirimi çıkmamalı.
    expect(screen.queryByText(/numaralı poliçe oluşturuldu/)).not.toBeInTheDocument()
  })
})
