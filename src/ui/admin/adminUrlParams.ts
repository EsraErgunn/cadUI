import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Yönetici listelerinin URL query anahtarları. Üst bardaki "Bölge" ile sayfa
 * içindeki filtre paneli AYNI `region` anahtarını yazar/okur — ikisi tek kaynağa
 * baktığı için birbiriyle çelişemez.
 */
export const ADMIN_PARAM_KEYS = {
  nameQuery: 'q',
  groupName: 'group',
  region: 'region',
  sortKey: 'sort',
  sortDir: 'dir',
  page: 'page',
  tab: 'tab',
  dateFrom: 'from',
  dateTo: 'to',
  district: 'district',
  projectFirm: 'firm',
} as const

export type AdminParamField = keyof typeof ADMIN_PARAM_KEYS
export type AdminParamPatch = Partial<Record<AdminParamField, string | null>>

/** Bölge seçilmemiş hâli: "Hepsi". URL'de anahtar hiç bulunmaz. */
export const ALL_REGIONS_LABEL = 'Hepsi'

export const FIRST_PAGE = 1

export function parsePage(raw: string | null): number {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= FIRST_PAGE ? parsed : FIRST_PAGE
}

/**
 * Patch'i mevcut query string'e uygular. Boş/null değer anahtarı SİLER: varsayılan
 * değerler adrese yazılmadığı için bağlantı temiz kalır.
 */
export function applyParamPatch(
  current: URLSearchParams,
  patch: AdminParamPatch,
  shouldResetPage: boolean,
): URLSearchParams {
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
}

/** Liste ekranlarının ortak yazma yüzeyi; her ekran kendi `URLSearchParams`
    mantığını kurmasın diye tek yerde. */
export function useAdminParamWriter(): (
  patch: AdminParamPatch,
  shouldResetPage: boolean,
) => void {
  const [, setSearchParams] = useSearchParams()

  return useCallback(
    (patch: AdminParamPatch, shouldResetPage: boolean) => {
      setSearchParams((current) => applyParamPatch(current, patch, shouldResetPage))
    },
    [setSearchParams],
  )
}

/** Üst bardaki genel kapsam filtresi. Kabuk tüm yönetici ekranlarında ortak. */
export function useRegionParam(): {
  region: string | null
  setRegion: (value: string | null) => void
} {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const setRegion = useCallback(
    // Kapsam daralınca eski sayfa numarası anlamını yitirir → ilk sayfaya dön.
    (value: string | null) => updateParams({ region: value }, true),
    [updateParams],
  )

  return { region: searchParams.get(ADMIN_PARAM_KEYS.region), setRegion }
}
