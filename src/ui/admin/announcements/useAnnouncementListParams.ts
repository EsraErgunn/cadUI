import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  ANNOUNCEMENT_PAGE_SIZE,
  type AnnouncementQuery,
} from '../../../api/adminDashboard'
import {
  ADMIN_PARAM_KEYS,
  FIRST_PAGE,
  parseGroupId,
  parsePage,
  useAdminParamWriter,
} from '../adminUrlParams'

export interface AnnouncementListControls {
  query: AnnouncementQuery
  setTextQuery: (value: string) => void
  setPage: (page: number) => void
}

/**
 * Arama ve sayfa durumunun TEK sahibi URL (`useFirmListParams` deseni). Bölge
 * kapsamı üst bardan geliyor ama AYNI query string'de duruyor (`group`), bu
 * yüzden burada ayrıca okunuyor: sorgu anahtarı kapsamı içermeseydi bölge
 * değişince liste tazelenmezdi (docs/kararlar.md K44).
 */
export function useAnnouncementListParams(): AnnouncementListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const query = useMemo<AnnouncementQuery>(
    () => ({
      textQuery: searchParams.get(ADMIN_PARAM_KEYS.nameQuery) ?? '',
      groupId: parseGroupId(searchParams.get(ADMIN_PARAM_KEYS.groupName)),
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: ANNOUNCEMENT_PAGE_SIZE,
    }),
    [searchParams],
  )

  const setTextQuery = useCallback(
    // Arama daralınca eski sayfa numarası anlamını yitirir → ilk sayfaya dön.
    (value: string) => updateParams({ nameQuery: value }, true),
    [updateParams],
  )

  const setPage = useCallback(
    (page: number) => updateParams({ page: page === FIRST_PAGE ? null : String(page) }, false),
    [updateParams],
  )

  return { query, setTextQuery, setPage }
}
