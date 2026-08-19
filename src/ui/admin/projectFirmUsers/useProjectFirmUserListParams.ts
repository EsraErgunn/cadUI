import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  parseAuthorityType,
  type AuthorityType,
  type ProjectFirmUserQuery,
} from '../../../api/projectFirmUserDto'
import { PROJECT_FIRM_USER_PAGE_SIZE } from '../../../api/projectFirmUsers'
import { ADMIN_PARAM_KEYS, FIRST_PAGE, parsePage, useAdminParamWriter } from '../adminUrlParams'
import { useScopeGasFirms } from '../useScopeGasFirms'

/** İşaretli hâlin adresteki karşılığı; işaretsiz hâl hiç yazılmaz. */
const ONLY_ACTIVE_VALUE = '1'

/** Kullanıcının doldurduğu, henüz UYGULANMAMIŞ kriterler. */
export interface ProjectFirmUserFilters {
  nameQuery: string
  authorityType: AuthorityType | null
  onlyActive: boolean
}

export interface ProjectFirmUserListControls {
  query: ProjectFirmUserQuery
  /** "Filtrele" (ya da aramada Enter) — taslağı adrese yazar, sayfa 1'e döner. */
  applyFilters: (filters: ProjectFirmUserFilters) => void
  setPage: (page: number) => void
}

/**
 * Liste durumunun TEK sahibi URL (`useProjectFirmListParams` deseni).
 *
 * Bu ekranda filtreler yazarken DEĞİL, "Filtrele" ile uygulanıyor (KK-3/5/6):
 * kriterler bileşende taslak olarak durur, uygulandığında hepsi birlikte tek
 * adres güncellemesine ve tek isteğe dönüşür. Gerekçesi ve proje firmaları
 * ekranıyla farkı: docs/kararlar.md K47.
 *
 * Üst bardaki KAPSAM adrese buradan YAZILMAZ; anahtarını `useAdminScopeParam`
 * tutuyor ve sorguya yalnız açılmış hâliyle (firma kimlikleri) giriyor —
 * aynı anahtarı iki hook'un yazması kapsamı ikiye bölerdi.
 */
export function useProjectFirmUserListParams(): ProjectFirmUserListControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()
  const scopeGasFirms = useScopeGasFirms()

  // Sıralı dizi: sorgu react-query anahtarına giriyor, küme sırası değişirse
  // aynı kapsam iki farklı anahtar üretir ve liste boşuna yeniden çekilirdi.
  const gasFirmIds = useMemo(
    () => (scopeGasFirms.ids === null ? null : [...scopeGasFirms.ids].sort((a, b) => a - b)),
    [scopeGasFirms.ids],
  )

  const query = useMemo<ProjectFirmUserQuery>(
    () => ({
      nameQuery: searchParams.get(ADMIN_PARAM_KEYS.nameQuery) ?? '',
      authorityType: parseAuthorityType(searchParams.get(ADMIN_PARAM_KEYS.authorityType)),
      onlyActive: searchParams.get(ADMIN_PARAM_KEYS.onlyActive) === ONLY_ACTIVE_VALUE,
      gasFirmIds,
      page: parsePage(searchParams.get(ADMIN_PARAM_KEYS.page)),
      pageSize: PROJECT_FIRM_USER_PAGE_SIZE,
    }),
    [searchParams, gasFirmIds],
  )

  const applyFilters = useCallback(
    (filters: ProjectFirmUserFilters) =>
      // Kriter değişince sayfa 2'nin içeriği başkalaşır → ilk sayfaya dön (KK-6).
      updateParams(
        {
          nameQuery: filters.nameQuery.trim(),
          authorityType: filters.authorityType,
          onlyActive: filters.onlyActive ? ONLY_ACTIVE_VALUE : null,
        },
        true,
      ),
    [updateParams],
  )

  const setPage = useCallback(
    // Sayfa değişiminde filtreler korunur (KK-12): patch yalnız `page` taşıyor.
    (page: number) => updateParams({ page: page === FIRST_PAGE ? null : String(page) }, false),
    [updateParams],
  )

  return { query, applyFilters, setPage }
}
