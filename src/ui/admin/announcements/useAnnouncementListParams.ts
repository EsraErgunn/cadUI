import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  ANNOUNCEMENT_PAGE_SIZE,
  type AnnouncementQuery,
} from '../../../api/adminDashboard'
import { ADMIN_PARAM_KEYS, FIRST_PAGE, parsePage, useAdminParamWriter } from '../adminUrlParams'

export interface AnnouncementListControls {
  query: AnnouncementQuery
  setTextQuery: (value: string) => void
  setPage: (page: number) => void
}

/**
 * Arama ve sayfa durumunun TEK sahibi URL (`useFirmListParams` deseni). Bölge
 * için ayrı bir süzgeç YOK: kapsam üst bardaki seçimden geliyor ve aynı `region`
 * anahtarını okuyor — anasayfayla duyuru listesi arasında gezinirken kapsam
 * korunsun diye.
 */
export function useAnnouncementListParams(): AnnouncementListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const query = useMemo<AnnouncementQuery>(
    () => ({
      textQuery: searchParams.get(ADMIN_PARAM_KEYS.nameQuery) ?? '',
      region: searchParams.get(ADMIN_PARAM_KEYS.region),
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
