import { useCallback } from 'react'
import { useParams } from 'react-router-dom'

import { buildProjectFileName, PROJECT_FILE_MIME_TYPE } from '../core/exportProject'
import { serializeProjectData } from '../core/serialize'
import { selectProjectData, useCadStore } from '../store/cadStore'
import { downloadTextFile } from '../ui/downloadTextFile'

/**
 * Çizimi JSON dosyası olarak indirir.
 *
 * İçerik, sunucuya kaydedilenle BAYT BAYT aynı (serializeProjectData): dosya
 * geri yüklendiğinde de aynı model çıksın diye ayrı bir "okunaklı" biçim
 * üretilmiyor. Aynı nedenle JSON.stringify'ın girinti seçeneği kullanılmıyor.
 */
export function useProjectExport(): () => void {
  const { projectId: projectIdParam } = useParams()

  return useCallback(() => {
    const parsedId = Number(projectIdParam)
    const projectId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined

    // Veri tıklama anında okunur; selectProjectData her çağrıda yeni nesne üretiyor.
    const json = serializeProjectData(selectProjectData(useCadStore.getState()))

    downloadTextFile(buildProjectFileName(projectId, new Date()), json, PROJECT_FILE_MIME_TYPE)
  }, [projectIdParam])
}
