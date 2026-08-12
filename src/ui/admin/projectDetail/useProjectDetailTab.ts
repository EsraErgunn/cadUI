import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  DEFAULT_PROJECT_DETAIL_TAB,
  isProjectDetailTabKey,
  type ProjectDetailTabKey,
} from './tabItems'
import { ADMIN_PARAM_KEYS, useAdminParamWriter } from '../adminUrlParams'

interface ProjectDetailTabState {
  tab: ProjectDetailTabKey
  setTab: (tab: ProjectDetailTabKey) => void
}

/**
 * Aktif sekmenin tek sahibi URL (CLAUDE.md → liste ekranlarının durumu). Bileşen
 * kopya state tutmuyor: paylaşılan bağlantı doğru sekmeyi açsın ve tarayıcı geri
 * tuşu sekme geçişlerini geri alsın diye.
 *
 * Varsayılan sekme adrese YAZILMAZ; tanınmayan değer varsayılana düşer —
 * elle düzenlenmiş bir adres ekranı boş bırakmasın.
 */
export function useProjectDetailTab(): ProjectDetailTabState {
  const [searchParams] = useSearchParams()
  const writeParams = useAdminParamWriter()

  const raw = searchParams.get(ADMIN_PARAM_KEYS.tab)
  const tab = isProjectDetailTabKey(raw) ? raw : DEFAULT_PROJECT_DETAIL_TAB

  const setTab = useCallback(
    (next: ProjectDetailTabKey) => {
      writeParams(
        { tab: next === DEFAULT_PROJECT_DETAIL_TAB ? null : next },
        // Sayfalama yok; sıfırlanacak sayfa numarası da yok.
        false,
      )
    },
    [writeParams],
  )

  return { tab, setTab }
}
