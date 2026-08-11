import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { SortDirection } from '../../../api/listQuery'
import {
  DEFAULT_PROJECT_SORT_DIR,
  DEFAULT_PROJECT_SORT_KEY,
  PROJECT_PAGE_SIZE,
  PROJECT_SORT_KEYS,
  PROJECT_STATUSES,
  type ProjectListQuery,
  type ProjectSortKey,
  type ProjectStatus,
} from '../../../api/projects'
import {
  ADMIN_PARAM_KEYS,
  FIRST_PAGE,
  parsePage,
  useAdminParamWriter,
} from '../adminUrlParams'

const DEFAULT_STATUS: ProjectStatus = 'taslak'

/**
 * yyyy-aa-gg. `toISOString()` UTC'ye çevirdiği için yerel saat diliminde günü bir
 * ileri/geri kaydırabilir; parçalar elle birleştiriliyor.
 */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Varsayılan aralık: son bir ay. 31 Mart gibi bir günde `setMonth(-1)` önceki ayda
 * karşılığı olmayan günü sonraki aya taşırdı (3 Mart); gün değiştiyse önceki ayın
 * son gününe çekiliyor.
 */
export function lastMonthRange(today: Date): { from: string; to: string } {
  const from = new Date(today)
  from.setMonth(from.getMonth() - 1)
  if (from.getDate() !== today.getDate()) from.setDate(0)

  return { from: toIsoDate(from), to: toIsoDate(today) }
}

function parseStatus(raw: string | null): ProjectStatus {
  return PROJECT_STATUSES.find((status) => status === raw) ?? DEFAULT_STATUS
}

function parseSortKey(raw: string | null): ProjectSortKey {
  return PROJECT_SORT_KEYS.find((key) => key === raw) ?? DEFAULT_PROJECT_SORT_KEY
}

function parseSortDir(raw: string | null): SortDirection {
  return raw === 'asc' ? 'asc' : DEFAULT_PROJECT_SORT_DIR
}

function parseLookupId(raw: string | null): number | null {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export interface ProjectFilters {
  dateFrom: string
  dateTo: string
  districtId: number | null
  projectFirmId: number | null
  search: string
}

export interface ProjectListControls {
  query: ProjectListQuery
  setStatus: (status: ProjectStatus) => void
  applyFilters: (filters: ProjectFilters) => void
  toggleSort: (key: ProjectSortKey) => void
  setPage: (page: number) => void
}

/**
 * Proje listesi durumunun TEK sahibi: URL — `useFirmListParams` ile aynı desen.
 * Bölge kapsamı YOK: üst bardaki seçici kaldırıldı (docs/kararlar.md K31).
 */
export function useProjectListParams(): ProjectListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const query = useMemo<ProjectListQuery>(() => {
    const defaultRange = lastMonthRange(new Date())

    return {
      status: parseStatus(searchParams.get(ADMIN_PARAM_KEYS.tab)),
      dateFrom: searchParams.get(ADMIN_PARAM_KEYS.dateFrom) ?? defaultRange.from,
      dateTo: searchParams.get(ADMIN_PARAM_KEYS.dateTo) ?? defaultRange.to,
      districtId: parseLookupId(searchParams.get(ADMIN_PARAM_KEYS.district)),
      projectFirmId: parseLookupId(searchParams.get(ADMIN_PARAM_KEYS.projectFirm)),
      search: searchParams.get(ADMIN_PARAM_KEYS.nameQuery) ?? '',
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: PROJECT_PAGE_SIZE,
      sortBy: parseSortKey(searchParams.get(ADMIN_PARAM_KEYS.sortKey)),
      sortDir: parseSortDir(searchParams.get(ADMIN_PARAM_KEYS.sortDir)),
    }
  }, [searchParams])

  const setStatus = useCallback(
    // Yalnız sekme ve sayfa değişir; tarih/ilçe/firma/arama olduğu gibi kalır.
    (status: ProjectStatus) =>
      updateParams({ tab: status === DEFAULT_STATUS ? null : status }, true),
    [updateParams],
  )

  const applyFilters = useCallback(
    (filters: ProjectFilters) => {
      // Varsayılan aralık URL'e yazılmaz: kullanıcı tam da son bir ayı seçtiyse
      // adres temiz kalsın ve aralık ertesi gün yine "son bir ay" olsun.
      const defaultRange = lastMonthRange(new Date())

      updateParams(
        {
          dateFrom: filters.dateFrom === defaultRange.from ? null : filters.dateFrom,
          dateTo: filters.dateTo === defaultRange.to ? null : filters.dateTo,
          district: filters.districtId === null ? null : String(filters.districtId),
          projectFirm: filters.projectFirmId === null ? null : String(filters.projectFirmId),
          nameQuery: filters.search,
        },
        true,
      )
    },
    [updateParams],
  )

  const toggleSort = useCallback(
    (key: ProjectSortKey) => {
      const isSameColumn = key === query.sortBy
      const nextDir: SortDirection = isSameColumn && query.sortDir === 'desc' ? 'asc' : 'desc'
      // Sıra değişince sayfa 2'nin içeriği tamamen başkalaşır → ilk sayfaya dön.
      updateParams(
        {
          sortKey: key === DEFAULT_PROJECT_SORT_KEY ? null : key,
          sortDir: nextDir === DEFAULT_PROJECT_SORT_DIR ? null : nextDir,
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

  return { query, setStatus, applyFilters, toggleSort, setPage }
}
