import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { AdminScope } from '../../../api/adminDashboard'
import {
  DEFAULT_DOCUMENT_SORT_DIR,
  DEFAULT_DOCUMENT_SORT_KEY,
  DOCUMENT_PAGE_SIZE,
  DOCUMENT_SORT_KEYS,
  type DocumentSortKey,
} from '../../../api/documents'
import type { SortDirection } from '../../../api/listQuery'
import { lastMonthRange } from '../adminDateRange'
import { ADMIN_PARAM_KEYS, FIRST_PAGE, parsePage, useAdminParamWriter } from '../adminUrlParams'
import { useAdminScopeParam } from '../useAdminScopeParam'

function parseSortKey(raw: string | null): DocumentSortKey {
  return DOCUMENT_SORT_KEYS.find((key) => key === raw) ?? DEFAULT_DOCUMENT_SORT_KEY
}

function parseSortDir(raw: string | null): SortDirection {
  return raw === 'asc' ? 'asc' : DEFAULT_DOCUMENT_SORT_DIR
}

function parseLookupId(raw: string | null): number | null {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export interface DocumentFilters {
  dateFrom: string
  dateTo: string
  docTypeCode: string | null
  projectFirmId: number | null
}

/**
 * URL'den okunan hâl. `DocumentListQuery`den farkı evrak tipini KOD olarak
 * taşıması: adres okunur kalsın diye `type=License` yazılıyor, kimliğe çeviri
 * istek sınırında yapılıyor (kod kimlikleri veritabanına göre değişebiliyor).
 */
export interface DocumentUrlQuery {
  dateFrom: string
  dateTo: string
  docTypeCode: string | null
  projectFirmId: number | null
  scope: AdminScope
  page: number
  pageSize: number
  sortBy: DocumentSortKey
  sortDir: SortDirection
}

export interface DocumentListControls {
  query: DocumentUrlQuery
  applyFilters: (filters: DocumentFilters) => void
  toggleSort: (key: DocumentSortKey) => void
  setPage: (page: number) => void
}

/**
 * Evrak listesi durumunun TEK sahibi: URL — `useProjectListParams` deseni.
 * Varsayılan değerler adrese YAZILMAZ, bağlantı temiz kalır.
 */
export function useDocumentListParams(): DocumentListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()
  // Kapsam SUNUCUYA gidiyor (`GdGroupId`/`GdFirmId`); istemcide firma adına
  // göre süzme kalktı — sayfalı bir listede yalnız görünen sayfayı süzerdi.
  const { scope } = useAdminScopeParam()

  const query = useMemo<DocumentUrlQuery>(() => {
    const defaultRange = lastMonthRange(new Date())

    return {
      dateFrom: searchParams.get(ADMIN_PARAM_KEYS.dateFrom) ?? defaultRange.from,
      dateTo: searchParams.get(ADMIN_PARAM_KEYS.dateTo) ?? defaultRange.to,
      docTypeCode: searchParams.get(ADMIN_PARAM_KEYS.documentType),
      projectFirmId: parseLookupId(searchParams.get(ADMIN_PARAM_KEYS.projectFirm)),
      scope,
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: DOCUMENT_PAGE_SIZE,
      sortBy: parseSortKey(searchParams.get(ADMIN_PARAM_KEYS.sortKey)),
      sortDir: parseSortDir(searchParams.get(ADMIN_PARAM_KEYS.sortDir)),
    }
  }, [searchParams, scope])

  const applyFilters = useCallback(
    (filters: DocumentFilters) => {
      // Varsayılan aralık URL'e yazılmaz: kullanıcı tam da son bir ayı seçtiyse
      // adres temiz kalsın ve aralık ertesi gün yine "son bir ay" olsun.
      const defaultRange = lastMonthRange(new Date())

      updateParams(
        {
          dateFrom: filters.dateFrom === defaultRange.from ? null : filters.dateFrom,
          dateTo: filters.dateTo === defaultRange.to ? null : filters.dateTo,
          documentType: filters.docTypeCode,
          projectFirm: filters.projectFirmId === null ? null : String(filters.projectFirmId),
        },
        true,
      )
    },
    [updateParams],
  )

  const toggleSort = useCallback(
    (key: DocumentSortKey) => {
      const isSameColumn = key === query.sortBy
      const nextDir: SortDirection = isSameColumn && query.sortDir === 'desc' ? 'asc' : 'desc'
      // Sıra değişince sayfa 2'nin içeriği tamamen başkalaşır → ilk sayfaya dön.
      updateParams(
        {
          sortKey: key === DEFAULT_DOCUMENT_SORT_KEY ? null : key,
          sortDir: nextDir === DEFAULT_DOCUMENT_SORT_DIR ? null : nextDir,
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
