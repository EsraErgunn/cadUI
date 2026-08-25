import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '../../../api/roles'
import {
  GAS_DISTRIBUTION_FIRMS_PATH,
  GAS_DISTRIBUTION_USERS_PATH,
  getNavItemsForRole,
} from '../adminNavItems'

function findItem(roleCode: string, key: string) {
  return getNavItemsForRole(roleCode as never).find((item) => item.key === key)
}

describe('sol menü hiyerarşisi', () => {
  /**
   * "Gaz Dağıtım Kullanıcıları" ayrı bir ÜST SEVİYE satırken firmalarla
   * ilişkisiz görünüyordu; artık firmaların altında. Yol DEĞİŞMEDİ.
   */
  it('gaz dağıtım kullanıcıları firmaların altında, üst seviyede değil', () => {
    const items = getNavItemsForRole(ROLE_CODES.admin)

    expect(items.some((item) => item.key === 'gasDistributionUsers')).toBe(false)

    const firms = items.find((item) => item.key === 'gasDistributionFirms')
    expect(firms?.path).toBe(GAS_DISTRIBUTION_FIRMS_PATH)
    expect(firms?.children?.map((child) => child.key)).toEqual(['gasDistributionUsers'])
  })

  /** Adres korunuyor: ekrana doğrudan gidildiğinde etkin durum bu yoldan okunur. */
  it('alt maddenin yolu değişmedi', () => {
    const child = findItem(ROLE_CODES.admin, 'gasDistributionFirms')?.children?.[0]

    expect(child?.path).toBe(GAS_DISTRIBUTION_USERS_PATH)
    // Üst maddenin yolu alt maddenin ÖN EKİ DEĞİL: `end` olmadan da iki madde
    // birden işaretlenmez.
    expect(GAS_DISTRIBUTION_USERS_PATH.startsWith(`${GAS_DISTRIBUTION_FIRMS_PATH}/`)).toBe(false)
  })

  /** Alt madde kendi rolünden süzülüyor; yönetim dışı rollerde üst madde de yok. */
  it('yönetim rolü olmayan kullanıcı ne üst ne alt maddeyi görür', () => {
    const items = getNavItemsForRole(ROLE_CODES.projectFirmUser)

    expect(items.some((item) => item.key === 'gasDistributionFirms')).toBe(false)
    expect(items.flatMap((item) => item.children ?? [])).toHaveLength(0)
  })
})
