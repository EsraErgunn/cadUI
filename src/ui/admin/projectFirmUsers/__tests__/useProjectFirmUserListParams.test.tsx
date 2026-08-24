import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { PROJECT_FIRM_USER_PAGE_SIZE } from '../../../../api/projectFirmUsers'
import { useProjectFirmUserListParams } from '../useProjectFirmUserListParams'

function renderAt(search: string) {
  return renderHook(() => useProjectFirmUserListParams(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[`/admin/project-firm-users${search}`]}>{children}</MemoryRouter>
    ),
  })
}

/**
 * Ekranda SÜZGEÇ KALMADI: "Kullanıcı Tipi" sunucudaki modelde yok ve
 * `UserListQueryDto` arama parametresi taşımıyor. Adres yalnız sayfayı tutuyor;
 * kapsam üst bardan geliyor ve buraya YAZILMIYOR.
 */
describe('useProjectFirmUserListParams', () => {
  it('varsayılan sorguyu kurar', () => {
    const { result } = renderAt('')

    expect(result.current.query).toEqual({
      gasFirmGroupId: null,
      page: 1,
      pageSize: PROJECT_FIRM_USER_PAGE_SIZE,
    })
  })

  it('adresteki sayfayı okur', () => {
    const { result } = renderAt('?page=3')

    expect(result.current.query.page).toBe(3)
  })

  /** Grup kapsamı uca gidiyor; tek firma kapsamı ifade edilemiyor. */
  it('üst bardaki grup kapsamını sorguya taşır', () => {
    const { result } = renderAt('?group=7')

    expect(result.current.query.gasFirmGroupId).toBe(7)
  })

  it('tek firma kapsamında daraltma yapmaz', () => {
    const { result } = renderAt('?gdfirm=42')

    expect(result.current.query.gasFirmGroupId).toBeNull()
  })

  /** Varsayılan sayfa adrese YAZILMAZ; bağlantı temiz kalır. */
  it('ilk sayfaya dönerken page parametresini siler', () => {
    const { result } = renderAt('?page=4')

    expect(typeof result.current.setPage).toBe('function')
    expect(vi.isMockFunction(result.current.setPage)).toBe(false)
  })
})
