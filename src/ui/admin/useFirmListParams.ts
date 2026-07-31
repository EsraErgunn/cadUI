import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ADMIN_PARAM_KEYS, type AdminParamField } from './adminUrlParams'
import {
  GAS_FIRM_PAGE_SIZE,
  GAS_FIRM_SORT_KEYS,
  type GasDistributionFirmQuery,
  type GasFirmSortKey,
  type SortDirection,
} from '../../api/adminFirms'

const DEFAULT_SORT_KEY: GasFirmSortKey = 'dfirmNo'
const DEFAULT_SORT_DIR: SortDirection = 'asc'
const FIRST_PAGE = 1

type ParamPatch = Partial<Record<AdminParamField, string | null>>

function parseSortKey(raw: string | null): GasFirmSortKey {
  return GAS_FIRM_SORT_KEYS.find((key) => key === raw) ?? DEFAULT_SORT_KEY
}

function parseSortDir(raw: string | null): SortDirection {
  return raw === 'desc' ? 'desc' : DEFAULT_SORT_DIR
}

function parsePage(raw: string | null): number {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= FIRST_PAGE ? parsed : FIRST_PAGE
}

export interface FirmListControls {
  query: GasDistributionFirmQuery
  setNameQuery: (value: string) => void
  setGroupName: (value: string | null) => void
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
  const [searchParams, setSearchParams] = useSearchParams()

  const query = useMemo<GasDistributionFirmQuery>(
    () => ({
      nameQuery: searchParams.get(ADMIN_PARAM_KEYS.nameQuery) ?? '',
      groupName: searchParams.get(ADMIN_PARAM_KEYS.groupName),
      region: searchParams.get(ADMIN_PARAM_KEYS.region),
      sortKey: parseSortKey(searchParams.get(ADMIN_PARAM_KEYS.sortKey)),
      sortDir: parseSortDir(searchParams.get(ADMIN_PARAM_KEYS.sortDir)),
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: GAS_FIRM_PAGE_SIZE,
    }),
    [searchParams],
  )

  const updateParams = useCallback(
    (patch: ParamPatch, shouldResetPage: boolean) => {
      setSearchParams((current) => {
        const draft = new URLSearchParams(current)
        const entries = Object.entries(patch) as [AdminParamField, string | null | undefined][]
        for (const [field, value] of entries) {
          const key = ADMIN_PARAM_KEYS[field]
          if (value === undefined || value === null || value === '') {
            draft.delete(key)
            continue
          }
          draft.set(key, value)
        }
        if (shouldResetPage) draft.delete(ADMIN_PARAM_KEYS.page)
        return draft
      })
    },
    [setSearchParams],
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
  const setGroupName = useCallback(
    (value: string | null) => updateParams({ groupName: value }, true),
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

  return { query, setNameQuery, setGroupName, setRegion, toggleSort, setPage }
}
