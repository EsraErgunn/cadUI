/**
 * Rol kodları. Kullanıcı başına TEK rol var ve kontrol kırılgan id veya ad
 * metniyle değil bu sabitlerle yapılır (bkz. knowledge/access-control.md).
 * Değerler cadapi'deki `Role.Code` ile birebir aynı olmalı.
 */
export const ROLE_CODES = {
  admin: 'Admin',
  gasDistributionUser: 'GasDistributionUser',
  projectFirmUser: 'ProjectFirmUser',
} as const

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES]
