import { useCallback, useEffect, useRef, useState } from 'react'
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
 * Store'u o an DOLDURAN yükleme. Modül düzeyinde, çünkü doldurduğu şey
 * (`useCadStore`) de modül düzeyinde tek örnek — "sahip kim" sorusu hook
 * örneğinden büyük.
 *
 * Rota geçişinde iki editör örneği bir an birlikte yaşayabiliyor. Devir
 * alınırken önceki iptal edilmezse geç dönen eski istek yeni projenin çizimini
 * ezer; `loadProject` kirli işareti de sıfırladığı için sonuç TEMİZ görünür ve
 * ilk "Kaydet"te önceki projenin çizimi berikine yazılırdı.
 */
let activeLoad: { projectId: Id; controller: AbortController } | undefined

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
  // BU hook örneğinin hangi proje için yüklemeyi başlattığı. Ref fiber'da
  // yaşıyor: StrictMode'un çift effect'i ve Suspense'in gizle/geri-aç döngüsü
  // effect'i yeniden koşturur ama ref'i korur, dolayısıyla ikinci koşu kapıdan
  // dönüyor. Gerçek unmount'ta ref de gider — projeden çıkıp geri gelindiğinde
  // yükleme normal şekilde baştan yapılır.
  const startedProjectIdRef = useRef<Id | undefined>(undefined)

  // Rota parametresi metin; sayıya çevrilemiyorsa proje yok sayılır.
  const parsedId = Number(projectIdParam)
  const projectId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined

  const settled = loadResult?.projectId === projectId ? loadResult : undefined
  const isLoading = projectId !== undefined && settled === undefined
  const hasLoadFailed = settled?.status === 'failed'

  useEffect(() => {
    if (projectId === undefined) return undefined

    // Aynı proje için yükleme zaten başladıysa (sürüyor ya da bitti) hiçbir şey
    // yapılmaz. Effect yalnız `projectId` değişince değil, ağaç söküldüğünde de
    // yeniden koşuyor: StrictMode ve Suspense gizle/geri-aç. Kapı olmasaydı her
    // koşu `resetProject()` ile YENİ YÜKLENMİŞ çizimi siler ve isteği tekrarlardı.
    if (startedProjectIdRef.current === projectId) return undefined
    startedProjectIdRef.current = projectId

    // Devir alınıyor: önceki yükleme artık store'un sahibi değil.
    activeLoad?.controller.abort()

    const controller = new AbortController()
    const load = { projectId, controller }
    activeLoad = load

    // Store modül düzeyinde TEK örnek ve rota değişince yaşamaya devam ediyor.
    // Temizlenmezse önceki projenin çizimi ekranda kalır; yeni projenin kaydı
    // yoksa (aşağıda `data === undefined`) orada öylece durur ve ilk "Kaydet"te
    // O projeye yazılır — bütün projeler aynı çizime yakınsardı.
    useCadStore.getState().resetProject()

    loadLatestProjectVersion(projectId, { signal: controller.signal })
      .then((data) => {
        // Sahiplik el değiştirmişse store'a DOKUNULMAZ; sonuç artık kimsenin
        // beklemediği bir projeye ait.
        if (activeLoad !== load) return
        // Kayıt yoksa BOŞ projeyle devam edilir; bu hata DEĞİLDİR.
        if (data) useCadStore.getState().loadProject(data)
        setError(undefined)
        setLoadResult({ projectId, status: 'ok' })
      })
      .catch((cause: unknown) => {
        if (activeLoad !== load) return
        setError(toMessage(cause))
        setLoadResult({ projectId, status: 'failed' })
      })

    // Temizlik YOK: iptal artık effect koşusuna değil devre bağlı. Cleanup'ta
    // iptal edilseydi StrictMode teardown'ı sürmekte olan isteği öldürür,
    // yukarıdaki kapı da yenisini başlatmayacağı için yükleme hiç bitmezdi.
    return undefined
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
