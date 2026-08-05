import type { InstallationElementType } from './symbolMetadata'

export type InstallationToolBehavior =
  | 'selection'
  | 'placement'
  | 'polyline'
  | 'segment-toggle'
  | 'measurement'

export type InstallationToolDefinition = {
  id: string
  /** Tooltip ve durum çubuğunda görünen ad. */
  label: string
  behavior: InstallationToolBehavior
  /** placement araçları için hangi sembolün yerleştirileceği. */
  elementType?: InstallationElementType
  // TODO(tesisat): issue "Araç Tanımları" metinleri erişilebilir olunca branch,
  // insulation, strainerMeter ve solenoidValve için description doldurulacak.
  description?: string
}

/**
 * Tesisat paletindeki araçlar, plan Bölüm 10'daki sırayla + doküman (tesisat_tasarimi_
 * elemanlari_ve_cizim_kurallari.md § 15) gereği eklenen 5 yakıcı cihaz türü (Soba, Şofben,
 * Kombi, Kazan, Diğer). Ortak davranış hepsinde aynı: tek gaz girişi, cihaz üzerinde vana yok
 * (bkz. docs/kararlar.md).
 */
export const INSTALLATION_TOOLS = [
  { id: 'selection', label: 'Seçim Aracı', behavior: 'selection' },
  { id: 'regulator', label: 'Regülatör Ekle', behavior: 'placement', elementType: 'regulator' },
  { id: 'pipe', label: 'Boru Ekle', behavior: 'polyline' },
  { id: 'chimney', label: 'Baca Ekle', behavior: 'placement', elementType: 'chimney' },
  { id: 'branch', label: 'Branşman Ekle', behavior: 'polyline' },
  { id: 'insulation', label: 'İzolasyon Ekle', behavior: 'segment-toggle' },
  { id: 'gasMeter', label: 'Sayaç Ekle', behavior: 'placement', elementType: 'gasMeter' },
  { id: 'manometer', label: 'Manometre Ekle', behavior: 'placement', elementType: 'manometer' },
  { id: 'serviceBox', label: 'Servis Kutusu Ekle', behavior: 'placement', elementType: 'serviceBox' },
  { id: 'filterKit', label: 'Filtre / Kit Ekle', behavior: 'placement', elementType: 'filterKit' },
  { id: 'valve', label: 'Vana Ekle', behavior: 'placement', elementType: 'valve' },
  { id: 'strainerMeter', label: 'Süzme Sayaç Ekle', behavior: 'placement', elementType: 'strainerMeter' },
  { id: 'solenoidValve', label: 'Selenoid Vana Ekle', behavior: 'placement', elementType: 'solenoidValve' },
  { id: 'ventilationDuct', label: 'Havalandırma Kanalı Ekle', behavior: 'placement', elementType: 'ventilationDuct' },
  { id: 'stove', label: 'Ocak Ekle', behavior: 'placement', elementType: 'stove' },
  { id: 'spaceHeater', label: 'Soba Ekle', behavior: 'placement', elementType: 'spaceHeater' },
  { id: 'waterHeater', label: 'Şofben Ekle', behavior: 'placement', elementType: 'waterHeater' },
  { id: 'combiBoiler', label: 'Kombi Ekle', behavior: 'placement', elementType: 'combiBoiler' },
  { id: 'boiler', label: 'Kazan Ekle', behavior: 'placement', elementType: 'boiler' },
  { id: 'otherAppliance', label: 'Diğer Yakıcı Cihaz Ekle', behavior: 'placement', elementType: 'otherAppliance' },
  { id: 'measurement', label: 'Ölçüm', behavior: 'measurement' },
] as const satisfies readonly InstallationToolDefinition[]

export type InstallationToolId = (typeof INSTALLATION_TOOLS)[number]['id']

export const DEFAULT_INSTALLATION_TOOL_ID: InstallationToolId = 'selection'

// Araç hook'ları aktif aracı bu sabitle karşılaştırır; id metni tek yerde durur
// (core/tools.ts'teki SELECTION_TOOL_ID ile aynı desen).
export const INSTALLATION_SELECTION_TOOL_ID: InstallationToolId = 'selection'

export function isInstallationToolId(toolId: string): toolId is InstallationToolId {
  return INSTALLATION_TOOLS.some((candidate) => candidate.id === toolId)
}

export function getInstallationToolLabel(toolId: InstallationToolId): string {
  const tool = INSTALLATION_TOOLS.find((candidate) => candidate.id === toolId)
  return tool?.label ?? ''
}

// Geniş tip: aktif araç mimari palete de ait olabilir (uiStore tek alan tutuyor).
const toolDefinitions: readonly InstallationToolDefinition[] = INSTALLATION_TOOLS

/** Araç yerleştirme aracıysa hangi sembolü koyduğu, değilse null. */
export function getPlacementElementType(toolId: string): InstallationElementType | null {
  const tool = toolDefinitions.find((candidate) => candidate.id === toolId)
  if (!tool || tool.behavior !== 'placement') return null
  return tool.elementType ?? null
}
