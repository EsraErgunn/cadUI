import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthSession } from '../authToken'

const STORAGE_KEY = 'starcad.auth'

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    token: 'jwt-token',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    fullName: 'Demo Yönetici',
    roleCode: 'Admin',
    ...overrides,
  }
}

/** Modül seviyesinde depo okuduğu için her senaryoda taze import gerekiyor. */
async function importFresh() {
  vi.resetModules()
  return import('../authToken')
}

describe('authToken', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('oturumu depoya yazar ve geri okur', async () => {
    const { setAuthSession, getAuthSession } = await importFresh()
    const session = makeSession()

    setAuthSession(session)

    expect(getAuthSession()).toEqual(session)
    expect(localStorage.getItem(STORAGE_KEY)).toContain('jwt-token')
  })

  it('çıkışta depoyu da temizler', async () => {
    const { setAuthSession, getAuthSession } = await importFresh()
    setAuthSession(makeSession())

    setAuthSession(undefined)

    expect(getAuthSession()).toBeUndefined()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('süresi geçmiş token ile açılmayı reddeder', async () => {
    // Aksi halde açılıştaki her istek 401 döner ve kullanıcı "girişli" sanır.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(makeSession({ expiresAt: new Date(Date.now() - 1000).toISOString() })),
    )

    const { getAuthSession } = await importFresh()

    expect(getAuthSession()).toBeUndefined()
  })

  it('bozuk depo içeriğini oturumsuz sayar, patlamaz', async () => {
    localStorage.setItem(STORAGE_KEY, '{bu json değil')

    const { getAuthSession } = await importFresh()

    expect(getAuthSession()).toBeUndefined()
  })

  it('eksik alanlı kaydı reddeder', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'sadece-token' }))

    const { getAuthSession } = await importFresh()

    expect(getAuthSession()).toBeUndefined()
  })

  it('değişimde aboneleri uyarır', async () => {
    const { setAuthSession, subscribeAuthSession } = await importFresh()
    const listener = vi.fn()
    const unsubscribe = subscribeAuthSession(listener)

    setAuthSession(makeSession())
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setAuthSession(undefined)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
