import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Mock } from 'vitest'

import { ListProbe } from './ListProbe'
import { GasDistributionFirmFormPage } from '../GasDistributionFirmFormPage'

/**
 * Ortak kurulum. Mock'ların KENDİSİ burada değil çağıran test dosyasında
 * tanımlanır: `vi.hoisted` ile üretilen değişkenler dışa aktarılamıyor
 * (vitest, `vi.mock` fabrikalarını import'ların üstüne kaldırıyor).
 */
export interface FirmFormMocks {
  getNextDfirmNo: Mock
  getGasDistributionFirm: Mock
  createGasDistributionFirm: Mock
  updateGasDistributionFirm: Mock
}

export interface FirmListMocks {
  getFirmGroups: Mock
  getGasDistributionFirms: Mock
}

export const NEXT_DFIRM_NO = 1315

export const EXISTING_FIRM = {
  id: 42,
  dfirmNo: 1204,
  groupName: 'Aksa Enerji Grubu',
  name: 'ADANA DOĞALGAZ',
  region: 'Akdeniz',
  description: 'Akdeniz bölgesi.',
  contactPerson: 'Ahmet Yılmaz',
  address: 'Adana OSB No: 1',
  phone: '05321000000',
}

export const FIRM_GROUPS = ['Çalık Enerji Grubu', 'Aksa Enerji Grubu']

export const EMPTY_FIRM_PAGE = { items: [], totalCount: 0, page: 1, pageSize: 30 }

export const CREATE_ROUTE = '/admin/gas-distribution-firms/new'
export const UPDATE_ROUTE = `/admin/gas-distribution-firms/${EXISTING_FIRM.id}`
export const LIST_ROUTE = '/admin/gas-distribution-firms'

export function renderFirmFormPage(
  mocks: { form: FirmFormMocks; list: FirmListMocks },
  route: string = CREATE_ROUTE,
  /** Grup listesi mount'ta çekildiği için render SONRASINDA değiştirilemez. */
  groups: string[] = FIRM_GROUPS,
) {
  mocks.form.getNextDfirmNo.mockResolvedValue(NEXT_DFIRM_NO)
  mocks.form.getGasDistributionFirm.mockResolvedValue(EXISTING_FIRM)
  mocks.list.getFirmGroups.mockResolvedValue(groups)
  // Benzer isim sorgusu: varsayılan olarak eşleşme yok.
  mocks.list.getGasDistributionFirms.mockResolvedValue(EMPTY_FIRM_PAGE)

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={CREATE_ROUTE} element={<GasDistributionFirmFormPage />} />
          <Route
            path="/admin/gas-distribution-firms/:firmId"
            element={<GasDistributionFirmFormPage />}
          />
          <Route path={LIST_ROUTE} element={<ListProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
