import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { setAuthSession } from '../../api/authToken'
import { ROLE_CODES } from '../../api/roles'
import { FORBIDDEN_PATH, MANAGEMENT_SCREEN_ROLES } from '../../ui/admin/adminNavItems'
import { RequireAuth } from '../RequireAuth'
import { RequireRole } from '../RequireRole'

const GUARDED_PATH = '/admin/project-firms'

function signIn(roleCode: string) {
  setAuthSession({
    token: 'jwt-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    fullName: 'Kullanıcı',
    roleCode,
  })
}

/** Gerçek zincir: önce kimlik doğrulama, sonra rol kapısı. */
function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={[GUARDED_PATH]}>
      <Routes>
        <Route
          path={GUARDED_PATH}
          element={
            <RequireAuth>
              <RequireRole allowed={MANAGEMENT_SCREEN_ROLES}>
                <h1>Proje Firmaları</h1>
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route path={FORBIDDEN_PATH} element={<h1>Yetkiniz yok</h1>} />
        <Route path="/login" element={<h1>Giriş</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
})

describe('RequireRole', () => {
  it('yetkili rolü ekrana geçirir', () => {
    signIn(ROLE_CODES.admin)
    renderGuarded()

    expect(screen.getByRole('heading', { name: 'Proje Firmaları' })).toBeInTheDocument()
  })

  /**
   * ASIL SINAV: sol menüde madde yok ama kullanıcı adresi elle yazabilir.
   * Menüden gizlemek tek başına koruma değildir.
   */
  it('proje firması kullanıcısını yönetim ekranına sokmaz', () => {
    signIn(ROLE_CODES.projectFirmUser)
    renderGuarded()

    expect(screen.queryByRole('heading', { name: 'Proje Firmaları' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Yetkiniz yok' })).toBeInTheDocument()
  })

  /** Rol adı sunucuda değişirse kapı AÇILMAZ, kapanır. */
  it('tanınmayan rolü içeri almaz', () => {
    signIn('BilinmeyenRol')
    renderGuarded()

    expect(screen.getByRole('heading', { name: 'Yetkiniz yok' })).toBeInTheDocument()
  })

  /**
   * Oturumsuz kullanıcı rol kapısına HİÇ gelmez: dıştaki `RequireAuth` girişe
   * yönlendiriyor. İki sorumluluğun ayrı bileşende durmasının görünür sonucu bu
   * — kullanıcı "yetkiniz yok" değil "giriş yapın" görür.
   */
  it('oturumsuz kullanıcı girişe gider, yetkisiz ekranına değil', () => {
    renderGuarded()

    expect(screen.getByRole('heading', { name: 'Giriş' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Yetkiniz yok' })).not.toBeInTheDocument()
  })
})
