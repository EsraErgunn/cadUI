import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectListPage } from '../ProjectListPage'

/** Varsayılan tarih aralığı son bir ay; kayıtlar bugünden olmalı ki süzülmesin. */
const TODAY = `${new Date().toISOString().slice(0, 10)}T09:00:00`

/**
 * Liste artık gerçek `GET /api/projects`'e gidiyor; gövde 2026-08-04'te
 * cadapi'den doğrulanan biçimde. Sil/Gönder rozetleri hâlâ mock uçlardan
 * geliyor, onlar stub'lanmıyor.
 */
const API_PROJECTS = [
  { id: 3, name: 'Gülbahar Apartmanı', code: null, createdAt: TODAY, updatedAt: TODAY },
  { id: 2, name: 'Çınar Sitesi', code: 'PRJ-002', createdAt: TODAY, updatedAt: TODAY },
  { id: 1, name: 'Demo Doğalgaz Projesi', code: null, createdAt: TODAY, updatedAt: TODAY },
]

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="search">{location.search}</output>
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route
            path="/projects"
            element={
              <>
                <ProjectListPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve(
            new Response(JSON.stringify(API_PROJECTS), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
        ),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ProjectListPage (duman)', () => {
  it('taslak projeleri listeler, sekme değişince filtreleri korur', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1), {
      timeout: 3000,
    })

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Taslak')
    expect(screen.getAllByRole('button', { name: 'Gönder' }).length).toBeGreaterThan(0)

    await user.type(screen.getByPlaceholderText('Proje Ara...'), 'gül')
    await user.click(screen.getByRole('button', { name: 'Filtrele' }))
    await waitFor(() => expect(screen.getByTestId('search').textContent).toContain('q=g'))

    await user.click(screen.getByRole('tab', { name: /Onaylanan/ }))

    await waitFor(() =>
      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Onaylanan'),
    )
    expect(screen.getByTestId('search').textContent).toContain('q=g')
    // Onaylanan projede satır aksiyonu olmaz.
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Sil' })).toHaveLength(0))
  })

  it('sil onayı iptal edilince satır listede kalır', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Sil' }).length).toBeGreaterThan(0), {
      timeout: 3000,
    })
    const rowCount = screen.getAllByRole('row').length

    await user.click(screen.getAllByRole('button', { name: 'Sil' })[0])
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Vazgeç' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(rowCount)
  })
})
