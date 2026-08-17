import type { ProjectData } from './model'
import { serializeProjectData } from './serialize'
import { buildMeterReport } from '../plumbing/core/meterReport'

/**
 * Kaydet (saveProjectVersion) ve Dışa Aktar'ın (useProjectExport) gerçekte
 * gönderdiği/indirdiği JSON. Düzenleme modeli (`serializeProjectData` /
 * `parseProjectJson`, kabul testinin dayanağı — core/__tests__/roundtrip.test.ts)
 * BURADAN ETKİLENMEZ: installationElements/Lines/Connections DÜZ kalır, çünkü
 * editördeki her işlem (sürükleme, bölme, bağlama) o grafiğe yazılır — sayaç
 * altında iç içe bir ağaca dönüştürülseydi düzenleme kod yolunun tamamı
 * bozulurdu.
 *
 * Bunun yerine üstüne backend'in doğrudan okuyacağı `unitReport` EKLENİR:
 * her sayaç için tek satır, altındaki armatür/cihazlarla birlikte (bkz.
 * plumbing/core/meterReport.ts). Tek doğruluk kaynağı hâlâ
 * installationConnections grafiği — unitReport ondan türeyen bir GÖRÜNÜM,
 * ayrı bir kayıt değil. Geri yüklerken (parseProjectJson) şema bilinmeyen
 * alanı sessizce yok sayar; unitReport bu yüzden düzenleme modelini hiç
 * etkilemez, yalnız DIŞARI giden dosyada durur.
 */
export function serializeProjectDataForBackend(data: ProjectData): string {
  const editable = JSON.parse(serializeProjectData(data)) as Record<string, unknown>
  return JSON.stringify({ ...editable, unitReport: buildMeterReport(data) })
}
