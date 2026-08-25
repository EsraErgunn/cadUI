import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { ProjectFirmUserListProbe } from './ProjectFirmUserListProbe'
import { UrlProbe } from './UrlProbe'
import type { PagedResult } from '../../api/listQuery'
import type {
  ProjectFirmUserDetail,
  ProjectFirmUserRow,
} from '../../api/projectFirmUserDto'
import { ProjectFirmUserFormPage } from '../ProjectFirmUserFormPage'

export const LIST_PATH = '/admin/project-firm-users'
export const CREATE_PATH = `${LIST_PATH}/new`

export function buildRow(overrides: Partial<ProjectFirmUserRow> = {}): ProjectFirmUserRow {
  return {
    id: 1001,
    username: 'tolga.ertek',
    fullName: 'Tolga Ertek',
    email: 'tolga.ertek@tekhnelogos.com',
    phone: '5555555555',
    projectFirm: { id: 201, name: 'AA Mühendislik' },
    ...overrides,
  }
}

export function buildPage(
  rows: ProjectFirmUserRow[],
  overrides: Partial<PagedResult<ProjectFirmUserRow>> = {},
): PagedResult<ProjectFirmUserRow> {
  return { items: rows, totalCount: rows.length, page: 1, pageSize: 30, ...overrides }
}

export const MOCK_GAS_FIRMS = [
  { id: 103, name: 'AKSA-GEMLİK' },
  { id: 105, name: 'ENERYA-ANTALYA' },
]

export const MOCK_PROJECT_FIRMS = [
  { id: 201, name: 'AA Mühendislik' },
  { id: 202, name: 'Aksa Test Firması' },
]

export function buildDetail(
  overrides: Partial<ProjectFirmUserDetail> = {},
): ProjectFirmUserDetail {
  return {
    id: 1001,
    fullName: 'Tolga Ertek',
    username: 'tolga.ertek',
    email: 'tolga.ertek@tekhnelogos.com',
    phone: '05321180880',
    projectFirmId: 201,
    ...overrides,
  }
}

/**
 * Form ekranını GERÇEK rotalarıyla kurar; liste yerine sonda rota durumunu
 * gösteren bir sonda durur — "kaydet sonrası listeye dönüldü mü" ancak böyle
 * doğrulanabiliyor.
 */
export function renderFormFlow(route: string = CREATE_PATH) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={LIST_PATH} element={<ProjectFirmUserListProbe />} />
          <Route path={CREATE_PATH} element={<ProjectFirmUserFormPage />} />
          <Route path={`${LIST_PATH}/:userId`} element={<ProjectFirmUserFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

interface RenderOptions {
  route?: string
  children: ReactNode
}

export function renderWithProviders({ route = LIST_PATH, children }: RenderOptions) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <UrlProbe />
        <Routes>
          <Route path={LIST_PATH} element={<>{children}</>} />
          <Route path={`${LIST_PATH}/*`} element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
