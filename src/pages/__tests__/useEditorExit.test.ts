import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useEditorExit } from '../useEditorExit'

function setup(isDirty: boolean, saveResult = true) {
  const save = vi.fn().mockResolvedValue(saveResult)
  const close = vi.fn()
  const { result, rerender } = renderHook(
    (props: { isDirty: boolean }) => useEditorExit({ isDirty: props.isDirty, save, close }),
    { initialProps: { isDirty } },
  )
  return { result, rerender, save, close }
}

describe('useEditorExit', () => {
  it('değişiklik yokken soru sormadan çıkar', () => {
    // Her çıkışta pencere açmak uyarıyı gürültüye çevirir.
    const { result, close } = setup(false)

    act(() => result.current.requestClose())

    expect(close).toHaveBeenCalledTimes(1)
    expect(result.current.isPromptOpen).toBe(false)
  })

  it('kaydedilmemiş değişiklik varken önce sorar, kendiliğinden ÇIKMAZ', () => {
    const { result, close } = setup(true)

    act(() => result.current.requestClose())

    expect(result.current.isPromptOpen).toBe(true)
    expect(close).not.toHaveBeenCalled()
  })

  it('"Kaydetmeden Çık" kaydetmeden çıkar', async () => {
    const { result, save, close } = setup(true)
    act(() => result.current.requestClose())

    act(() => result.current.discardAndClose())

    expect(close).toHaveBeenCalledTimes(1)
    expect(save).not.toHaveBeenCalled()
  })

  it('"Kaydet ve Çık" önce kaydeder, sonra çıkar', async () => {
    const { result, save, close } = setup(true)
    act(() => result.current.requestClose())

    await act(async () => {
      await result.current.saveAndClose()
    })

    expect(save).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('kaydetme başarısızsa ÇIKMAZ, pencere hatayla açık kalır', async () => {
    // Başarısız kayıtta çıkılsaydı uyarının kurtarmaya çalıştığı iş tam da
    // orada kaybolurdu.
    const { result, close } = setup(true, false)
    act(() => result.current.requestClose())

    await act(async () => {
      await result.current.saveAndClose()
    })

    expect(close).not.toHaveBeenCalled()
    expect(result.current.isPromptOpen).toBe(true)
    expect(result.current.hasSaveFailed).toBe(true)
  })

  it('vazgeçilip yeniden sorulunca önceki hata taşınmaz', async () => {
    const { result } = setup(true, false)
    act(() => result.current.requestClose())
    await act(async () => {
      await result.current.saveAndClose()
    })
    expect(result.current.hasSaveFailed).toBe(true)

    act(() => result.current.cancel())
    act(() => result.current.requestClose())

    expect(result.current.hasSaveFailed).toBe(false)
  })
})
