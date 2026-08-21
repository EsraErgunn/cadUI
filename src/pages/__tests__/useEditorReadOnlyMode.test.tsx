import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { setAuthSession } from '../../api/authToken'
import { ROLE_CODES } from '../../api/roles'
import { useUiStore } from '../../store/uiStore'
import { useEditorReadOnlyMode } from '../useEditorReadOnlyMode'

function signIn(roleCode: string): void {
  setAuthSession({
    token: 'jwt-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    fullName: 'Kullanıcı',
    roleCode,
  })
}

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
  useUiStore.getState().setEditorReadOnly(false)
})

describe('useEditorReadOnlyMode', () => {
  it('gaz dağıtım kullanıcısında kipi açar', () => {
    signIn(ROLE_CODES.gasDistributionUser)

    const { result } = renderHook(() => useEditorReadOnlyMode())

    expect(result.current).toBe(true)
    expect(useUiStore.getState().isEditorReadOnly).toBe(true)
  })

  it.each([ROLE_CODES.admin, ROLE_CODES.projectFirmUser])('%s rolünde kip kapalı kalır', (role) => {
    signIn(role)

    const { result } = renderHook(() => useEditorReadOnlyMode())

    expect(result.current).toBe(false)
    expect(useUiStore.getState().isEditorReadOnly).toBe(false)
  })

  /**
   * `uiStore` uygulama ömrü boyunca yaşıyor: kip sökülmezse editörden çıkan
   * gaz dağıtım kullanıcısının ardından aynı sekmede açılan başka bir editör
   * oturumu da salt görüntüleme sanılırdı.
   */
  it('editörden çıkınca kipi söker', () => {
    signIn(ROLE_CODES.gasDistributionUser)
    const { unmount } = renderHook(() => useEditorReadOnlyMode())
    expect(useUiStore.getState().isEditorReadOnly).toBe(true)

    unmount()

    expect(useUiStore.getState().isEditorReadOnly).toBe(false)
  })

  /** Rolü tanınmayan kullanıcı da yazamaz sayılmaz — kip yalnız GDU'ya özel. */
  it('oturum yokken kipi açmaz', () => {
    const { result } = renderHook(() => useEditorReadOnlyMode())

    expect(result.current).toBe(false)
  })
})
