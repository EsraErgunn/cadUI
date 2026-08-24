import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { ProjectFirmUserQuery } from '../../../api/projectFirmUserDto'
import { PROJECT_FIRM_USER_PAGE_SIZE } from '../../../api/projectFirmUsers'
import { ADMIN_PARAM_KEYS, FIRST_PAGE, parsePage, useAdminParamWriter } from '../adminUrlParams'
import { useAdminScopeParam } from '../useAdminScopeParam'

export interface ProjectFirmUserListControls {
  query: ProjectFirmUserQuery
  setPage: (page: number) => void
}

/**
 * Liste durumunun TEK sahibi URL (`useProjectFirmListParams` deseni).
 *
 * SÜZGEÇ KALMADI. "Kullanıcı Tipi" alanı sunucudaki modelde yok (kullanıcı
 * başına tek proje firması var, yetki satırı kavramı yok) ve `UserListQueryDto`
 * bir arama parametresi de taşımıyor — sayfalı listede istemci araması yalnız
 * görünen sayfayı süzer, `totalCount` süzülmemiş kalırdı. İkisi de ekrandan
 * kaldırıldı; adres yalnız sayfa numarasını taşıyor.
 *
 * Üst bardaki KAPSAM adrese buradan YAZILMAZ; anahtarını `useAdminScopeParam`
 * tutuyor ve sorguya yalnız GRUP kimliği olarak giriyor.
 */
export function useProjectFirmUserListParams(): ProjectFirmUserListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()
  const { scope } = useAdminScopeParam()

  const query = useMemo<ProjectFirmUserQuery>(
    () => ({
      // Tek firma kapsamında uçta gönderilecek parametre yok; yalnız grup
      // daraltması ifade edilebiliyor (bkz. `ProjectFirmUserQuery`).
      gasFirmGroupId: scope.type === 'group' ? scope.groupId : null,
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: PROJECT_FIRM_USER_PAGE_SIZE,
    }),
    [searchParams, scope],
  )

  const setPage = useCallback(
    (page: number) => updateParams({ page: page === FIRST_PAGE ? null : String(page) }, false),
    [updateParams],
  )

  return { query, setPage }
}
