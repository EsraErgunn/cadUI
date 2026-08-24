import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { setAuthSession } from '../../../api/authToken'
import { ROLE_CODES } from '../../../api/roles'
import { MANAGEMENT_SCREEN_ROLES, getNavItemsForRole } from '../adminNavItems'
import { hasAnyRole, toRoleCode, useRoleCode } from '../useRole'
import { getWorkspaceIdentity, resolveHomePath } from '../workspaceIdentity'

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
})

describe('toRoleCode', () => {
  it('bilinen kodları geçirir', () => {
    expect(toRoleCode('Admin')).toBe(ROLE_CODES.admin)
    expect(toRoleCode('ProjectFirmUser')).toBe(ROLE_CODES.projectFirmUser)
    expect(toRoleCode('GasDistributionUser')).toBe(ROLE_CODES.gasDistributionUser)
  })

  /**
   * Tanınmayan kod hiçbir role eşlenmez. Rol adı sunucuda değişirse arayüzün
   * kapıyı açmak yerine kapatması gerekiyor; "bilmiyorsam en azından şu rol
   * sayayım" davranışı sessiz bir yetki sızıntısı olurdu.
   */
  it.each(['admin', 'ADMIN', 'Yönetici', '', 'ProjectFirm'])('%s kodunu tanımaz', (value) => {
    expect(toRoleCode(value)).toBeUndefined()
  })

  it('oturum yokken undefined döner', () => {
    expect(toRoleCode(undefined)).toBeUndefined()
  })
})

describe('hasAnyRole', () => {
  it('listedeki rol için true döner', () => {
    expect(hasAnyRole(ROLE_CODES.admin, [ROLE_CODES.admin, ROLE_CODES.gasDistributionUser])).toBe(
      true,
    )
  })

  it('listede olmayan ve tanımsız rol için false döner', () => {
    expect(hasAnyRole(ROLE_CODES.projectFirmUser, [ROLE_CODES.admin])).toBe(false)
    expect(hasAnyRole(undefined, [ROLE_CODES.admin])).toBe(false)
  })
})

describe('useRoleCode', () => {
  it('oturumdaki rolü okur', () => {
    setAuthSession({
      token: 'jwt-token',
      expiresAt: '2099-01-01T00:00:00.000Z',
      fullName: 'Kullanıcı',
      roleCode: ROLE_CODES.projectFirmUser,
    })

    expect(renderHook(() => useRoleCode()).result.current).toBe(ROLE_CODES.projectFirmUser)
  })

  it('oturum yokken undefined döner', () => {
    expect(renderHook(() => useRoleCode()).result.current).toBeUndefined()
  })
})

describe('getNavItemsForRole', () => {
  it('proje firması kullanıcısına yönetim maddesi vermez', () => {
    const keys = getNavItemsForRole(ROLE_CODES.projectFirmUser).map((item) => item.key)

    // "Grup Firmaları" sol menüde DEĞİL, üst barda (`AdminTopBar`).
    expect(keys).toEqual(['firmHome', 'projects', 'documents', 'policies'])
  })

  it('yöneticiye sekiz maddenin hepsini verir', () => {
    const keys = getNavItemsForRole(ROLE_CODES.admin).map((item) => item.key)

    expect(keys).toEqual([
      'home',
      'projects',
      'gasDistributionFirms',
      'projectFirms',
      'projectFirmUsers',
      'gasDistributionUsers',
      'documents',
      'policies',
    ])
  })

  /**
   * Gaz dağıtım kullanıcısı bir süre `MANAGEMENT_SCREEN_ROLES`'te GEÇİCİ olarak
   * duruyordu ve yönetim menüsünü görüyordu. Artık kendi kümesi var: projeleri
   * onaylıyor, firma/kullanıcı yönetmiyor.
   */
  it('gaz dağıtım kullanıcısına yönetim maddesi vermez', () => {
    const keys = getNavItemsForRole(ROLE_CODES.gasDistributionUser).map((item) => item.key)

    // "Gaz Dağıtım Kullanıcıları" da bu rolde ARTIK YOK: ekran yönetime ait.
    expect(keys).toEqual(['gasDistributionHome', 'projects', 'documents', 'policies'])
  })

  it('tanınmayan role boş menü verir', () => {
    expect(getNavItemsForRole(undefined)).toEqual([])
  })
})

describe('MANAGEMENT_SCREEN_ROLES', () => {
  /**
   * Bu dizi hem menü süzgeci hem `RequireRole` listesi. Gaz dağıtım kullanıcısı
   * buradan çıkarıldı — geri sızarsa altı yönetim ekranı birden ona açılır.
   */
  it('yalnız yöneticiyi içerir', () => {
    expect(MANAGEMENT_SCREEN_ROLES).toEqual([ROLE_CODES.admin])
  })
})

describe('workspaceIdentity', () => {
  // Üç rol, üç ayrı adres: hiçbiri ötekinin anasayfasına düşmemeli.
  it('rolün anasayfasını verir', () => {
    expect(resolveHomePath(ROLE_CODES.admin)).toBe('/admin')
    expect(resolveHomePath(ROLE_CODES.projectFirmUser)).toBe('/firm')
    expect(resolveHomePath(ROLE_CODES.gasDistributionUser)).toBe('/gas-distribution')
  })

  /** Tanınmayan rolün "çalışma alanı" yok; anasayfası yetkisiz ekranı. */
  it('tanınmayan rolü bir çalışma alanına sokmaz', () => {
    expect(resolveHomePath(undefined)).toBe('/forbidden')
    expect(getWorkspaceIdentity(undefined).title).toBe('Panel')
  })

  it('proje firması kullanıcısına yönetici başlığını göstermez', () => {
    expect(getWorkspaceIdentity(ROLE_CODES.projectFirmUser).title).toBe('Firma Paneli')
  })

  it('gaz dağıtım kullanıcısına yönetici başlığını göstermez', () => {
    expect(getWorkspaceIdentity(ROLE_CODES.gasDistributionUser).title).toBe('Dağıtım Paneli')
  })
})
