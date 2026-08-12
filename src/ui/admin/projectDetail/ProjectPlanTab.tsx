import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useState } from 'react'

import { PlanViewer } from './PlanViewer'
import { loadLatestProjectVersion } from '../../../api/projects'
import { EmptyState } from '../EmptyState'
import { QueryError, QueryLoading } from '../QueryStates'
import { adminButtonVariants } from '../adminVariants'
import { viewerButtonVariants } from './projectDetailVariants'

const NO_DRAWING_MESSAGE =
  'Bu projenin kayıtlı bir çizimi yok. Çizim editöründe kaydedildiğinde plan burada görünecek.'

/**
 * Görüntüleyicinin kapsamı. Kaydedilen çizim (ProjectData) bugün YALNIZ mimari
 * katmanı taşıyor: boru, servis kutusu, sayaç ve cihazlar `plumbing/` tarafında
 * duruyor ve `saveProjectVersion` onları yazmıyor. Not bunu söylüyor — okuyucu
 * eksik bir planı tam sanmasın.
 */
const ARCHITECTURE_ONLY_HINT =
  'Bu görüntüleyici şimdilik yalnız mimari katmanı (duvar, açıklık, kolon/merdiven) çiziyor.'

interface ProjectPlanTabProps {
  projectId: number
  onDownloadDwg: () => void
}

/**
 * Plan sekmesi.
 *
 * "Sayfa" = KAT. Belge çok sayfalı projelerden söz ediyor ve kaydedilen çizimde
 * sayfaya karşılık gelen tek anlamlı bölüm kat listesi; uydurma bir sayfalama
 * yerine gerçek bir eksen kullanıldı.
 */
export function ProjectPlanTab({ projectId, onDownloadDwg }: ProjectPlanTabProps) {
  const [floorIndex, setFloorIndex] = useState(0)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['projectDrawing', projectId],
    // `?? null` şart: kaydı olmayan proje `undefined` döndürüyor ve react-query
    // `undefined`'ı geçersiz sayıp sorguyu çözmüyor — sekme sonsuza kadar
    // "yükleniyor" kalıyordu. `null` meşru bir "kayıt yok" cevabı.
    queryFn: async ({ signal }) =>
      (await loadLatestProjectVersion(projectId, { signal })) ?? null,
  })

  if (isPending) return <QueryLoading message="Proje planı yükleniyor…" />

  if (isError) {
    return <QueryError message="Proje planı yüklenemedi." onRetry={() => void refetch()} />
  }

  if (data === null || data.floors.length === 0) {
    return <EmptyState message={NO_DRAWING_MESSAGE} />
  }

  // Kat silinip sorgu tazelenirse dizin listenin dışında kalabilir; son kata çekilir.
  const safeIndex = Math.min(floorIndex, data.floors.length - 1)
  const floor = data.floors[safeIndex]

  return (
    <div className="flex flex-col gap-3">
      <PlanViewer
        data={data}
        floor={floor}
        pageLabel={`Sayfa ${safeIndex + 1} / ${data.floors.length} — ${floor.name}`}
        pageControls={
          <>
            <button
              type="button"
              onClick={() => setFloorIndex(safeIndex - 1)}
              disabled={safeIndex === 0}
              aria-label="Önceki sayfa"
              className={viewerButtonVariants()}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setFloorIndex(safeIndex + 1)}
              disabled={safeIndex >= data.floors.length - 1}
              aria-label="Sonraki sayfa"
              className={viewerButtonVariants()}
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </>
        }
        toolbarEnd={
          <button
            type="button"
            onClick={onDownloadDwg}
            className={adminButtonVariants({ tone: 'secondary', size: 'sm' })}
          >
            <Download aria-hidden className="size-4" />
            Planı İndir (DWG)
          </button>
        }
      />

      <p className="text-sm text-ink-muted">{ARCHITECTURE_ONLY_HINT}</p>
    </div>
  )
}
