import { z } from 'zod'

import { requestJson } from './http'
import { pagedResultSchema, type PagedResult } from './listQuery'
import { serverData, type Sourced } from './mockGate'
import { ROLE_CODES } from './roles'

/**
 * API SÖZLEŞMESİ — gaz dağıtım firması kullanıcıları.
 *
 * GET /api/users?roleCode=GasDistributionUser&Page&PageSize
 *   200 → { items, totalCount, page, pageSize }
 *
 * Satır alanları UYDURULMADI: `id`, `username`, `fullName`, `email`, `phone`,
 * `projectFirmName` sunucunun `UserDto`'sunda VAR (users.ts).
 * `gdfRegistrationNumber` orada YOK — bu yüzden şemada opsiyonel ve gelmezse
 * hücre `EmptyValue` çizer, uydurma bir değer değil.
 */

const GAS_DISTRIBUTION_USERS_PATH = '/api/users'

export const GAS_DISTRIBUTION_USER_PAGE_SIZE = 30

const gasDistributionUserRowSchema = z.object({
  id: z.number().int().positive(),
  username: z.string(),
  fullName: z.string(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  projectFirmName: z.string().nullish(),
  /** Sunucunun bugünkü kullanıcı gövdesinde KARŞILIĞI YOK; opsiyonel. */
  gdfRegistrationNumber: z.string().nullish(),
})

export type GasDistributionUserRow = z.infer<typeof gasDistributionUserRowSchema>

const pagedGasDistributionUserSchema = pagedResultSchema(gasDistributionUserRowSchema)

export interface GasDistributionUserQuery {
  page: number
  pageSize: number
}

/**
 * Rol süzgeci sabit: ekran YALNIZ gaz dağıtım kullanıcılarını listeler
 * (`Role.Code = GasDistributionUser`, bkz. `api/roles.ts`).
 */
function buildQuery(query: GasDistributionUserQuery): string {
  const search = new URLSearchParams({
    roleCode: ROLE_CODES.gasDistributionUser,
    Page: String(query.page),
    PageSize: String(query.pageSize),
  })
  return search.toString()
}

export async function listGasDistributionUsers(
  query: GasDistributionUserQuery,
  signal?: AbortSignal,
): Promise<Sourced<PagedResult<GasDistributionUserRow>>> {
  const page = await requestJson(
    {
      method: 'GET',
      path: `${GAS_DISTRIBUTION_USERS_PATH}?${buildQuery(query)}`,
      signal,
    },
    pagedGasDistributionUserSchema,
  )

  return serverData(page)
}
