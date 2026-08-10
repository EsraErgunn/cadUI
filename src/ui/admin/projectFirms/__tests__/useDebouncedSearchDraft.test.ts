import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SEARCH_DEBOUNCE_MS } from '../../useDebouncedValue'
import { useDebouncedSearchDraft } from '../useDebouncedSearchDraft'

const onApply = vi.fn()

function renderDraft(appliedQuery = '') {
  return renderHook(
    ({ applied }: { applied: string }) => useDebouncedSearchDraft(applied, onApply),
    { initialProps: { applied: appliedQuery } },
  )
}

/** Zamanlayıcıyı ilerletmek render'a yol açtığı için `act` içinde yapılır. */
function advanceDebounce() {
  act(() => {
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  onApply.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('taslaktan URLe', () => {
  it('yazım durulmadan sorguyu uygulamaz', () => {
    const { result } = renderDraft()

    act(() => result.current.setDraft('ada'))

    expect(onApply).not.toHaveBeenCalled()
  })

  it('yazım durulunca uygular ve geçmişe kayıt bırakmaz', () => {
    const { result } = renderDraft()

    act(() => result.current.setDraft('ada'))
    advanceDebounce()

    expect(onApply).toHaveBeenCalledExactlyOnceWith('ada', true)
  })

  // Asıl kazanç: 11.839 kayıt her tuş vuruşunda değil, yazım durunca taranır.
  it('hızlı yazımda ara değerleri uygulamaz', () => {
    const { result } = renderDraft()

    act(() => result.current.setDraft('a'))
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1)
    })
    act(() => result.current.setDraft('ad'))
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1)
    })
    act(() => result.current.setDraft('ada'))
    advanceDebounce()

    expect(onApply).toHaveBeenCalledExactlyOnceWith('ada', true)
  })

  it('ilk render sorguyu boşuna uygulamaz', () => {
    renderDraft('adana')
    advanceDebounce()

    expect(onApply).not.toHaveBeenCalled()
  })
})

describe('URLden taslağa', () => {
  it('çip kaldırılınca kutuyu temizler', () => {
    const { result, rerender } = renderDraft()

    act(() => result.current.setDraft('ada'))
    advanceDebounce()
    onApply.mockClear()

    // URL uygulandı, sonra kullanıcı çipi kaldırdı: q anahtarı silindi.
    rerender({ applied: 'ada' })
    rerender({ applied: '' })

    expect(result.current.draft).toBe('')
  })

  it('dışarıdan gelen değeri geri yazmaya çalışmaz', () => {
    const { result, rerender } = renderDraft()

    act(() => result.current.setDraft('ada'))
    advanceDebounce()
    onApply.mockClear()

    rerender({ applied: 'ada' })
    rerender({ applied: '' })
    advanceDebounce()

    // Eski taslak URL'e geri yazılsaydı çip kaldırma iptal olurdu.
    expect(onApply).not.toHaveBeenCalled()
  })

  it('geri tuşuyla dönülen sorguyu kutuya yansıtır', () => {
    const { result, rerender } = renderDraft()

    rerender({ applied: 'adana' })

    expect(result.current.draft).toBe('adana')
  })

  // Uygulanan değer URL'den geri geldiğinde kutu YENİDEN KURULMAMALI; kurulsaydı
  // kullanıcı yazarken her 300 ms'de odağını kaybederdi.
  it('uygulanan değer URLden dönünce ikinci kez uygulamaz', () => {
    const { result, rerender } = renderDraft()

    act(() => result.current.setDraft('ada'))
    advanceDebounce()
    onApply.mockClear()

    rerender({ applied: 'ada' })
    advanceDebounce()

    expect(onApply).not.toHaveBeenCalled()
    expect(result.current.draft).toBe('ada')
  })
})
