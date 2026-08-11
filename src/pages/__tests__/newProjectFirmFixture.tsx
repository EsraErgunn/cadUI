import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Mock } from 'vitest'

import { ProjectFirmListProbe } from './ProjectFirmListProbe'
import type { GasDistributionFirm } from '../../api/adminFirms'
import type { ProjectFirm } from '../../api/projectFirms'
import { NewProjectFirmPage } from '../NewProjectFirmPage'

/**
 * Ortak kurulum. Mock'ların KENDİSİ burada değil çağıran test dosyasında
 * tanımlanır: `vi.hoisted` ile üretilen değişkenler dışa aktarılamıyor
 * (vitest, `vi.mock` fabrikalarını import'ların üstüne kaldırıyor).
 */
export interface ProjectFirmFormMocks {
  createProjectFirm: Mock
  saveProjectFirmAuthorizations: Mock
}

export interface ProjectFirmLookupMocks {
  getFirmGroups: Mock
  getGasDistributionFirmsByGroup: Mock
  getProjectFirmList: Mock
}

export const CREATE_ROUTE = '/admin/project-firms/new'
export const LIST_ROUTE = '/admin/project-firms'

export const NEW_FIRM_ID = 900

export const GROUPS = [
  { id: 1, name: 'AKSA' },
  { id: 2, name: 'ENERYA' },
]

/**
 * Sunucu ünvanı tam yazıyor ("Adana Doğalgaz Dağıtım A.Ş."); kutulardaki
 * "AKSA-ADANA" etiketini arayüz üretiyor (`formatAuthorizationGasFirmName`).
 * Kayıtlar bu yüzden HAM biçimde duruyor — testler etiketi de sınasın.
 */
function buildGasFirm(
  id: number,
  name: string,
  groupId: number,
  groupName: string,
): GasDistributionFirm {
  return { id, dfirmNo: id, groupId, groupName, name }
}

/** Grup değişiminin listeyi yenilediği görülebilsin diye iki grubun kayıtları ayrı. */
export const AKSA_GAS_FIRMS = [
  buildGasFirm(10, 'Adana Doğalgaz Dağıtım A.Ş.', 1, 'AKSA'),
  buildGasFirm(11, 'Gemlik Gaz Dağıtım A.Ş.', 1, 'AKSA'),
  buildGasFirm(12, 'Bolu Şehiriçi Doğalgaz A.Ş.', 1, 'AKSA'),
]

export const ENERYA_GAS_FIRMS = [buildGasFirm(20, 'Konya Doğalgaz A.Ş.', 2, 'ENERYA')]

/** Benzersizlik ön kontrolünün karşılaştırdığı mevcut kayıt. */
export const EXISTING_PROJECT_FIRM: ProjectFirm = {
  id: 1,
  serialNumber: 'SR-KAYITLI',
  qualificationNumber: null,
  name: 'MEVCUT MÜHENDİSLİK LTD. ŞTİ.',
  gasFirm: null,
  authorizedPerson: null,
  email: null,
  phone: null,
  mobilePhone: null,
  taxNumber: '9999999999',
}

export interface RenderOptions {
  existingFirms?: ProjectFirm[]
}

export function renderNewProjectFirmPage(
  mocks: { form: ProjectFirmFormMocks; lookups: ProjectFirmLookupMocks },
  { existingFirms = [EXISTING_PROJECT_FIRM] }: RenderOptions = {},
) {
  mocks.form.createProjectFirm.mockResolvedValue(NEW_FIRM_ID)
  // Varsayılan: mock mod — firma da yetkilendirme de aynı gövdeye yazılıyor.
  mocks.form.saveProjectFirmAuthorizations.mockResolvedValue({ arePersisted: true })
  mocks.lookups.getFirmGroups.mockResolvedValue(GROUPS)
  mocks.lookups.getProjectFirmList.mockResolvedValue(existingFirms)
  mocks.lookups.getGasDistributionFirmsByGroup.mockImplementation((groupId: number) =>
    Promise.resolve(groupId === 1 ? AKSA_GAS_FIRMS : ENERYA_GAS_FIRMS),
  )

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[CREATE_ROUTE]}>
        <Routes>
          <Route path={CREATE_ROUTE} element={<NewProjectFirmPage />} />
          <Route path={LIST_ROUTE} element={<ProjectFirmListProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/**
 * `delay: null`: tuşlar arasında olay döngüsüne dönülmez. Kurulum yardımcıları
 * ~90 karakter yazıyor ve varsayılan gecikmeyle bu, yoğun paralel koşuda 5 sn'lik
 * test sınırını tek başına yiyordu. Yazma DAVRANIŞI (maske, imleç) burada değil,
 * kendi testlerinde sınanıyor.
 */
function setupUser() {
  return userEvent.setup({ delay: null })
}

/**
 * Grup seçip bölgelerin yüklenmesini bekler; testlerin çoğu buradan başlıyor.
 * Etiketle değil rolle sorgulanıyor: "G.D Firması" ile "G.D Firması Bölgeleri"
 * etiketleri birbirinin öneki.
 */
export async function selectGroup(name: string) {
  // Seçenekler sunucudan geliyor; gelmeden seçim yapılamaz.
  await screen.findByRole('option', { name })
  await setupUser().selectOptions(screen.getByRole('combobox'), name)
  await screen.findByRole('checkbox', { name: name === 'AKSA' ? 'AKSA-ADANA' : 'ENERYA-KONYA' })
}

/** Kaydetmeyi engellemeyecek geçerli bir firma bilgisi doldurur. */
export async function fillFirmInfo(overrides: Record<string, string> = {}) {
  const user = setupUser()
  const values: Record<string, string> = {
    Ünvan: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
    'Seri No': 'SR-001',
    'Yetkili Kişi': 'Ahmet Yılmaz',
    'E-mail': 'bilgi@adana.com.tr',
    'Vergi No': '1234567890',
    'Telefon 1': '05321000000',
    ...overrides,
  }

  for (const [label, value] of Object.entries(values)) {
    if (value === '') continue
    await user.type(screen.getByLabelText(new RegExp(`^${label}`)), value)
  }
}

/** Bir yetkilendirme kaydı ekler (Kaydet'in ön koşulu). */
export async function addAuthorization(gasFirmName = 'AKSA-GEMLİK') {
  const user = setupUser()

  await user.click(screen.getByRole('checkbox', { name: gasFirmName }))
  await user.type(screen.getByLabelText(/^Yeterlilik No/), 'YT-100')
  await user.click(screen.getByRole('button', { name: 'Ekle' }))
}
