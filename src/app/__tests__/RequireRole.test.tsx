import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { setAuthSession } from '../../api/authToken'
import { ROLE_CODES } from '../../api/roles'
import {
  FORBIDDEN_PATH,
  MANAGEMENT_SCREEN_ROLES,
  PROJECT_CONTENT_WRITER_ROLES,
} from '../../ui/admin/adminNavItems'
import { RequireAuth } from '../RequireAuth'
import { RequireRole } from '../RequireRole'

const GUARDED_PATH = '/admin/project-firms'
const CREATE_PATH = '/projects/new'

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

  /**
   * Gaz dağıtım kullanıcısı da yönetim ekranlarına giremez: bir süre
   * `MANAGEMENT_SCREEN_ROLES` içindeydi, çıkarıldı. Geri sızarsa bu test kırılır.
   */
  it('gaz dağıtım kullanıcısını yönetim ekranına sokmaz', () => {
    signIn(ROLE_CODES.gasDistributionUser)
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

/**
 * Proje AÇMA rotası. Sunucu `POST /api/projects`'i yalnız Admin ve
 * ProjectFirmUser'a açıyor; gaz dağıtım kullanıcısı düğmeyi görmüyor ama adresi
 * elle yazabilir — formu doldurup kaydedince 403 almasın diye rota da kapalı.
 */
describe('RequireRole — proje oluşturma rotası', () => {
  function renderCreateRoute() {
    return render(
      <MemoryRouter initialEntries={[CREATE_PATH]}>
        <Routes>
          <Route
            path={CREATE_PATH}
            element={
              <RequireAuth>
                <RequireRole allowed={[ROLE_CODES.admin, ROLE_CODES.projectFirmUser]}>
                  <h1>Yeni Proje</h1>
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

  it.each([ROLE_CODES.admin, ROLE_CODES.projectFirmUser])('%s formu açabilir', (roleCode) => {
    signIn(roleCode)
    renderCreateRoute()

    expect(screen.getByRole('heading', { name: 'Yeni Proje' })).toBeInTheDocument()
  })

  it('gaz dağıtım kullanıcısı formu açamaz', () => {
    signIn(ROLE_CODES.gasDistributionUser)
    renderCreateRoute()

    expect(screen.queryByRole('heading', { name: 'Yeni Proje' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Yetkiniz yok' })).toBeInTheDocument()
  })
})

/**
 * Evrak ve poliçe OLUŞTURMA rotaları. Sunucu ikisini de
 * `Authorize(Roles = Admin, ProjectFirmUser)` ile koruyor
 * (`DocsController`, `PoliciesController`); gaz dağıtım kullanıcısı düğmeleri
 * görmüyor ama adresi elle yazabilir — formu doldurup kaydedince 403 almasın
 * diye rota da kapalı.
 */
describe('RequireRole — evrak ve poliçe oluşturma rotaları', () => {
  const writePaths: [label: string, path: string][] = [
    ['Evrak Ekle', '/admin/documents/new'],
    ['Poliçe Oluşturma', '/projects/42/policies/new'],
  ]

  function renderWriteRoute(routePattern: string, entry: string, heading: string) {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route
            path={routePattern}
            element={
              <RequireAuth>
                <RequireRole allowed={PROJECT_CONTENT_WRITER_ROLES}>
                  <h1>{heading}</h1>
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route path={FORBIDDEN_PATH} element={<h1>Yetkiniz yok</h1>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it.each(writePaths)('%s rotasını gaz dağıtım kullanıcısına kapatır', (heading, path) => {
    signIn(ROLE_CODES.gasDistributionUser)
    renderWriteRoute(path, path, heading)

    expect(screen.queryByRole('heading', { name: heading })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Yetkiniz yok' })).toBeInTheDocument()
  })

  it.each(writePaths)('%s rotası proje firması kullanıcısına açık kalır', (heading, path) => {
    signIn(ROLE_CODES.projectFirmUser)
    renderWriteRoute(path, path, heading)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it.each(writePaths)('%s rotası yöneticiye açık kalır', (heading, path) => {
    signIn(ROLE_CODES.admin)
    renderWriteRoute(path, path, heading)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })
})
