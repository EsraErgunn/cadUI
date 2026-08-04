import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { loadLatestProjectVersion, saveProjectVersion } from '../api/projects'
import type { Id } from '../core/model'
import { selectProjectData, useCadStore } from '../store/cadStore'

export type ProjectPersistence = {
  projectId: Id | undefined
  /** Açılıştaki sürüm yüklemesi sürüyor mu; bu sırada kaydetme reddedilir. */
  isLoading: boolean
  isSaving: boolean
  /** Kullanıcıya gösterilecek son hata; başarılı işlem temizler. */
  error: string | undefined
  save: (label?: string) => Promise<void>
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.'
}

/** Açılış yüklemesinin sonucu, HANGİ proje için olduğuyla birlikte. */
type LoadResult = {
  projectId: Id
  status: 'ok' | 'failed'
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
  // Yüklemenin HANGİ proje için bittiği tutuluyor, düz bir bayrak değil: bayrak
  // olsaydı proje değişince onu sıfırlamak için effect'in içinde senkron
  // setState gerekirdi (art arda render). Kimlikle karşılaştırınca "yeni proje =
  // yükleniyor" bilgisi render sırasında TÜREİYOR.
  const [loadResult, setLoadResult] = useState<LoadResult | undefined>(undefined)

  // Rota parametresi metin; sayıya çevrilemiyorsa proje yok sayılır.
  const parsedId = Number(projectIdParam)
  const projectId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined

  const settled = loadResult?.projectId === projectId ? loadResult : undefined
  const isLoading = projectId !== undefined && settled === undefined
  const hasLoadFailed = settled?.status === 'failed'

  useEffect(() => {
    if (projectId === undefined) return undefined

    // Store modül düzeyinde TEK örnek ve rota değişince yaşamaya devam ediyor.
    // Temizlenmezse önceki projenin çizimi ekranda kalır; yeni projenin kaydı
    // yoksa (aşağıda `data === undefined`) orada öylece durur ve ilk "Kaydet"te
    // O projeye yazılır — bütün projeler aynı çizime yakınsardı.
    useCadStore.getState().resetProject()

    const controller = new AbortController()

    loadLatestProjectVersion(projectId, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        // Kayıt yoksa BOŞ projeyle devam edilir; bu hata DEĞİLDİR.
        if (data) useCadStore.getState().loadProject(data)
        setError(undefined)
        setLoadResult({ projectId, status: 'ok' })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(toMessage(cause))
        setLoadResult({ projectId, status: 'failed' })
      })

    return () => controller.abort()
  }, [projectId])

  const save = useCallback(
    async (label?: string) => {
      if (projectId === undefined) {
        setError('Proje kimliği okunamadı.')
        return
      }

      // Yükleme sürerken kaydetmek, sunucudan gelen çizimi henüz görmeden onun
      // üstüne yazmak demek.
      if (isLoading) {
        setError('Proje henüz yükleniyor, kaydetmeden önce bekleyin.')
        return
      }

      // Yükleme HATA verdiyse projenin sunucudaki çizimi bilinmiyor. Kaydetmek,
      // görülmemiş bir çizimin üstüne yeni bir sürüm koyardı.
      if (hasLoadFailed) {
        setError('Proje yüklenemedi; üzerine yazmamak için kaydetme kapalı. Sayfayı yenileyin.')
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
    [projectId, isLoading, hasLoadFailed],
  )

  return { projectId, isLoading, isSaving, error, save }
}
