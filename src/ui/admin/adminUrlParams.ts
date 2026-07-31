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
} as const

export type AdminParamField = keyof typeof ADMIN_PARAM_KEYS

/** Bölge seçilmemiş hâli: "Hepsi". URL'de anahtar hiç bulunmaz. */
export const ALL_REGIONS_LABEL = 'Hepsi'

/** Üst bardaki genel kapsam filtresi. Kabuk tüm yönetici ekranlarında ortak. */
export function useRegionParam(): {
  region: string | null
  setRegion: (value: string | null) => void
} {
  const [searchParams, setSearchParams] = useSearchParams()

  const setRegion = useCallback(
    (value: string | null) => {
      setSearchParams((current) => {
        const draft = new URLSearchParams(current)
        if (value === null || value === '') {
          draft.delete(ADMIN_PARAM_KEYS.region)
        } else {
          draft.set(ADMIN_PARAM_KEYS.region, value)
        }
        // Kapsam daralınca eski sayfa numarası anlamını yitirir → ilk sayfaya dön.
        draft.delete(ADMIN_PARAM_KEYS.page)
        return draft
      })
    },
    [setSearchParams],
  )

  return { region: searchParams.get(ADMIN_PARAM_KEYS.region), setRegion }
}
