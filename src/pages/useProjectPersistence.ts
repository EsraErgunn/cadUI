import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { loadLatestProjectVersion, saveProjectVersion } from '../api/projects'
import type { Id } from '../core/model'
import { selectProjectData, useCadStore } from '../store/cadStore'

export type ProjectPersistence = {
  projectId: Id | undefined
  isSaving: boolean
  /** Kullanıcıya gösterilecek son hata; başarılı işlem temizler. */
  error: string | undefined
  save: (label?: string) => Promise<void>
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.'
}

/**
 * Çizimi API'ye kaydeder ve açılışta son sürümü yükler.
 *
 * Autosave YOK (backend kararı, knowledge/minio-canvas-json.md): yazma yalnız
 * save() çağrılınca olur. Yükleme açılışta bir kez — sürüm seçme ekranı kendi
 * issue'sunda gelecek.
 */
export function useProjectPersistence(): ProjectPersistence {
  const { projectId: projectIdParam } = useParams()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  // Rota parametresi metin; sayıya çevrilemiyorsa proje yok sayılır.
  const parsedId = Number(projectIdParam)
  const projectId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined

  useEffect(() => {
    if (projectId === undefined) return undefined

    const controller = new AbortController()

    loadLatestProjectVersion(projectId, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        // Kayıt yoksa boş projeyle devam edilir; bu hata DEĞİLDİR.
        if (data) useCadStore.getState().loadProject(data)
        setError(undefined)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(toMessage(cause))
      })

    return () => controller.abort()
  }, [projectId])

  const save = useCallback(
    async (label?: string) => {
      if (projectId === undefined) {
        setError('Proje kimliği okunamadı.')
        return
      }

      setIsSaving(true)
      try {
        // Veri yazma anında okunur: selectProjectData her çağrıda yeni nesne
        // üretiyor, abone olunsaydı her render yeniden kaydetmeye yol açardı.
        await saveProjectVersion(projectId, selectProjectData(useCadStore.getState()), label)
        // Kirli işareti YALNIZ sunucu kabul edince temizlenir.
        useCadStore.getState().markSaved()
        setError(undefined)
      } catch (cause: unknown) {
        setError(toMessage(cause))
      } finally {
        setIsSaving(false)
      }
    },
    [projectId],
  )

  return { projectId, isSaving, error, save }
}
