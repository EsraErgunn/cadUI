import { QueryClient } from '@tanstack/react-query'
import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AMOUNT_FORMATTED,
  AMOUNT_INPUT,
  COMPANY_NAME,
  END_DATE,
  POLICY_NUMBER,
  FREE_UNIT,
  PROJECT_ID,
  UNIT_WITH_POLICY,
  EXISTING_POLICY_ID,
  policyDeleteCalls,
  policyPostCalls,
  resetPolicyPostStub,
  setPolicyPostFailure,
  fillFirmStep,
  fillInfoStep,
  fillUntilSummary,
  goToFirmStep,
  nextButton,
  renderPolicyPage,
  stubProjectFetch,
} from './newPolicyFixture'
import { toIsoDate } from '../../ui/admin/adminDateRange'
import { policyCreatePath } from '../../ui/admin/adminNavItems'

const TODAY = toIsoDate(new Date())

/** Adım 1 → 3: firma adımı doldurulup geçilir. */
async function goToInfoStep(user: ReturnType<typeof userEvent.setup>) {
  await goToFirmStep(user)
  await fillFirmStep(user)
  await user.click(nextButton())
}

beforeEach(() => {
  resetPolicyPostStub()
  stubProjectFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Poliçe firması adımı', () => {
  /**
   * Adımda TEK kutu var. Bir süre iki kutu vardı ("Sigorta Şirketi" + ona bağlı
   * "Acente / Poliçe Firması") ama sunucuda acente kavramı YOK: `Policy`'nin tek
   * firma alanı `InsuranceCompanyId`. İkinci kutunun seçimi hiçbir yere
   * yazılmadığı için alan tek kutuya indirildi.
   */
  it('tek firma kutusu "Seçiniz" ile açılır ve şirketleri listeler', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToFirmStep(user)

    const company = await screen.findByLabelText('Sigorta Şirketi / Poliçe Firması')
    expect(company).toHaveValue('')

    expect(within(company).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Seçiniz',
      COMPANY_NAME,
      'Aksigorta',
      'Allianz',
      'Mapfre',
    ])
  })

  it('ayrı bir acente kutusu ÇİZİLMEZ', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToFirmStep(user)

    await screen.findByLabelText('Sigorta Şirketi / Poliçe Firması')
    expect(screen.queryByLabelText('Acente / Poliçe Firması')).not.toBeInTheDocument()
  })

  it('seçim korunur ve sonraki adıma geçilir', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToFirmStep(user)
    await fillFirmStep(user)

    expect(screen.getByLabelText('Sigorta Şirketi / Poliçe Firması')).not.toHaveValue('')
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

  /**
   * Sunucu bir birimde tek aktif poliçeye izin veriyor ve ihlali ancak `POST`
   * sırasında 400 ile söylüyor. Dolu birim seçilebilir kalsaydı kullanıcı formu
   * baştan sona doldurup hatayı EN SON adımda görürdü.
   */
  /**
   * Dolu birim SEÇİLEBİLİR: sunucu ikinci aktif poliçeyi reddediyor ama
   * yenileme destekleniyor (önce iptal, sonra oluştur). Bir tur seçenek
   * kilitliydi ve o hâlde yenileme arayüzden hiç yapılamıyordu.
   */
  it('poliçesi olan birim seçilebilir ve sonucu etiketinde yazar', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToInfoStep(user)

    const unitSelect = await screen.findByLabelText('Birim')
    const taken = within(unitSelect).getByRole('option', { name: /poliçesi var \(yenilenir\)/ })

    expect(taken).not.toBeDisabled()
    expect(taken).toHaveValue(String(UNIT_WITH_POLICY.id))
  })

  it('yenilemenin ne yapacağı kutunun altında yazar', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToInfoStep(user)

    await screen.findByLabelText('Birim')
    expect(screen.getByText(/mevcut poliçe İPTAL EDİLİP/)).toBeInTheDocument()
  })

  /** Benzersizlik kuralı SUNUCUDA YOK; aynı numara adımda engellenmemeli. */
  it('aynı poliçe numarası adımda engellenmez', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await goToInfoStep(user)
    await fillInfoStep(user)
    await user.click(nextButton())

    expect(await screen.findByRole('button', { name: 'Bitir' })).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: 'Proje Detayına Dön' }))

    expect(await screen.findByText(/numaralı poliçe oluşturuldu/)).toBeInTheDocument()
    // "sunucuya yazılmadı" uyarısı KALKTI: kayıt artık gerçekten kalıcı.
    expect(screen.queryByText(/sunucuya yazılmadı/)).not.toBeInTheDocument()
  })

  /**
   * Gövde `PolicyAddDto` ile BİREBİR olmalı. Sunucuda karşılığı olmayan bir alan
   * göndermek sessizce yok sayılır ve sözleşmenin kaydığını kimse fark etmez.
   */
  it('POST gövdesi yalnız PolicyAddDto alanlarını taşır', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user)

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))
    await screen.findByText(/Poliçe kaydedildi/)

    expect(policyPostCalls).toHaveLength(1)
    const body = policyPostCalls[0].body as Record<string, unknown>

    expect(body).toEqual({
      projectUnitId: FREE_UNIT.id,
      insuranceCompanyId: 1,
      policyNumber: POLICY_NUMBER,
      amount: 1500000,
      startDate: TODAY,
      endDate: END_DATE,
    })
  })

  it('birim kimliği seçilen birimden gelir, projeden TÜRETİLMEZ', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user)

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))
    await screen.findByText(/Poliçe kaydedildi/)

    const body = policyPostCalls[0].body as Record<string, unknown>
    expect(body.projectUnitId).toBe(FREE_UNIT.id)
    expect(body.projectUnitId).not.toBe(PROJECT_ID)
  })

  it('sigorta şirketi kimliği gövdeye girer', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user)

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))
    await screen.findByText(/Poliçe kaydedildi/)

    expect((policyPostCalls[0].body as Record<string, unknown>).insuranceCompanyId).toBe(1)
  })

  it('sunucuda karşılığı olmayan alanlar gönderilmez', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user)

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))
    await screen.findByText(/Poliçe kaydedildi/)

    const body = policyPostCalls[0].body as Record<string, unknown>
    expect(body).not.toHaveProperty('projectId')
    expect(body).not.toHaveProperty('agencyId')
    expect(body).not.toHaveProperty('method')
  })

  /**
   * Birimde zaten aktif poliçe varsa sunucu `400` + `{ message }` döndürüyor
   * (`409` DEĞİL) ve eski poliçeyi otomatik KAPATMIYOR. Mesajı sunucu yazıyor;
   * istemci onu olduğu gibi gösteriyor.
   */
  it('400 { message } hatasını sunucunun kendi metniyle gösterir', async () => {
    const serverMessage =
      'Bu bağımsız bölümde zaten aktif bir poliçe var. Yeni poliçe eklemeden önce mevcut poliçeyi iptal edin.'
    setPolicyPostFailure({ status: 400, body: { message: serverMessage } })

    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user)

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))

    expect(await screen.findByText(serverMessage)).toBeInTheDocument()
    // Kayıt olmadı: sonuç adımına GEÇİLMEZ, kullanıcı özet adımında kalır.
    expect(screen.queryByText(/Poliçe kaydedildi/)).not.toBeInTheDocument()
  })

  /**
   * Kayıttan sonra poliçeyi listeleyen İKİ yüzey de tazelenmeli: bütün
   * projelerin listesi (`policies`) ve proje detayının sekmesi
   * (`projectPolicies`). Biri atlanırsa kullanıcı kendi kaydını bayat bir
   * listede göremez.
   */
  it('başarılı kayıttan sonra poliçe sorgularını geçersizleştirir', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const user = userEvent.setup()
    renderPolicyPage(policyCreatePath(PROJECT_ID), client)
    await fillUntilSummary(user)

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))
    await screen.findByText(/Poliçe kaydedildi/)

    const keys = invalidate.mock.calls.map(([options]) => options?.queryKey)
    expect(keys).toContainEqual(['policies'])
    expect(keys).toContainEqual(['projectPolicies'])
  })

  it('kayıt başarısızsa sorgular geçersizleştirilmez', async () => {
    setPolicyPostFailure({ status: 400, body: { message: 'Kayıt reddedildi.' } })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const user = userEvent.setup()
    renderPolicyPage(policyCreatePath(PROJECT_ID), client)
    await fillUntilSummary(user)

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))
    await screen.findByText('Kayıt reddedildi.')

    const keys = invalidate.mock.calls.map(([options]) => options?.queryKey)
    expect(keys).not.toContainEqual(['policies'])
  })

  /**
   * YENİLEME: sunucuda atomik bir "yenile" ucu yok ve ikinci aktif poliçe 400
   * ile reddediliyor, o yüzden akış iki adımlı. İptal geri alınamadığı için
   * onay isteniyor ve metin sonucu açıkça söylüyor.
   */
  it('poliçesi olan birimde kayıt önce onay ister, sonra iptal edip oluşturur', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user, { unitId: UNIT_WITH_POLICY.id })

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))

    // Onay gelmeden HİÇBİR istek atılmaz.
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(/İPTAL EDİLECEK/)
    expect(dialog).toHaveTextContent(/İptal geri alınamaz/)
    expect(policyPostCalls).toHaveLength(0)
    expect(policyDeleteCalls).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: /İptal et ve yenisini oluştur/ }))
    await screen.findByText(/Poliçe kaydedildi/)

    // Sıra ZORUNLU: önce iptal, sonra oluşturma.
    expect(policyDeleteCalls).toEqual([EXISTING_POLICY_ID])
    expect(policyPostCalls).toHaveLength(1)
  })

  it('yenileme onayından vazgeçilince hiçbir istek atılmaz', async () => {
    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user, { unitId: UNIT_WITH_POLICY.id })

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Vazgeç' }))

    expect(policyDeleteCalls).toHaveLength(0)
    expect(policyPostCalls).toHaveLength(0)
  })

  /**
   * İptal geçip oluşturma düşerse birim POLİÇESİZ kalıyor ve geri alacak bir uç
   * yok. Kullanıcıya bu SÖYLENMEK zorunda; genel bir hata, silinmiş poliçeyi
   * fark edilmeden bırakırdı.
   */
  it('iptal geçip oluşturma düşerse birimin poliçesiz kaldığını söyler', async () => {
    setPolicyPostFailure({ status: 400, body: { message: 'Kayıt reddedildi.' } })

    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user, { unitId: UNIT_WITH_POLICY.id })

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /İptal et ve yenisini oluştur/ }))

    expect(await screen.findByText(/POLİÇESİZ/)).toBeInTheDocument()
    expect(policyDeleteCalls).toEqual([EXISTING_POLICY_ID])
  })

  /** FluentValidation hatası alan bazlı sözlük döndürüyor (`{ errors }`);
      `http.ts` ilk mesajı çıkarıyor. */
  it('alan bazlı doğrulama hatasında ilk mesajı gösterir', async () => {
    setPolicyPostFailure({
      status: 400,
      body: { errors: { PolicyNumber: ['Poliçe numarası en fazla 50 karakter olabilir.'] } },
    })

    const user = userEvent.setup()
    renderPolicyPage()
    await fillUntilSummary(user)

    await user.click(await screen.findByRole('button', { name: 'Bitir' }))

    expect(
      await screen.findByText('Poliçe numarası en fazla 50 karakter olabilir.'),
    ).toBeInTheDocument()
  })
})
