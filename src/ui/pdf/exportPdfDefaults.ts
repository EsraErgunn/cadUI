import type { ExportPdfSettings } from './ExportPdfOptions'
import { DEFAULT_ORIENTATION, DEFAULT_PAPER_SIZE, DEFAULT_PDF_SCALE } from '../../core/pdf/paper'

/**
 * "Proje Dosyasını İndir" penceresinin açılış ayarları. Ayrı dosyada duruyor
 * (react-refresh yalnız bileşen ihraç eden dosyalardan hoşlanıyor) —
 * `ExportPdfDialog` bunu doğrudan kullanıyor, `useDownloadProjectInfoPdf` ise
 * üst bardaki "Proje Bilgileri" düğmesi için YÖNÜ dikeye çevirip aynen taşıyor.
 */
export const DEFAULT_EXPORT_PDF_SETTINGS: ExportPdfSettings = {
  paper: DEFAULT_PAPER_SIZE,
  orientation: DEFAULT_ORIENTATION,
  scale: DEFAULT_PDF_SCALE,
  isCoverVisible: true,
  isSitePlanVisible: true,
  isIsometricVisible: true,
}
