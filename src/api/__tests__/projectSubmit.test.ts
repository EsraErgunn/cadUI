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
 * `POST /api/projects/{id}/submit` sözleşmesi: başarı 200 `{ ok: true }`, eksik
 * evrak **400** `{ ok: false, missingDocuments }`. İki sonuç da GÖVDEDE, ikisi
 * de kullanıcıya farklı şey söylüyor.
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
   * Eksik evrak HTTP tarafında hata (400) ama iş tarafında "tamamlanmamış iş":
   * gövde `ApiError.body` üzerinden geri okunuyor, çağıran listeyi gösteriyor.
   * İkinci bir istek atılmıyor.
   */
  it('400 gövdesindeki eksik evrak listesini çözer, hata yükseltmez', async () => {
    stubResponse(400, {
      ok: false,
      missingDocuments: ['Müşteri Sözleşmesi'],
    })

    await expect(submitProject(42)).resolves.toEqual({
      ok: false,
      missingDocuments: ['Müşteri Sözleşmesi'],
    })
  })

  /** Eksik evrak DIŞINDAKİ 400 (ör. yanlış durumdan geçiş) olduğu gibi yükselir. */
  it('şekli tutmayan 400 yutulmaz', async () => {
    stubResponse(400, { message: 'Proje bu durumdan onaya gönderilemez.' })

    await expect(submitProject(42)).rejects.toBeInstanceOf(ApiError)
  })

  it('404 yutulmaz', async () => {
    stubResponse(404, { message: 'Proje bulunamadı.' })

    await expect(submitProject(42)).rejects.toBeInstanceOf(ApiError)
  })

  /**
   * Eskiden şemaya uymayan 2xx gövdesi BAŞARI sayılıyordu: sözleşme kayınca
   * ekran "gönderildi" diyor, proje taslakta kalıyordu. Artık patlıyor.
   */
  it('şemaya uymayan başarılı gövdeyi başarı SAYMAZ', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    stubResponse(200, { message: 'Proje onaya gönderildi.' })

    await expect(submitProject(42)).rejects.toThrow(/beklenen biçimde değil/)
    expect(consoleError).toHaveBeenCalled()
  })
})
