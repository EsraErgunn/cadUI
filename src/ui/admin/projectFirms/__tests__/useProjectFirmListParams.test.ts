import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useProjectFirmListParams } from '../useProjectFirmListParams'

/** Kontrollerin yanında query string'i de döndürür: "varsayılan URL'e yazılmaz"
    kuralı ancak adrese bakılarak doğrulanabilir. */
function renderWithUrl(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [url] }, children)

  return renderHook(
    () => ({ controls: useProjectFirmListParams(), search: useLocation().search }),
    { wrapper },
  )
}

const LIST_PATH = '/admin/project-firms'

describe('okuma', () => {
  it('URL boşken varsayılanları üretir', () => {
    const { result } = renderWithUrl(LIST_PATH)

    expect(result.current.controls.query).toMatchObject({
      nameQuery: '',
      sortKey: 'name',
      sortDir: 'asc',
      page: 1,
    })
  })

  it('adresteki kriterleri okur', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?q=adana&sort=authorizedPerson&dir=desc&page=3`)

    expect(result.current.controls.query).toMatchObject({
      nameQuery: 'adana',
      sortKey: 'authorizedPerson',
      sortDir: 'desc',
      page: 3,
    })
  })

  it('tanınmayan sıralama sütununu varsayılana düşürür', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?sort=taxNumber`)

    expect(result.current.controls.query.sortKey).toBe('name')
  })

  it('bozuk sayfa numarasını ilk sayfa sayar', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?page=sifir`)

    expect(result.current.controls.query.page).toBe(1)
  })
})

describe('yazma', () => {
  it('arama değişince sayfa 1e döner', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?page=4`)

    act(() => result.current.controls.setNameQuery('adana'))

    expect(result.current.controls.query.nameQuery).toBe('adana')
    expect(result.current.controls.query.page).toBe(1)
    expect(result.current.search).not.toContain('page=')
  })

  it('boş arama anahtarı adresten siler', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?q=adana`)

    act(() => result.current.controls.setNameQuery(''))

    expect(result.current.search).not.toContain('q=')
  })

  it('sıralama değişince sayfa 1e döner', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?page=4`)

    act(() => result.current.controls.toggleSort('authorizedPerson'))

    expect(result.current.controls.query.sortKey).toBe('authorizedPerson')
    expect(result.current.controls.query.page).toBe(1)
  })

  it('aynı sütuna ikinci tıklama yönü çevirir', () => {
    const { result } = renderWithUrl(LIST_PATH)

    act(() => result.current.controls.toggleSort('name'))

    expect(result.current.controls.query.sortDir).toBe('desc')
  })

  // Varsayılanlar adrese yazılmaz; bağlantı temiz kalsın.
  it('varsayılan sıralamaya dönünce anahtarları adresten siler', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?sort=authorizedPerson&dir=desc`)

    act(() => result.current.controls.toggleSort('name'))

    expect(result.current.search).not.toContain('sort=')
    expect(result.current.search).not.toContain('dir=')
  })

  it('sayfa değişimi ilk sayfada anahtarı yazmaz', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?page=3`)

    act(() => result.current.controls.setPage(1))

    expect(result.current.search).not.toContain('page=')
  })

  it('sayfa değişimi aramayı korur', () => {
    const { result } = renderWithUrl(`${LIST_PATH}?q=adana`)

    act(() => result.current.controls.setPage(2))

    expect(result.current.controls.query.nameQuery).toBe('adana')
    expect(result.current.controls.query.page).toBe(2)
  })
})
