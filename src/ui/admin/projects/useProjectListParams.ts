import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { SortDirection } from '../../../api/listQuery'
import {
  DEFAULT_PROJECT_SORT_DIR,
  DEFAULT_PROJECT_SORT_KEY,
  DEFAULT_PROJECT_STATUS,
  PROJECT_PAGE_SIZE,
  PROJECT_SORT_KEYS,
  PROJECT_STATUSES,
  type ProjectListQuery,
  type ProjectSortKey,
  type ProjectStatus,
} from '../../../api/projects'
import { lastMonthRange } from '../adminDateRange'
import {
  ADMIN_PARAM_KEYS,
  FIRST_PAGE,
  parsePage,
  useAdminParamWriter,
} from '../adminUrlParams'
import { useAdminScopeParam } from '../useAdminScopeParam'

function parseStatus(raw: string | null): ProjectStatus {
  return PROJECT_STATUSES.find((status) => status === raw) ?? DEFAULT_PROJECT_STATUS
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
  cityId: number | null
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
 * Coğrafi bölge kapsamı YOK (docs/kararlar.md K31); üst bardaki KAPSAM seçicisi
 * (sistem / grup firması / gaz dağıtım firması) buradan okunup sorguya giriyor.
 */
export function useProjectListParams(): ProjectListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()
  // Üst bardaki kapsam da URL'de duruyor; ayrı bir global state yok. Sorgu
  // nesnesinin parçası olduğu için `queryKey: ['projects', query]` kapsam
  // değişince kendiliğinden değişiyor ve eski liste gösterilmiyor.
  // Kapsam seçicisi üç rolde de çiziliyor (üst bar herkeste aynı), bu yüzden
  // seçim de üç rolde de sorguya giriyor. DARALTMA yapıyor, genişletme değil:
  // sunucu zaten `WhereVisibleTo` ile kullanıcının görebildiği kümeyi veriyor,
  // `gdGroupId`/`gdFirmId` onun İÇİNDE süzüyor.
  const { scope } = useAdminScopeParam()

  const query = useMemo<ProjectListQuery>(() => {
    const defaultRange = lastMonthRange(new Date())

    return {
      status: parseStatus(searchParams.get(ADMIN_PARAM_KEYS.tab)),
      dateFrom: searchParams.get(ADMIN_PARAM_KEYS.dateFrom) ?? defaultRange.from,
      dateTo: searchParams.get(ADMIN_PARAM_KEYS.dateTo) ?? defaultRange.to,
      cityId: parseLookupId(searchParams.get(ADMIN_PARAM_KEYS.city)),
      districtId: parseLookupId(searchParams.get(ADMIN_PARAM_KEYS.district)),
      projectFirmId: parseLookupId(searchParams.get(ADMIN_PARAM_KEYS.projectFirm)),
      scope,
      search: searchParams.get(ADMIN_PARAM_KEYS.nameQuery) ?? '',
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: PROJECT_PAGE_SIZE,
      sortBy: parseSortKey(searchParams.get(ADMIN_PARAM_KEYS.sortKey)),
      sortDir: parseSortDir(searchParams.get(ADMIN_PARAM_KEYS.sortDir)),
    }
  }, [searchParams, scope])

  const setStatus = useCallback(
    // Yalnız sekme ve sayfa değişir; tarih/ilçe/firma/arama olduğu gibi kalır.
    (status: ProjectStatus) =>
      updateParams({ tab: status === DEFAULT_PROJECT_STATUS ? null : status }, true),
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
          city: filters.cityId === null ? null : String(filters.cityId),
          // İl olmadan ilçe süzgeci anlamsız: ilçe listesi ile bağlı geliyor.
          district:
            filters.cityId === null || filters.districtId === null
              ? null
              : String(filters.districtId),
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
