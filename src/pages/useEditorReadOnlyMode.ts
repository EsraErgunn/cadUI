import { useEffect } from 'react'

import { useUiStore } from '../store/uiStore'
import { useIsGasDistributionUser } from '../ui/admin/useRole'

/**
 * Salt görüntüleme kipini ROLDEN kurar ve editör kapanınca söker.
 *
 * Kipi kuran TEK yer burası; okuyan yerler `isEditorReadOnly()` ya da doğrudan
 * `useUiStore`. Gaz dağıtım kullanıcısı projeyi görüntüler, çizmez — sunucu da
 * aynı sınırı çiziyor (`POST /api/projects/{id}/newversion` yalnız Admin ve
 * ProjectFirmUser'a açık).
 *
 * **Sökme şart.** `uiStore` uygulama ömrü boyunca yaşıyor; kip temizlenmeseydi
 * aynı sekmede rol değişmesi (çıkış + başka kullanıcıyla giriş) ya da editörden
 * çıkıp başka bir ekrana geçmek kipi arkada bırakırdı.
 *
 * Dönüş değeri çağıranın kendi render'ı için: düğmeleri gizleyen ve şeridi
 * çizen taraf da aynı kaynağı okusun, ikinci bir rol sorgusu yazmasın.
 *
 * `store/` içinde DEĞİL `pages/` içinde: rolü (`ui/admin/useRole`) okuyor ve
 * store katmanının arayüz katmanına bağımlı olması ters yönde bir bağ olurdu.
 * Öteki editör hook'ları da burada (`useEditorShortcuts`, `useProjectPersistence`).
 */
export function useEditorReadOnlyMode(): boolean {
  const isReadOnly = useIsGasDistributionUser()
  const setEditorReadOnly = useUiStore((state) => state.setEditorReadOnly)

  useEffect(() => {
    setEditorReadOnly(isReadOnly)
    return () => setEditorReadOnly(false)
  }, [isReadOnly, setEditorReadOnly])

  return isReadOnly
}
