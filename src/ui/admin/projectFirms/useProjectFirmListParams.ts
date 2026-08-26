import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { SortDirection } from '../../../api/listQuery'
import {
  DEFAULT_PROJECT_FIRM_SORT_DIR,
  DEFAULT_PROJECT_FIRM_SORT_KEY,
  PROJECT_FIRM_PAGE_SIZE,
  PROJECT_FIRM_SORT_KEYS,
  type ProjectFirmQuery,
  type ProjectFirmSortKey,
} from '../../../api/projectFirms'
import { ADMIN_PARAM_KEYS, FIRST_PAGE, parsePage, useAdminParamWriter } from '../adminUrlParams'

function parseSortKey(raw: string | null): ProjectFirmSortKey {
  return PROJECT_FIRM_SORT_KEYS.find((key) => key === raw) ?? DEFAULT_PROJECT_FIRM_SORT_KEY
}

function parseSortDir(raw: string | null): SortDirection {
  return raw === 'desc' ? 'desc' : DEFAULT_PROJECT_FIRM_SORT_DIR
}

export interface ProjectFirmListControls {
  query: ProjectFirmQuery
  toggleSort: (key: ProjectFirmSortKey) => void
  setPage: (page: number) => void
}

/**
 * Arama/sıralama/sayfa durumunun TEK sahibi: URL (`useFirmListParams` deseni).
 * Varsayılan değerler adrese yazılmaz, bağlantı temiz kalır. Ekranın kendi
 * arama kutusu yok; `q` üst bardaki genel aramadan geliyor.
 *
 * Bölge ve G.D. firması anahtarı YOK: satır ikisini de taşımıyor, süzülemez
 * bir kriteri adrese yazmak yanıltıcı olurdu (bkz. api/projectFirms.ts).
 */
export function useProjectFirmListParams(): ProjectFirmListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const query = useMemo<ProjectFirmQuery>(
    () => ({
      nameQuery: searchParams.get(ADMIN_PARAM_KEYS.nameQuery) ?? '',
      sortKey: parseSortKey(searchParams.get(ADMIN_PARAM_KEYS.sortKey)),
      sortDir: parseSortDir(searchParams.get(ADMIN_PARAM_KEYS.sortDir)),
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: PROJECT_FIRM_PAGE_SIZE,
    }),
    [searchParams],
  )

  const toggleSort = useCallback(
    (key: ProjectFirmSortKey) => {
      const isSameColumn = key === query.sortKey
      const nextDir: SortDirection =
        isSameColumn && query.sortDir === 'asc' ? 'desc' : 'asc'
      updateParams(
        {
          sortKey: key === DEFAULT_PROJECT_FIRM_SORT_KEY ? null : key,
          sortDir: nextDir === DEFAULT_PROJECT_FIRM_SORT_DIR ? null : nextDir,
        },
        true,
      )
    },
    [query.sortDir, query.sortKey, updateParams],
  )

  const setPage = useCallback(
    (page: number) => updateParams({ page: page === FIRST_PAGE ? null : String(page) }, false),
    [updateParams],
  )

  return { query, toggleSort, setPage }
}
