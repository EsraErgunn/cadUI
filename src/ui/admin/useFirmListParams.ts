import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  ADMIN_PARAM_KEYS,
  FIRST_PAGE,
  parsePage,
  useAdminParamWriter,
} from './adminUrlParams'
import {
  GAS_FIRM_PAGE_SIZE,
  GAS_FIRM_SORT_KEYS,
  type GasDistributionFirmQuery,
  type GasFirmSortKey,
  type SortDirection,
} from '../../api/adminFirms'

const DEFAULT_SORT_KEY: GasFirmSortKey = 'dfirmNo'
const DEFAULT_SORT_DIR: SortDirection = 'asc'

function parseSortKey(raw: string | null): GasFirmSortKey {
  return GAS_FIRM_SORT_KEYS.find((key) => key === raw) ?? DEFAULT_SORT_KEY
}

function parseSortDir(raw: string | null): SortDirection {
  return raw === 'desc' ? 'desc' : DEFAULT_SORT_DIR
}

/** Grup filtresi artık kimlik taşıyor; bozuk/eski değer filtresiz sayılır. */
function parseGroupId(raw: string | null): number | null {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export interface FirmListControls {
  query: GasDistributionFirmQuery
  setNameQuery: (value: string) => void
  setGroupId: (value: number | null) => void
  setRegion: (value: string | null) => void
  toggleSort: (key: GasFirmSortKey) => void
  setPage: (page: number) => void
}

/**
 * Arama/filtre/sıralama/sayfa durumunun TEK sahibi: URL. Bileşenlerde kopya state
 * tutulmaz — böylece bağlantı paylaşılabilir ve tarayıcı geri tuşu doğru çalışır.
 * Varsayılan değerler URL'e yazılmaz, adres temiz kalır.
 */
export function useFirmListParams(): FirmListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const query = useMemo<GasDistributionFirmQuery>(
    () => ({
      nameQuery: searchParams.get(ADMIN_PARAM_KEYS.nameQuery) ?? '',
      groupId: parseGroupId(searchParams.get(ADMIN_PARAM_KEYS.groupName)),
      region: searchParams.get(ADMIN_PARAM_KEYS.region),
      sortKey: parseSortKey(searchParams.get(ADMIN_PARAM_KEYS.sortKey)),
      sortDir: parseSortDir(searchParams.get(ADMIN_PARAM_KEYS.sortDir)),
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: GAS_FIRM_PAGE_SIZE,
    }),
    [searchParams],
  )

  const toggleSort = useCallback(
    (key: GasFirmSortKey) => {
      const isSameColumn = key === query.sortKey
      const nextDir: SortDirection = isSameColumn && query.sortDir === 'asc' ? 'desc' : 'asc'
      // Sıra değişince sayfa 2'nin içeriği tamamen başkalaşır → ilk sayfaya dön.
      updateParams(
        {
          sortKey: key === DEFAULT_SORT_KEY ? null : key,
          sortDir: nextDir === DEFAULT_SORT_DIR ? null : nextDir,
        },
        true,
      )
    },
    [query.sortDir, query.sortKey, updateParams],
  )

  const setNameQuery = useCallback(
    (value: string) => updateParams({ nameQuery: value }, true),
    [updateParams],
  )
  // URL anahtarı `group` aynı kaldı, taşıdığı değer artık KİMLİK.
  const setGroupId = useCallback(
    (value: number | null) => updateParams({ groupName: value?.toString() ?? null }, true),
    [updateParams],
  )
  const setRegion = useCallback(
    (value: string | null) => updateParams({ region: value }, true),
    [updateParams],
  )
  const setPage = useCallback(
    (page: number) => updateParams({ page: page === FIRST_PAGE ? null : String(page) }, false),
    [updateParams],
  )

  return { query, setNameQuery, setGroupId, setRegion, toggleSort, setPage }
}
