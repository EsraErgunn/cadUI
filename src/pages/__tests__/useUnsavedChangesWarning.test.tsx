import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useUnsavedChangesWarning } from '../useUnsavedChangesWarning'

/** Tarayıcının sorusunu sadece iptal edilmiş bir olay temsil ediyor. */
function fireBeforeUnload(): boolean {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe('useUnsavedChangesWarning', () => {
  it('kaydedilmemiş değişiklik varken sayfadan ayrılmayı uyarır', () => {
    renderHook(() => useUnsavedChangesWarning(true))

    expect(fireBeforeUnload()).toBe(true)
  })

  it('değişiklik yokken hiç sormaz', () => {
    // Sürekli kayıtlı bir dinleyici temiz projede de soru sordurur ve bazı
    // tarayıcılarda geri-ileri önbelleğini devre dışı bırakır.
    renderHook(() => useUnsavedChangesWarning(false))

    expect(fireBeforeUnload()).toBe(false)
  })

  it('proje kaydedilince uyarı KALKAR', () => {
    const { rerender } = renderHook(({ isDirty }) => useUnsavedChangesWarning(isDirty), {
      initialProps: { isDirty: true },
    })
    expect(fireBeforeUnload()).toBe(true)

    rerender({ isDirty: false })
    expect(fireBeforeUnload()).toBe(false)
  })

  it('bileşen sökülünce dinleyici bırakılmaz', () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning(true))
    unmount()

    expect(fireBeforeUnload()).toBe(false)
  })
})
