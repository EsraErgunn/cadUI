import { describe, expect, it } from 'vitest'

import { PROJECT_LIST_PATH } from '../../../pages/useCloseEditor'
import {
  DOCUMENTS_PATH,
  GAS_DISTRIBUTION_FIRMS_PATH,
  GAS_DISTRIBUTION_USERS_PATH,
  POLICIES_PATH,
  PROJECT_FIRMS_PATH,
  PROJECT_FIRM_USERS_PATH,
} from '../adminNavItems'
import { isInPlaceSearchPath } from '../globalSearchTargets'

/**
 * Ayrım SUNUCUNUN yeteneğinden geliyor: yalnız dört varlığın ucu `q` ile metin
 * araması yapıyor (projects / project-firms / gas-distribution-firms / users).
 * Geri kalan ekranlarda arama proje listesine taşınıyor.
 */
describe('isInPlaceSearchPath', () => {
  it.each([
    ['projeler', PROJECT_LIST_PATH],
    ['proje firmaları', PROJECT_FIRMS_PATH],
    ['gaz dağıtım firmaları', GAS_DISTRIBUTION_FIRMS_PATH],
    ['gaz dağıtım kullanıcıları', GAS_DISTRIBUTION_USERS_PATH],
    ['proje firması kullanıcıları', PROJECT_FIRM_USERS_PATH],
  ])('%s ekranında arama YERİNDE yapılır', (_label, path) => {
    expect(isInPlaceSearchPath(path)).toBe(true)
  })

  it.each([
    ['evraklar', DOCUMENTS_PATH],
    ['poliçeler', POLICIES_PATH],
    ['yönetici anasayfası', '/admin'],
    ['proje firması anasayfası', '/firm'],
    ['gaz dağıtım anasayfası', '/gas-distribution'],
  ])('%s ekranında arama projelere taşınır', (_label, path) => {
    expect(isInPlaceSearchPath(path)).toBe(false)
  })

  /**
   * Proje DETAYI ve editör `/projects` ön ekini paylaşıyor ama liste değil:
   * ön ek eşleşmesi kullanılsaydı orada `q` yazılır ve hiçbir şey aramazdı.
   */
  it('proje detayı ve editörü liste saymaz', () => {
    expect(isInPlaceSearchPath(`${PROJECT_LIST_PATH}/42`)).toBe(false)
    expect(isInPlaceSearchPath(`${PROJECT_LIST_PATH}/42/editor`)).toBe(false)
  })

  it('sondaki eğik çizgi adresi başka bir ekran yapmaz', () => {
    expect(isInPlaceSearchPath(`${PROJECT_LIST_PATH}/`)).toBe(true)
  })
})
