import { afterEach, describe, expect, it, vi } from 'vitest'

import { GLOBAL_SCOPE } from '../adminDashboard'
import { setAuthSession } from '../authToken'
import { listProjects, PROJECT_PAGE_SIZE, type ProjectListQuery } from '../projects'
import { ROLE_CODES, type RoleCode } from '../roles'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Boş sayfa döner; ölçülen şey GÖVDE değil, giden isteğin kendisi. */
function stubFetch() {
  const fetchMock = vi.fn((url: unknown, init?: RequestInit) => {
    void url
    void init
    return Promise.resolve(
      jsonResponse({ items: [], totalCount: 0, page: 1, pageSize: PROJECT_PAGE_SIZE }),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function signIn(roleCode: RoleCode) {
  setAuthSession({
    token: `jwt-${roleCode}`,
    expiresAt: '2099-01-01T00:00:00.000Z',
    fullName: 'Kullanıcı',
    roleCode,
  })
}

function buildQuery(overrides: Partial<ProjectListQuery> = {}): ProjectListQuery {
  return {
    status: 'onayBekleyen',
    dateFrom: null,
    dateTo: null,
    cityId: null,
    districtId: null,
    projectFirmId: null,
    scope: GLOBAL_SCOPE,
    search: '',
    page: 1,
    pageSize: PROJECT_PAGE_SIZE,
    sortBy: 'updatedAt',
    sortDir: 'desc',
    ...overrides,
  }
}

function sentUrl(fetchMock: ReturnType<typeof stubFetch>): URL {
  return new URL(String(fetchMock.mock.calls[0][0]))
}

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
  vi.unstubAllGlobals()
})

/**
 * Proje GÖRÜNÜRLÜĞÜ sunucunun işi (`ProjectAccessExtensions.WhereVisibleTo`):
 * yönetici hepsini, proje firması kullanıcısı kendi firmasının, gaz dağıtım
 * kullanıcısı kendi firmasına YETKİLİ proje firmalarının projelerini görüyor.
 * Bağ `ProjectFirmAuthorization` üzerinden kuruluyor.
 *
 * Buradaki testler o kuralı DOĞRULAMAZ — edemez, kural sunucuda. Doğruladıkları
 * şey istemcinin o kuralın ÜSTÜNE kendi süzgecini koymaması: üç rol de aynı
 * sorguyu gönderiyor ve kimlik gövdeye elle yazılmıyor. İstemcinin gönderdiği
 * firma kimliği bir güvenlik sınırı olamaz (knowledge/access-control.md).
 */
describe('proje görünürlüğü — istemci tarafı', () => {
  it.each([
    ['yönetici', ROLE_CODES.admin],
    ['proje firması kullanıcısı', ROLE_CODES.projectFirmUser],
    ['gaz dağıtım kullanıcısı', ROLE_CODES.gasDistributionUser],
  ])('%s aynı sorguyu gönderir, kapsamı kendi eklemez', async (_label, roleCode) => {
    signIn(roleCode)
    const fetchMock = stubFetch()

    await listProjects(buildQuery())

    const url = sentUrl(fetchMock)
    expect(url.pathname).toBe('/api/projects')
    // Rol bazlı daraltma parametresi YOK: kapsamı token üzerinden sunucu koyuyor.
    expect(url.searchParams.has('ProjectFirmId')).toBe(false)
    expect(url.searchParams.has('GdFirmId')).toBe(false)
    expect(url.searchParams.has('gdFirmId')).toBe(false)
    expect(url.searchParams.get('Status')).toBe('PendingApproval')
  })

  /** Oturum token'ı HER istekte gidiyor; sunucu kapsamı ondan çözüyor. */
  it('isteği oturum token`ıyla imzalar', async () => {
    signIn(ROLE_CODES.gasDistributionUser)
    const fetchMock = stubFetch()

    await listProjects(buildQuery())

    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer jwt-${ROLE_CODES.gasDistributionUser}`)
  })

  /**
   * Durum sekmesi sunucuya `Status` olarak gidiyor: "Onaya Gönder" sonrası
   * proje `PendingApproval` oluyor ve gaz dağıtım kullanıcısının onay
   * kuyruğunda o sekmeden okunuyor.
   */
  it('durum sekmesini sunucunun kod değerine çevirir', async () => {
    signIn(ROLE_CODES.gasDistributionUser)
    const fetchMock = stubFetch()

    await listProjects(buildQuery({ status: 'taslak' }))

    expect(sentUrl(fetchMock).searchParams.get('Status')).toBe('Draft')
  })
})
