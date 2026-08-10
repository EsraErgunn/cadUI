import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCurrentDay } from '../dashboard/useCurrentDay'

const BEFORE_MIDNIGHT = new Date(2026, 7, 9, 23, 59, 30)
const ONE_MINUTE_MS = 60 * 1000
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BEFORE_MIDNIGHT)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCurrentDay', () => {
  it('içinde bulunulan günü verir', () => {
    const { result } = renderHook(() => useCurrentDay())

    expect(result.current.dayKey).toBe('2026-08-09')
  })

  // Ekran gece boyunca açık kalırsa tarih ve güne bağlı sayaçlar dünde kalmamalı.
  it('gece yarısı geçilince gün anahtarı değişir', () => {
    const { result } = renderHook(() => useCurrentDay())

    act(() => {
      vi.advanceTimersByTime(ONE_MINUTE_MS)
    })

    expect(result.current.dayKey).toBe('2026-08-10')
    expect(result.current.date.getDate()).toBe(10)
  })

  it('aynı gün içinde değer kimliği değişmez — boş yere yeniden sorgu çalışmasın', () => {
    vi.setSystemTime(new Date(2026, 7, 9, 10, 0))
    const { result } = renderHook(() => useCurrentDay())
    const firstDate = result.current.date

    act(() => {
      vi.advanceTimersByTime(ONE_HOUR_MS)
    })

    expect(result.current.date).toBe(firstDate)
  })

  it('ardışık günlerde çalışmaya devam eder', () => {
    const { result } = renderHook(() => useCurrentDay())

    act(() => {
      vi.advanceTimersByTime(ONE_MINUTE_MS)
    })
    act(() => {
      // Zamanlayıcı kendini yeniden kurmasaydı ikinci gece hiç ateşlenmezdi.
      vi.advanceTimersByTime(24 * ONE_HOUR_MS)
    })

    expect(result.current.dayKey).toBe('2026-08-11')
  })

  it('arka plandaki sekme öne gelince günü tazeler', () => {
    const { result } = renderHook(() => useCurrentDay())

    act(() => {
      // Zamanlayıcı kısılmış gibi: saat ilerledi ama tetiklenmedi.
      vi.setSystemTime(new Date(2026, 7, 11, 9, 0))
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(result.current.dayKey).toBe('2026-08-11')
  })
})
