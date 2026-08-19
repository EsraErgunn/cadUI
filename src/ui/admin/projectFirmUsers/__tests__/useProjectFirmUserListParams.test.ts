import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useProjectFirmUserListParams } from '../useProjectFirmUserListParams'

/** Kontrollerin yanında query string'i de döndürür: "varsayılan URL'e yazılmaz"
    kuralı ancak adrese bakılarak doğrulanabilir.

    `QueryClientProvider` şart: kapsam (`useScopeGasFirms`) firma listesini
    react-query ile okuyor. Sistem geneli kapsamda sorgu pasif, yani istek
    atılmıyor — sağlayıcı yalnız bağlam için duruyor. */
function renderWithUrl(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(MemoryRouter, { initialEntries: [url] }, children),
    )

  return renderHook(
    () => ({ controls: useProjectFirmUserListParams(), search: useLocation().search }),
    { wrapper },
  )
}

const LIST_PATH = '/admin/project-firm-users'

const ALL_FILTERS = { nameQuery: '', authorityType: null, onlyActive: false } as const

// KK-2: açılışta yetki "Tümü", "Aktif" işaretsiz, liste tüm kullanıcıları gösterir.
describe('okuma', () => {
  it('URL boşken varsayılanları üretir', () => {
    const { result } = renderWithUrl(LIST_PATH)

    expect(result.current.controls.query).toMatchObject({
      nameQuery: '',
      authorityType: null,
      onlyActive: false,
      page: 1,
      pageSize: 30,
    })
  })

  it('adresteki kriterleri okur', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?q=tolga&type=firmEngineer&active=1&page=3`)

    expect(result.current.controls.query).toMatchObject({
      nameQuery: 'tolga',
      authorityType: 'firmEngineer',
      onlyActive: true,
      page: 3,
    })
  })

  it('tanınmayan yetki değerini "Tümü" sayar', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?type=superuser`)

    expect(result.current.controls.query.authorityType).toBeNull()
  })

  it('bozuk sayfa numarasını ilk sayfa sayar', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?page=sifir`)

    expect(result.current.controls.query.page).toBe(1)
  })
})

describe('filtre uygulama (KK-6)', () => {
  it('üç kriteri birlikte adrese yazar', () => {
    const { result } = renderWithUrl(LIST_PATH)

    act(() =>
      result.current.controls.applyFilters({
        nameQuery: 'tolga',
        authorityType: 'firmAuthorizedPerson',
        onlyActive: true,
      }),
    )

    expect(result.current.search).toContain('q=tolga')
    expect(result.current.search).toContain('type=firmAuthorizedPerson')
    expect(result.current.search).toContain('active=1')
  })

  it('kriter değişince ilk sayfaya döner', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?page=4`)

    act(() => result.current.controls.applyFilters({ ...ALL_FILTERS, nameQuery: 'tolga' }))

    expect(result.current.controls.query.page).toBe(1)
    expect(result.current.search).not.toContain('page=')
  })

  // Varsayılan değerler adrese YAZILMAZ; bağlantı temiz kalır.
  it('"Tümü" ve işaretsiz durum adresten düşer', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?type=firmEngineer&active=1&q=tolga`)

    act(() => result.current.controls.applyFilters(ALL_FILTERS))

    expect(result.current.search).not.toContain('type=')
    expect(result.current.search).not.toContain('active=')
    expect(result.current.search).not.toContain('q=')
  })

  it('aramanın baştaki ve sondaki boşluklarını atar', () => {
    const { result } = renderWithUrl(LIST_PATH)

    act(() => result.current.controls.applyFilters({ ...ALL_FILTERS, nameQuery: '  tolga  ' }))

    expect(result.current.controls.query.nameQuery).toBe('tolga')
  })
})

// KK-12: sayfa değiştirilince uygulanan filtreler korunur.
describe('sayfalama (KK-12)', () => {
  it('sayfa değişince filtreler adreste kalır', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?q=tolga&type=firmEngineer&active=1`)

    act(() => result.current.controls.setPage(3))

    expect(result.current.controls.query).toMatchObject({
      nameQuery: 'tolga',
      authorityType: 'firmEngineer',
      onlyActive: true,
      page: 3,
    })
  })

  it('ilk sayfa adrese yazılmaz', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?page=3`)

    act(() => result.current.controls.setPage(1))

    expect(result.current.search).not.toContain('page=')
  })
})
