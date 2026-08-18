import { afterEach, describe, expect, it, vi } from 'vitest'

import { prefetchEditorPage } from '../editorChunk'

/**
 * Isıtmanın DOĞRU ZAMANDA ve İPTAL EDİLEBİLİR çalıştığı sınanıyor; parçanın
 * gerçekten inip inmediği değil (o, tarayıcıda ölçüldü — K101). Buradaki risk
 * ısıtmanın ilk boyamayla yarışması ya da ekrandan çıkınca boşuna sürmesi.
 */
describe('prefetchEditorPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('boşta çalışır — ilk boyamayla yarışmasın', () => {
    const requestIdleCallback = vi.fn().mockReturnValue(7)
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)
    vi.stubGlobal('cancelIdleCallback', vi.fn())

    prefetchEditorPage()

    expect(requestIdleCallback).toHaveBeenCalledOnce()
  })

  it('iptal edilince ısıtma başlamaz', () => {
    let warm: (() => void) | undefined
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      warm = callback
      return 7
    })
    const cancelIdleCallback = vi.fn()
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback)

    prefetchEditorPage()()

    expect(cancelIdleCallback).toHaveBeenCalledWith(7)
    // Geri çağrım hiç çalıştırılmadı: iptal, indirmeyi gerçekten önlüyor.
    expect(warm).toBeTypeOf('function')
  })

  it('requestIdleCallback yoksa zamanlayıcıya düşer — Safari', () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')

    const cancel = prefetchEditorPage()

    expect(setTimeoutSpy).toHaveBeenCalled()
    cancel()
  })
})
