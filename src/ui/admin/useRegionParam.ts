import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ADMIN_PARAM_KEYS, parseGroupId, useAdminParamWriter } from './adminUrlParams'

export interface RegionScopeControls {
  /** Seçili grup firması kimliği; null = tüm bölgeler. */
  groupId: number | null
  setGroupId: (groupId: number | null) => void
}

/**
 * Üst bardaki bölge (grup firması) kapsamı — HER yönetici ekranında etkin.
 *
 * Durumun sahibi URL — bileşende kopya state yok, böylece bağlantı paylaşılınca
 * kapsam da gider. Anahtar liste ekranının grup filtresiyle AYNI (`group`):
 * üst bar ile sayfa içi filtre birbirini otomatik yansıtır, ikisini eşitleyen
 * bir efekt yazmaya gerek kalmaz.
 *
 * Kapsamı okuyan her ekran, satırında bölge bilgisi OLMAYAN kaydı elemez
 * (bkz. api/projects.ts `matchesQuery`): eleseydi filtre seçilir seçilmez liste
 * boşalır, kullanıcı veri kaybettiğini sanardı.
 */
export function useRegionParam(): RegionScopeControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const groupId = useMemo(
    () => parseGroupId(searchParams.get(ADMIN_PARAM_KEYS.groupName)),
    [searchParams],
  )

  const setGroupId = useCallback(
    // Kapsam değişince sayfa 2'nin içeriği başkalaşır → ilk sayfaya dön.
    (next: number | null) => updateParams({ groupName: next?.toString() ?? null }, true),
    [updateParams],
  )

  return { groupId, setGroupId }
}
