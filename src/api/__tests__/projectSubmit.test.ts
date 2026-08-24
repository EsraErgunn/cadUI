import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../http'
import { submitProject } from '../projects'

function stubResponse(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * `POST /api/projects/{id}/submit`. Uç bugün yalnız `{ message }` döndürüyor:
 * zorunlu evrak kontrolü SUNUCUDA YOK. Şemadaki `{ ok: false,
 * missingDocuments }` dalı sözleşmede tanımlı ama uç onu üretmiyor.
 */
describe('submitProject', () => {
  it('doğru uca gider', async () => {
    const fetchMock = stubResponse(200, { ok: true, missingDocuments: [] })

    await submitProject(42)

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/projects/42/submit')
  })

  it('başarılı gönderimi ok:true olarak çözer', async () => {
    stubResponse(200, { ok: true, missingDocuments: [] })

    await expect(submitProject(42)).resolves.toEqual({ ok: true })
  })

  /**
   * Eksik evrak dalı ŞEMADA duruyor: uç kontrolü eklediğinde çağıran
   * (`useProjectActions`) değişmeden çalışsın diye. Bugün bu gövde üretilmiyor.
   */
  it('eksik evrak gövdesini çözebilir (uç henüz üretmiyor)', async () => {
    stubResponse(200, { ok: false, missingDocuments: ['Müşteri Sözleşmesi'] })

    await expect(submitProject(42)).resolves.toEqual({
      ok: false,
      missingDocuments: ['Müşteri Sözleşmesi'],
    })
  })

  /** 400 olduğu gibi yükselir; çağıran kullanıcıya hata gösterir. */
  it('400 yutulmaz', async () => {
    stubResponse(400, { message: 'Proje bu durumdan onaya gönderilemez.' })

    await expect(submitProject(42)).rejects.toBeInstanceOf(ApiError)
  })

  it('404 yutulmaz', async () => {
    stubResponse(404, { message: 'Proje bulunamadı.' })

    await expect(submitProject(42)).rejects.toBeInstanceOf(ApiError)
  })

  /**
   * Ucun BUGÜNKÜ yanıtı: `{ message }`. Şemaya uymuyor ama sunucu 2xx dediyse
   * kayıt değişmiştir — gövde biçimi yüzünden "gönderilemedi" demek yanlış olurdu.
   */
  it('şemaya uymayan başarılı gövdeyi başarı sayar', async () => {
    stubResponse(200, { message: 'Proje onaya gönderildi.' })

    await expect(submitProject(42)).resolves.toEqual({ ok: true })
  })
})
