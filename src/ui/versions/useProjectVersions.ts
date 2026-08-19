import { useEffect, useState } from 'react'

import { getProjectVersions, type ProjectVersionListItem } from '../../api/projects'
import type { Id } from '../../core/model'

export type ProjectVersionsState = {
  versions: ProjectVersionListItem[]
  isLoading: boolean
  error: string | undefined
}

/** Hangi isteğin sonucu elde tutuluyor: proje + tazeleme anahtarı. */
type VersionsResult = {
  key: string
  versions: ProjectVersionListItem[]
  error: string | undefined
}

/**
 * Projenin kayıt geçmişi. Yalnız panel AÇIKKEN çekiliyor: liste editörün başka
 * hiçbir yerinde görünmüyor, kapalıyken her proje açılışına bir istek eklemenin
 * karşılığı yok.
 *
 * `reloadKey` = editörde açık olan sürümün kimliği. Yeni kayıt alınınca (ya da
 * başka bir sürüme geçilince) değişiyor ve liste tazeleniyor — panel açıkken
 * "Kaydet"e basan kullanıcı yeni kaydını listede göremezdi.
 *
 * "Yükleniyor" bir BAYRAK değil, sonucun anahtarıyla beklenen anahtarın
 * karşılaştırması (useProjectPersistence ile aynı desen): effect'in içinde
 * senkron `setState` çağırmak art arda render doğurur ve
 * `react-hooks/set-state-in-effect` bunu hata sayıyor.
 */
export function useProjectVersions(
  projectId: Id | undefined,
  isEnabled: boolean,
  reloadKey: Id | undefined,
): ProjectVersionsState {
  const [result, setResult] = useState<VersionsResult | undefined>(undefined)

  const key = projectId === undefined ? undefined : `${projectId}:${reloadKey ?? 'yok'}`
  const settled = result?.key === key ? result : undefined

  useEffect(() => {
    if (!isEnabled || projectId === undefined || key === undefined) return undefined

    const controller = new AbortController()

    getProjectVersions(projectId, { signal: controller.signal })
      .then((versions) => {
        if (controller.signal.aborted) return
        setResult({ key, versions, error: undefined })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setResult({
          key,
          // Eski liste BIRAKILMIYOR: hata mesajının altında duran bayat kayıtlar
          // hangisinin geçerli olduğunu belirsiz bırakırdı.
          versions: [],
          error: cause instanceof Error ? cause.message : 'Kayıt geçmişi alınamadı.',
        })
      })

    return () => controller.abort()
  }, [projectId, isEnabled, key])

  return {
    versions: settled?.versions ?? [],
    // Panel kapalıyken istek de yok: "yükleniyor" demek yanıltıcı olurdu.
    isLoading: isEnabled && key !== undefined && settled === undefined,
    error: settled?.error,
  }
}
