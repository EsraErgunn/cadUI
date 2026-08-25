import { fetchAllFirms } from './adminFirms'
import { requestJson } from './http'
import { pagedResultSchema, type PagedResult } from './listQuery'
import {
  toProjectFirmUserRow,
  userListItemSchema,
  type FirmReference,
  type ProjectFirmUserDetail,
  type ProjectFirmUserQuery,
  type ProjectFirmUserRow,
} from './projectFirmUserDto'
import { ROLE_CODES } from './roles'

/**
 * API SÖZLEŞMESİ — Proje firması kullanıcıları. Hepsi GERÇEK uç:
 *
 * - `GET /api/users?RoleCode=ProjectFirmUser&…` → sayfalı liste
 * - `GET /api/users/{id}`                      → güncelleme ekranının kaydı
 * - `POST /api/auth/register`                  → oluşturma (`projectFirmUserForm.ts`)
 * - `PUT /api/users/{id}`                      → güncelleme (`projectFirmUserForm.ts`)
 *
 * AYRI bir "proje firması kullanıcısı" ucu yok; rol süzgeci bağlamı veriyor.
 *
 * Kapsam sunucuya gidiyor (`GasDistributionFirmId` / `GasDistributionGroupId`).
 * Arama parametresi UÇTA YOK — bkz. `ProjectFirmUserQuery`.
 */

export const PROJECT_FIRM_USER_PAGE_SIZE = 30

const userPageSchema = pagedResultSchema(userListItemSchema)

/** G.D. firmasının seçim kutusundaki etiketi; grup adı varsa ayırt etsin diye eklenir. */
function toGasFirmLabel(firm: { name: string; groupName: string | null }): string {
  return firm.groupName === null ? firm.name : `${firm.groupName} — ${firm.name}`
}

/**
 * Yetki satırının G.D. firması seçenekleri — GERÇEK uç.
 * Sıralama istemcide ve Türkçe: sunucu 'Ç'yi 'D'den sonra veriyor.
 */
export async function getCompetencyGasFirms(signal?: AbortSignal): Promise<FirmReference[]> {
  const firms = await fetchAllFirms(signal)

  return firms
    .map((firm) => ({ id: firm.id, name: toGasFirmLabel(firm) }))
    .sort((left, right) => left.name.localeCompare(right.name, 'tr'))
}

function buildListQuery(query: ProjectFirmUserQuery): string {
  const search = new URLSearchParams({
    RoleCode: ROLE_CODES.projectFirmUser,
    Page: String(query.page),
    PageSize: String(query.pageSize),
    SortBy: 'fullName',
    SortDir: 'asc',
  })

  // Boş süzgeç parametre olarak HİÇ yazılmaz; "tümü" demek için yokluğu kullanılır.
  if (query.gasFirmGroupId !== null) {
    search.set('GasDistributionGroupId', String(query.gasFirmGroupId))
  }

  return search.toString()
}

/** Liste — `GET /api/users?RoleCode=ProjectFirmUser&…`. */
export async function getProjectFirmUserList(
  query: ProjectFirmUserQuery,
  signal?: AbortSignal,
): Promise<PagedResult<ProjectFirmUserRow>> {
  const page = await requestJson(
    { method: 'GET', path: `/api/users?${buildListQuery(query)}`, signal },
    userPageSchema,
  )

  return {
    items: page.items.map(toProjectFirmUserRow),
    totalCount: page.totalCount,
    page: page.page,
    pageSize: page.pageSize,
  }
}

/** Güncelleme ekranının kaydı — `GET /api/users/{id}`. */
export async function getProjectFirmUser(
  userId: number,
  signal?: AbortSignal,
): Promise<ProjectFirmUserDetail> {
  const dto = await requestJson(
    { method: 'GET', path: `/api/users/${userId}`, signal },
    userListItemSchema,
  )

  const row = toProjectFirmUserRow(dto)

  return {
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    email: row.email,
    phone: row.phone,
    projectFirmId: dto.projectFirmId ?? null,
  }
}
