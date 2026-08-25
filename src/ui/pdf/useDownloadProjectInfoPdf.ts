import { DEFAULT_EXPORT_PDF_SETTINGS } from './exportPdfDefaults'
import { useExportPdf } from './useExportPdf'
import type { ProjectSummary } from '../../pages/useProjectSummary'
import { useCadStore } from '../../store/cadStore'

export type DownloadProjectInfoPdfState = {
  isDownloading: boolean
  error: string | undefined
  downloadProjectInfo: (project: ProjectSummary) => Promise<void>
}

/**
 * Üst bardaki "Proje Bilgileri" ikonunun indirdiği belge: "Proje Dosyasını
 * İndir" penceresiyle AYNI içerik (kapak + vaziyet planı + TÜM katlar +
 * izometrik, `DEFAULT_EXPORT_PDF_SETTINGS`) — pencere açmadan tek tıkla.
 *
 * Tek fark YÖN: dikey sabit (kullanıcı kararı), pencerenin yatay varsayımından
 * bilerek ayrılıyor. Kat seçimi projedeki TÜM katlar — pencerede açılışta
 * işaretli olan da bu.
 */
export function useDownloadProjectInfoPdf(): DownloadProjectInfoPdfState {
  const { isExporting, error, exportPdf } = useExportPdf()

  const downloadProjectInfo = async (project: ProjectSummary): Promise<void> => {
    const floorIds = useCadStore.getState().floors.map((floor) => floor.id)

    await exportPdf({
      settings: { ...DEFAULT_EXPORT_PDF_SETTINGS, orientation: 'portrait' },
      floorIds,
      project,
    })
  }

  return { isDownloading: isExporting, error, downloadProjectInfo }
}
