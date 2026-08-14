import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { SortDirection } from '../../../api/listQuery'
import {
  DEFAULT_POLICY_SORT_DIR,
  DEFAULT_POLICY_SORT_KEY,
  POLICY_PAGE_SIZE,
  POLICY_SORT_KEYS,
  type PolicyListQuery,
  type PolicySortKey,
} from '../../../api/policies'
import { ADMIN_PARAM_KEYS, FIRST_PAGE, parsePage, useAdminParamWriter } from '../adminUrlParams'

function parseSortKey(raw: string | null): PolicySortKey {
  return POLICY_SORT_KEYS.find((key) => key === raw) ?? DEFAULT_POLICY_SORT_KEY
}

function parseSortDir(raw: string | null): SortDirection {
  return raw === 'asc' ? 'asc' : DEFAULT_POLICY_SORT_DIR
}

function parseLookupId(raw: string | null): number | null {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export interface PolicyFilters {
  search: string
  insuranceCompanyId: number | null
}

export interface PolicyListControls {
  query: PolicyListQuery
  applyFilters: (filters: PolicyFilters) => void
  toggleSort: (key: PolicySortKey) => void
  setPage: (page: number) => void
}

/**
 * Poliçe listesi durumunun TEK sahibi: URL — `useDocumentListParams` deseni.
 * Varsayılan değerler adrese YAZILMAZ, bağlantı temiz kalır. (Poliçe
 * SİHİRBAZININ durumu bunun dışında: o form adreste taşınmıyor, K65.)
 */
export function usePolicyListParams(): PolicyListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const query = useMemo<PolicyListQuery>(
    () => ({
      search: searchParams.get(ADMIN_PARAM_KEYS.nameQuery) ?? '',
      insuranceCompanyId: parseLookupId(searchParams.get(ADMIN_PARAM_KEYS.insuranceCompany)),
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: POLICY_PAGE_SIZE,
      sortBy: parseSortKey(searchParams.get(ADMIN_PARAM_KEYS.sortKey)),
      sortDir: parseSortDir(searchParams.get(ADMIN_PARAM_KEYS.sortDir)),
    }),
    [searchParams],
  )

  const applyFilters = useCallback(
    (filters: PolicyFilters) => {
      updateParams(
        {
          nameQuery: filters.search,
          insuranceCompany:
            filters.insuranceCompanyId === null ? null : String(filters.insuranceCompanyId),
        },
        true,
      )
    },
    [updateParams],
  )

  const toggleSort = useCallback(
    (key: PolicySortKey) => {
      const isSameColumn = key === query.sortBy
      const nextDir: SortDirection = isSameColumn && query.sortDir === 'desc' ? 'asc' : 'desc'
      // Sıra değişince sayfa 2'nin içeriği tamamen başkalaşır → ilk sayfaya dön.
      updateParams(
        {
          sortKey: key === DEFAULT_POLICY_SORT_KEY ? null : key,
          sortDir: nextDir === DEFAULT_POLICY_SORT_DIR ? null : nextDir,
        },
        true,
      )
    },
    [query.sortBy, query.sortDir, updateParams],
  )

  const setPage = useCallback(
    (page: number) => updateParams({ page: page === FIRST_PAGE ? null : String(page) }, false),
    [updateParams],
  )

  return { query, applyFilters, toggleSort, setPage }
}
