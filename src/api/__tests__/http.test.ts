import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { getAuthSession, setAuthSession } from '../authToken'
import { ApiError, NetworkError, requestJson } from '../http'

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
