import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { lastMonthRange } from '../../adminDateRange'
import { useProjectListParams } from '../useProjectListParams'

/** Kontrollerin yanında query string'i de döndürür: "varsayılan URL'e yazılmaz"
    kuralı ancak adrese bakılarak doğrulanabilir. */
function renderWithUrl(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [url] }, children)

  return renderHook(
    () => ({ controls: useProjectListParams(), search: useLocation().search }),
    { wrapper },
  )
}

describe('lastMonthRange', () => {
  it('ayın karşılığı olmayan gününü önceki ayın son gününe çeker', () => {
    // 31 Mart'tan bir ay geri: Şubat'ta 31 yok, 3 Mart'a taşmamalı.
    expect(lastMonthRange(new Date(2026, 2, 31)).from).toBe('2026-02-28')
  })

  it('normal günde ayı bir geri alır', () => {
    expect(lastMonthRange(new Date(2026, 6, 15))).toEqual({
      from: '2026-06-15',
      to: '2026-07-15',
    })
  })
})

describe('useProjectListParams', () => {
  it('URL boşken varsayılan olarak son bir aylık aralığı üretir', () => {
    const { result } = renderWithUrl('/projects')
    const expected = lastMonthRange(new Date())

    expect(result.current.controls.query.dateFrom).toBe(expected.from)
    expect(result.current.controls.query.dateTo).toBe(expected.to)
    expect(result.current.controls.query.status).toBe('taslak')
    expect(result.current.controls.query.page).toBe(1)
  })

  it('geçersiz tab değerini taslak kabul eder', () => {
    const { result } = renderWithUrl('/projects?tab=arsiv')

    expect(result.current.controls.query.status).toBe('taslak')
  })

  it('sekme değişince filtre kriterlerini korur, sayfayı sıfırlar', () => {
    const { result } = renderWithUrl('/projects?q=gul&district=3&firm=12&from=2026-01-01&page=4')

    act(() => result.current.controls.setStatus('onaylanan'))

    expect(result.current.controls.query.status).toBe('onaylanan')
    expect(result.current.controls.query.search).toBe('gul')
    expect(result.current.controls.query.districtId).toBe(3)
    expect(result.current.controls.query.projectFirmId).toBe(12)
    expect(result.current.controls.query.dateFrom).toBe('2026-01-01')
    expect(result.current.controls.query.page).toBe(1)
  })

  it('filtre uygulanınca sayfayı ilk sayfaya döndürür', () => {
    const { result } = renderWithUrl('/projects?page=5')

    act(() =>
      result.current.controls.applyFilters({
        dateFrom: '2026-02-01',
        dateTo: '2026-02-28',
        districtId: 2,
        projectFirmId: null,
        search: 'yıldız',
      }),
    )

    expect(result.current.controls.query.page).toBe(1)
    expect(result.current.controls.query.dateFrom).toBe('2026-02-01')
    expect(result.current.controls.query.districtId).toBe(2)
    expect(result.current.controls.query.projectFirmId).toBeNull()
    expect(result.current.controls.query.search).toBe('yıldız')
  })

  it('varsayılan tarih aralığını URL’e yazmaz', () => {
    const { result } = renderWithUrl('/projects')
    const defaultRange = lastMonthRange(new Date())

    act(() =>
      result.current.controls.applyFilters({
        dateFrom: defaultRange.from,
        dateTo: defaultRange.to,
        districtId: null,
        projectFirmId: null,
        search: '',
      }),
    )

    expect(result.current.controls.query.dateFrom).toBe(defaultRange.from)
    expect(result.current.search).not.toContain('from=')
    expect(result.current.search).not.toContain('to=')
  })

  it('sayfa değişiminde filtreleri korur', () => {
    const { result } = renderWithUrl('/projects?q=gul')

    act(() => result.current.controls.setPage(3))

    expect(result.current.controls.query.page).toBe(3)
    expect(result.current.controls.query.search).toBe('gul')
  })
})
