import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ADMIN_PARAM_KEYS, parseScopeId, useAdminParamWriter } from './adminUrlParams'
import { GLOBAL_SCOPE, type AdminScope } from '../../api/adminDashboard'

export interface AdminScopeControls {
  scope: AdminScope
  setScope: (scope: AdminScope) => void
}

/**
 * Üst bardaki kapsam — HER yönetici ekranında etkin.
 *
 * Durumun sahibi URL, bileşende kopya state yok: bağlantı paylaşılınca kapsam
 * da gider. Grup anahtarı liste ekranının grup filtresiyle AYNI (`group`) —
 * üst bar ile sayfa içi filtre birbirini otomatik yansıtır, ikisini eşitleyen
 * bir efekt yazmaya gerek kalmaz. Firma kapsamının liste karşılığı olmadığı
 * için kendi anahtarı var (`gdfirm`); proje firması süzgecinin `firm` anahtarı
 * BAŞKA bir kavram, karıştırılmaz.
 *
 * İki anahtar aynı anda YAZILMAZ: sunucu `gdGroupId` ile `gdFirmId`'yi birlikte
 * kabul etmiyor, yazarken biri set edilirken öbürü siliniyor. Yine de elle
 * düzenlenmiş bir adreste ikisi birden bulunabilir; okuma sırasında FİRMA
 * kazanır (daha dar kapsam) ki iki kaynaklı bir hâl arayüze sızmasın.
 */
export function useAdminScopeParam(): AdminScopeControls {
  const [searchParams] = useSearchParams()
  const updateParams = useAdminParamWriter()

  const scope = useMemo<AdminScope>(() => {
    const firmId = parseScopeId(searchParams.get(ADMIN_PARAM_KEYS.scopeFirm))
    if (firmId !== null) return { type: 'firm', firmId }

    const groupId = parseScopeId(searchParams.get(ADMIN_PARAM_KEYS.groupName))
    if (groupId !== null) return { type: 'group', groupId }

    return GLOBAL_SCOPE
  }, [searchParams])

  const setScope = useCallback(
    // Kapsam değişince sayfa 2'nin içeriği başkalaşır → ilk sayfaya dön.
    (next: AdminScope) =>
      updateParams(
        {
          groupName: next.type === 'group' ? String(next.groupId) : null,
          scopeFirm: next.type === 'firm' ? String(next.firmId) : null,
        },
        true,
      ),
    [updateParams],
  )

  return { scope, setScope }
}
