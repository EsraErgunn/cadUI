import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { logout } from '../auth'
import { getAuthSession, setAuthSession } from '../authToken'
import { ApiError, NetworkError } from '../http'

const SESSION = {
  token: 'jwt-token',
  expiresAt: '2099-01-01T00:00:00.000Z',
  fullName: 'Yönetici',
  roleCode: 'Admin',
}

/** Gövdesi OLMAYAN başarı yanıtı — uç gerçekte böyle dönüyor. */
function stubEmptyOk() {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function stubStatus(status: number) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ message: 'hata' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestInit(fetchMock: ReturnType<typeof vi.fn>): RequestInit {
  return fetchMock.mock.calls[0][1] as RequestInit
}

beforeEach(() => {
  localStorage.clear()
  setAuthSession(SESSION)
})

afterEach(() => {
  vi.unstubAllGlobals()
  setAuthSession(undefined)
  localStorage.clear()
})

describe('logout', () => {
  it('çıkış ucuna POST atar', async () => {
    const fetchMock = stubEmptyOk()

    await logout()

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/auth/logout')
    expect(requestInit(fetchMock).method).toBe('POST')
  })

  /** Başlık her istekte `http.ts`'te, tek yerde ekleniyor — çıkış da onu kullanır. */
  it('Authorization başlığını mevcut oturumdan gönderir', async () => {
    const fetchMock = stubEmptyOk()

    await logout()

    const headers = new Headers(requestInit(fetchMock).headers)
    expect(headers.get('Authorization')).toBe(`Bearer ${SESSION.token}`)
  })

  // Uç gövde ALMIYOR; boş bir `{}` göndermek sözleşmeye aykırı olurdu.
  it('istek gövdesi göndermez', async () => {
    const fetchMock = stubEmptyOk()

    await logout()

    expect(requestInit(fetchMock).body).toBeUndefined()
  })

  it('200 sonrası yerel oturumu temizler', async () => {
    stubEmptyOk()

    await logout()

    expect(getAuthSession()).toBeUndefined()
    expect(localStorage.getItem('starcad.auth')).toBeNull()
  })

  /**
   * 401 = token zaten geçersiz, yani istenen sonuç GERÇEKLEŞMİŞ. Hata olarak
   * yükseltmek, kullanıcıya çıkamamış gibi görünen bir ekran gösterirdi.
   */
  it('401 hata olarak yükselmez ve oturumu yine temizler', async () => {
    stubStatus(401)

    await expect(logout()).resolves.toBeUndefined()
    expect(getAuthSession()).toBeUndefined()
  })

  /**
   * Ağ hatasında bile yerel oturum düşer: kullanıcı "çık" dedi, paylaşılan bir
   * makinede oturumu açık bırakmak sunucudaki token'ın süresi dolana kadar
   * geçerli kalmasından daha kötü. Hata yine de YUTULMAZ.
   */
  it('ağ hatasında oturumu temizler ama hatayı gizlemez', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(logout()).rejects.toBeInstanceOf(NetworkError)
    expect(getAuthSession()).toBeUndefined()
  })

  it('500 yutulmaz — 401 dışındaki durumlar geçer', async () => {
    stubStatus(500)

    await expect(logout()).rejects.toBeInstanceOf(ApiError)
    expect(getAuthSession()).toBeUndefined()
  })
})
