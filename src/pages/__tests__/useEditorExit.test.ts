import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useEditorExit, type ExitBlocker } from '../useEditorExit'

function setup(isBlocked: boolean, saveResult = true) {
  const save = vi.fn().mockResolvedValue(saveResult)
  const proceed = vi.fn()
  const reset = vi.fn()
  const blocker: ExitBlocker = { isBlocked, proceed, reset }
  const { result, rerender } = renderHook(
    (props: { blocker: ExitBlocker }) => useEditorExit({ blocker: props.blocker, save }),
    { initialProps: { blocker } },
  )
  return { result, rerender, save, proceed, reset }
}

describe('useEditorExit', () => {
  it('gezinme durdurulmadıysa pencere açılmaz', () => {
    // Temiz projede engel hiç kurulmuyor; her çıkışta soru sormak gürültü olurdu.
    const { result } = setup(false)

    expect(result.current.isPromptOpen).toBe(false)
  })

  it('durdurulmuş gezinme pencereyi açar', () => {
    const { result } = setup(true)

    expect(result.current.isPromptOpen).toBe(true)
  })

  it('"Kaydetmeden Çık" kaydetmeden gezinmeyi sürdürür', () => {
    const { result, save, proceed } = setup(true)

    act(() => result.current.discardAndClose())

    expect(proceed).toHaveBeenCalledTimes(1)
    expect(save).not.toHaveBeenCalled()
  })

  it('"Vazgeç" gezinmeyi iptal eder', () => {
    const { result, proceed, reset } = setup(true)

    act(() => result.current.cancel())

    expect(reset).toHaveBeenCalledTimes(1)
    expect(proceed).not.toHaveBeenCalled()
  })

  it('"Kaydet ve Çık" önce kaydeder, sonra gezinmeyi sürdürür', async () => {
    const { result, save, proceed } = setup(true)

    await act(async () => {
      await result.current.saveAndClose()
    })

    expect(save).toHaveBeenCalledTimes(1)
    expect(proceed).toHaveBeenCalledTimes(1)
  })

  it('kaydetme başarısızsa gezinme SÜRDÜRÜLMEZ, hata pencerede kalır', async () => {
    // Başarısız kayıtta çıkılsaydı uyarının kurtarmaya çalıştığı iş tam da
    // orada kaybolurdu.
    const { result, proceed } = setup(true, false)

    await act(async () => {
      await result.current.saveAndClose()
    })

    expect(proceed).not.toHaveBeenCalled()
    expect(result.current.isPromptOpen).toBe(true)
    expect(result.current.hasSaveFailed).toBe(true)
  })

  it('vazgeçilince önceki denemenin hatası taşınmaz', async () => {
    const { result } = setup(true, false)
    await act(async () => {
      await result.current.saveAndClose()
    })
    expect(result.current.hasSaveFailed).toBe(true)

    act(() => result.current.cancel())

    expect(result.current.hasSaveFailed).toBe(false)
  })
})
