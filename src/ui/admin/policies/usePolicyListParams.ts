import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { POLICY_PAGE_SIZE, type PolicyListQuery } from '../../../api/policies'
import { ADMIN_PARAM_KEYS, FIRST_PAGE, parsePage, useAdminParamWriter } from '../adminUrlParams'

function parseLookupId(raw: string | null): number | null {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export interface PolicyFilters {
  insuranceCompanyId: number | null
}

export interface PolicyListControls {
  query: PolicyListQuery
  applyFilters: (filters: PolicyFilters) => void
  setPage: (page: number) => void
}

/**
 * Poliçe listesi durumunun TEK sahibi: URL — `useDocumentListParams` deseni.
 * Varsayılan değerler adrese YAZILMAZ, bağlantı temiz kalır. (Poliçe
 * SİHİRBAZININ durumu bunun dışında: o form adreste taşınmıyor, K65.)
 *
 * SIRALAMA anahtarı YOK: uç `SortBy`/`SortDir` almıyor ve sıra sunucuda sabit.
 * Adreste sıralama taşımak, geri gelindiğinde uygulanmayan bir tercih vaat
 * ederdi.
 */
export function usePolicyListParams(): PolicyListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const query = useMemo<PolicyListQuery>(
    () => ({
      insuranceCompanyId: parseLookupId(searchParams.get(ADMIN_PARAM_KEYS.insuranceCompany)),
      // Bu ekran proje BAĞIMSIZ: uca `ProjectId` gitmiyor, kullanıcının
      // görünürlük kapsamındaki tüm poliçeler listeleniyor.
      projectId: null,
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: POLICY_PAGE_SIZE,
    }),
    [searchParams],
  )

  const applyFilters = useCallback(
    (filters: PolicyFilters) => {
      updateParams(
        {
          insuranceCompany:
            filters.insuranceCompanyId === null ? null : String(filters.insuranceCompanyId),
        },
        true,
      )
    },
    [updateParams],
  )

  const setPage = useCallback(
    (page: number) => updateParams({ page: page === FIRST_PAGE ? null : String(page) }, false),
    [updateParams],
  )

  return { query, applyFilters, setPage }
}
