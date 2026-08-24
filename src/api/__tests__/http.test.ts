import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { getAuthSession, setAuthSession } from '../authToken'
import { ApiError, NetworkError, requestJson, uploadForm } from '../http'

const okSchema = z.object({ ok: z.boolean() })

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function lastRequestHeaders(fetchMock: ReturnType<typeof vi.fn>): Headers {
  return new Headers(fetchMock.mock.calls[0][1].headers)
}

describe('requestJson', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    setAuthSession(undefined)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('oturum varken Authorization başlığı ekler', async () => {
    // API fail-closed: başlık tek yerde eklenmezse çağıranlardan biri unutur.
    setAuthSession({
      token: 'jwt-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      fullName: 'Demo',
      roleCode: 'Admin',
    })
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await requestJson({ method: 'GET', path: '/api/health' }, okSchema)

    expect(lastRequestHeaders(fetchMock).get('Authorization')).toBe('Bearer jwt-token')
  })

  it('oturum yokken Authorization göndermez', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await requestJson({ method: 'GET', path: '/api/health' }, okSchema)

    expect(lastRequestHeaders(fetchMock).get('Authorization')).toBeNull()
  })

  it('401 gelince oturumu düşürür', async () => {
    setAuthSession({
      token: 'expired',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      fullName: 'Demo',
      roleCode: 'Admin',
    })
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Yetkisiz' }, 401))

    await expect(
      requestJson({ method: 'GET', path: '/api/projects/1/versions' }, okSchema),
    ).rejects.toBeInstanceOf(ApiError)
    // Elde tutulsaydı RequireAuth oturumu "hâlâ var" görür, kullanıcı 401 döngüsüne girerdi.
    expect(getAuthSession()).toBeUndefined()
  })

  it('sunucunun hata mesajını taşır', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Proje bulunamadı.' }, 404))

    await expect(
      requestJson({ method: 'GET', path: '/api/projects/9/versions' }, okSchema),
    ).rejects.toThrow('Proje bulunamadı.')
  })

  it('ProblemDetails gövdesinde detail alanını kullanır', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
          title: 'Bad Request',
          status: 400,
          detail: 'Proje firması bu bölgede tanımlı değil.',
        },
        400,
      ),
    )

    await expect(requestJson({ method: 'GET', path: '/api/projects' }, okSchema)).rejects.toThrow(
      'Proje firması bu bölgede tanımlı değil.',
    )
  })

  it('model doğrulama hatasında alan mesajını çıkarır', async () => {
    // `title` burada İngilizce ve genel; kullanıcıya alan bazlı mesaj gitmeli.
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          title: 'One or more validation errors occurred.',
          status: 400,
          errors: { Name: ['Proje adı zorunludur.'] },
        },
        400,
      ),
    )

    await expect(requestJson({ method: 'POST', path: '/api/projects' }, okSchema)).rejects.toThrow(
      'Proje adı zorunludur.',
    )
  })

  it('yalnız title varsa ona düşer', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ title: 'Not Found', status: 404 }, 404))

    await expect(requestJson({ method: 'GET', path: '/api/projects/9' }, okSchema)).rejects.toThrow(
      'Not Found',
    )
  })

  it('düz message alanı ProblemDetails alanlarının önünde gelir', async () => {
    // Gerçek API girişte düz `{ message }` döndürüyor (doğrulandı); bu dal
    // ProblemDetails eklenirken kaybolmamalı.
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Kullanıcı adı veya şifre hatalı.', title: 'Unauthorized' }, 401),
    )

    await expect(requestJson({ method: 'POST', path: '/api/auth/login' }, okSchema)).rejects.toThrow(
      'Kullanıcı adı veya şifre hatalı.',
    )
  })

  it('gövde JSON değilse genel mesaja düşer', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }))

    await expect(requestJson({ method: 'GET', path: '/api/health' }, okSchema)).rejects.toThrow(
      'Sunucu 502 döndü.',
    )
  })

  it('ağa çıkılamazsa NetworkError atar', async () => {
    // "Sunucu hayır dedi" ile "sunucuya ulaşılamadı" ayrı: ikincisinde status yok.
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(
      requestJson({ method: 'GET', path: '/api/health' }, okSchema),
    ).rejects.toBeInstanceOf(NetworkError)
  })

  it('şemaya uymayan gövdeyi sınırda reddeder', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: 1 }))

    await expect(requestJson({ method: 'GET', path: '/api/health' }, okSchema)).rejects.toThrow(
      'beklenmeyen bir yanıt gövdesi',
    )
  })
})

describe('uploadForm', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    setAuthSession(undefined)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('başarılı yüklemede gövdeyi şemadan geçirip döndürür', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await expect(
      uploadForm({ path: '/api/docs', form: new FormData() }, okSchema),
    ).resolves.toEqual({ ok: true })
  })

  /**
   * Eskiden `schema.parse` çağrılıyordu: sözleşme kayınca dışarı ham bir
   * `ZodError` sızıyordu. O `ApiError` olmadığı için hem kullanıcıya Türkçe
   * mesaj yerine kütüphanenin teknik metni düşüyor hem de 4xx sayılamadığı için
   * sorgu gereksiz yere tekrar deneniyordu.
   */
  it('şemaya uymayan gövdeyi ZodError değil ApiError olarak reddeder', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: 1 }))

    const failure = uploadForm({ path: '/api/docs', form: new FormData() }, okSchema)

    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toThrow('beklenmeyen bir yanıt gövdesi')
  })

  it('sunucunun hata mesajını taşır', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Dosya çok büyük.' }, 400))

    await expect(
      uploadForm({ path: '/api/docs', form: new FormData() }, okSchema),
    ).rejects.toThrow('Dosya çok büyük.')
  })
})
