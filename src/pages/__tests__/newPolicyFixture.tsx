import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

import { POLICY_CREATE_ROUTE, policyCreatePath } from '../../ui/admin/adminNavItems'
import { NewPolicyPage } from '../NewPolicyPage'
import { ProjectDetailPage } from '../ProjectDetailPage'

type User = ReturnType<typeof userEvent.setup>

export const PROJECT_ID = 7
export const PROJECT_NAME = 'Demo Doğalgaz Projesi'

export const COMPANY_NAME = 'Anadolu Sigorta'

export const POLICY_NUMBER = 'POL-2026-0001'
/** Ham giriş; ayraç odaktan çıkınca uygulanıyor, beklenen çıktı 1.500.000,00. */
export const AMOUNT_INPUT = '1500000'
export const AMOUNT_FORMATTED = '1.500.000,00'
export const END_DATE = '2027-01-01'

/**
 * Proje künyesi GERÇEK uçtan geliyor (K63), o yüzden ekran `fetch` olmadan
 * çizilmiyor. Yanıt HER çağrıda yeniden kuruluyor: tek bir `Response` nesnesi
 * paylaşılsaydı gövdesi ilk okumada tükenir, yönlendirme sonrası açılan proje
 * detayı boş yanıt görürdü.
 */
/**
 * `GET /api/projects/{id}/units` yanıtı; "Birim" kutusunun kaynağı.
 *
 * Kimlikler `PROJECT_ID` ile BİLEREK çakışmıyor: ikisi de 7 olsaydı "birim
 * kimliği projeden türetilmiyor" iddiası hiçbir şey kanıtlamazdı.
 */
export const PROJECT_UNITS = [
  { id: 71, unitNumber: 'D20', subscriberName: 'FATMA ÇELİK', devices: [] },
  { id: 72, unitNumber: 'D21', subscriberName: 'HASAN DEMİR', devices: [] },
]

/** Mevcut poliçe İLK birime bağlı (aşağıdaki liste yanıtı); yeni poliçe ancak
    İKİNCİ birime açılabilir. Sunucu bir birimde tek aktif poliçeye izin veriyor. */
export const UNIT_WITH_POLICY = PROJECT_UNITS[0]
export const FREE_UNIT = PROJECT_UNITS[1]

/** `GET /api/insurance-companies` yanıtı; sihirbazın şirket kutusu buradan doluyor. */
export const INSURANCE_COMPANIES = [
  { id: 1, title: 'Anadolu Sigorta' },
  { id: 2, title: 'Aksigorta' },
  { id: 3, title: 'Allianz' },
  { id: 4, title: 'Mapfre' },
]

/** `POST /api/policies` çağrılarını yakalar; testler gövdeyi buradan okur. */
export const policyPostCalls: { body: unknown }[] = []

/** Sunucunun bir sonraki POST yanıtı; `null` ise 200 + oluşturulan kayıt döner. */
export let policyPostFailure: { status: number; body: unknown } | null = null

export function setPolicyPostFailure(failure: { status: number; body: unknown } | null): void {
  policyPostFailure = failure
}

export function resetPolicyPostStub(): void {
  policyPostCalls.length = 0
  policyPostFailure = null
}

/** `POST /api/policies` başarı gövdesi: uç `201` değil `200` ve oluşturulan
    `PolicyDto`'yu SARMALAMADAN döndürüyor (`FromResult` → `Ok(result.Data)`). */
const CREATED_POLICY = {
  id: 901,
  projectId: PROJECT_ID,
  projectName: PROJECT_NAME,
  projectUnitId: 72,
  unitNumber: 'D21',
  insuranceCompanyId: 1,
  insuranceCompanyTitle: COMPANY_NAME,
  policyNumber: POLICY_NUMBER,
  amount: 1500000,
  startDate: '2026-01-01',
  endDate: END_DATE,
  isActive: true,
  isUnitDeleted: false,
}

export function stubProjectFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (init?.method === 'POST' && url.includes('/api/policies')) {
        policyPostCalls.push({
          body: JSON.parse(String(init.body ?? '{}')) as unknown,
        })

        if (policyPostFailure !== null) {
          return Promise.resolve(
            new Response(JSON.stringify(policyPostFailure.body), {
              status: policyPostFailure.status,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        }

        return Promise.resolve(
          new Response(JSON.stringify(CREATED_POLICY), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }

      const body = url.includes('/api/insurance-companies')
        ? INSURANCE_COMPANIES
        : url.includes('/api/policies')
          ? {
              items: [
                {
                  id: 900,
                  projectId: PROJECT_ID,
                  projectUnitId: PROJECT_UNITS[0].id,
                  unitNumber: PROJECT_UNITS[0].unitNumber,
                  insuranceCompanyId: 1,
                  insuranceCompanyTitle: COMPANY_NAME,
                  policyNumber: POLICY_NUMBER,
                  amount: 1500000,
                  startDate: '2026-01-01',
                  endDate: END_DATE,
                  isActive: true,
                  isUnitDeleted: false,
                },
              ],
              totalCount: 1,
              page: 1,
              pageSize: 100,
            }
          : url.includes('/units')
            ? PROJECT_UNITS
            : {
            id: PROJECT_ID,
            name: PROJECT_NAME,
            code: '30006185',
            createdAt: '2026-07-01T09:00:00.000Z',
            updatedAt: '2026-07-01T09:00:00.000Z',
          }

      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }),
  )
}

/**
 * Sihirbazı GERÇEK rotasıyla kurar. Proje detayı da bağlı: kaydın "Poliçe
 * Bilgileri" sekmesine düştüğü (KK-21) ve "Vazgeç"in oraya döndürdüğü (KK-22)
 * ancak yönlendirme gerçekten çalışırsa doğrulanabilir.
 */
/**
 * Sorgu istemcisi DIŞARI veriliyor: kayıttan sonra hangi anahtarların
 * geçersizleştiğini doğrulayan test ona ihtiyaç duyuyor.
 */
export function renderPolicyPage(
  route = policyCreatePath(PROJECT_ID),
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={POLICY_CREATE_ROUTE} element={<NewPolicyPage />} />
          <Route path="/projects" element={<h1>Projeler</h1>} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

export function nextButton(): HTMLElement {
  return screen.getByRole('button', { name: 'İleri' })
}

/** Adım 1 → 2. Yöntem seçili geldiği için tek iş "İleri"; künye isteği dönmeden
    düğme çizilmiyor, o yüzden `findBy…`. */
export async function goToFirmStep(user: User): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'İleri' }))
}

/** Adım 2. TEK seçim: sunucuda acente kavramı yok, alan `insuranceCompanyId`.
    Seçenek listesi ayrı bir istekten geliyor, `option` beklenmezse kutu henüz
    "Seçiniz"den ibaret olur. */
export async function fillFirmStep(user: User): Promise<void> {
  await user.selectOptions(
    await screen.findByLabelText('Sigorta Şirketi / Poliçe Firması'),
    await screen.findByRole('option', { name: COMPANY_NAME }),
  )
}

/** Adım 3. Tarih girdisine `fireEvent.change`: native `input[type=date]` tuş
    vuruşuyla doldurulamıyor (yeni proje formu testindeki desen). */
export async function fillInfoStep(user: User, policyNumber = POLICY_NUMBER): Promise<void> {
  // Birim ZORUNLU: poliçe sunucuda projeye değil birime bağlanıyor. İLK birimin
  // zaten poliçesi var ve seçilemez — boş olan ikinci birim seçiliyor.
  await user.selectOptions(await screen.findByLabelText('Birim'), String(FREE_UNIT.id))
  await user.type(await screen.findByLabelText('Poliçe No'), policyNumber)
  await user.type(screen.getByLabelText('Teminat Tutarı'), AMOUNT_INPUT)
  fireEvent.change(screen.getByLabelText('Bitiş Tarihi'), { target: { value: END_DATE } })
}

/** Adım 1'den özet adımına kadar tüm zorunlu alanları doldurur. */
export async function fillUntilSummary(user: User, policyNumber = POLICY_NUMBER): Promise<void> {
  await goToFirmStep(user)
  await fillFirmStep(user)
  await user.click(nextButton())
  await fillInfoStep(user, policyNumber)
  await user.click(nextButton())
}
