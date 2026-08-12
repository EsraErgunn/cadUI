import type { InstallationLineKind } from './installationModel'
import { isDischargeKind, type DischargeLineKind } from './lineKinds'
import type { InstallationElementType } from './symbolMetadata'

export type InstallationToolBehavior = 'selection' | 'placement' | 'polyline' | 'measurement'

export type InstallationToolDefinition = {
  id: string
  /** Tooltip ve durum çubuğunda görünen ad. */
  label: string
  behavior: InstallationToolBehavior
  /** placement araçları için hangi sembolün yerleştirileceği. */
  elementType?: InstallationElementType
  /** polyline araçları için çizilen hattın türü. */
  lineKind?: InstallationLineKind
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
  { id: 'pipe', label: 'Boru Ekle', behavior: 'polyline', lineKind: 'pipe' },
  { id: 'chimney', label: 'Baca Çiz', behavior: 'polyline', lineKind: 'chimney' },
  { id: 'branch', label: 'Branşman Ekle', behavior: 'polyline', lineKind: 'branch' },
  { id: 'insulation', label: 'İzolasyon Ekle', behavior: 'placement', elementType: 'insulation' },
  { id: 'gasMeter', label: 'Sayaç Ekle', behavior: 'placement', elementType: 'gasMeter' },
  { id: 'manometer', label: 'Manometre Ekle', behavior: 'placement', elementType: 'manometer' },
  { id: 'serviceBox', label: 'Servis Kutusu Ekle', behavior: 'placement', elementType: 'serviceBox' },
  { id: 'filterKit', label: 'Filtre / Kit Ekle', behavior: 'placement', elementType: 'filterKit' },
  { id: 'valve', label: 'Vana Ekle', behavior: 'placement', elementType: 'valve' },
  { id: 'strainerMeter', label: 'Süzme Sayaç Ekle', behavior: 'placement', elementType: 'strainerMeter' },
  { id: 'solenoidValve', label: 'Selenoid Vana Ekle', behavior: 'placement', elementType: 'solenoidValve' },
  { id: 'ventilationDuct', label: 'Havalandırma Kanalı Çiz', behavior: 'polyline', lineKind: 'ventilationDuct' },
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
export const INSTALLATION_PIPE_TOOL_ID: InstallationToolId = 'pipe'

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

/**
 * Araç iki noktalı ölçüm aracı mı? Karşılaştırma `behavior` alanından yapılır,
 * id metninden değil: aynı anda tek araç mantığı aktif olsun diye her hook kendi
 * DAVRANIŞINI sorar (seçim aracıyla karışma riskinin panzehiri).
 */
export function isMeasurementTool(toolId: string): boolean {
  return toolDefinitions.find((candidate) => candidate.id === toolId)?.behavior === 'measurement'
}

/**
 * Araç hat çiziyorsa hangi türü, değilse null. Gaz ve deşarj araçları AYNI
 * `polyline` davranışını paylaşır (Esc/sağ tık jestleri ortak) ama farklı
 * hook'lar tarafından sürülür — bu yüzden hook'lar bu genel fonksiyonu değil,
 * aşağıdaki daraltılmış ikisini sorar.
 */
export function getLineKind(toolId: string): InstallationLineKind | null {
  const tool = toolDefinitions.find((candidate) => candidate.id === toolId)
  if (!tool || tool.behavior !== 'polyline') return null
  return tool.lineKind ?? null
}

/**
 * Boru/branşman aracı mı? `useLineTool` bunu sorar: genel `getLineKind`'e
 * baksaydı baca aracı seçildiğinde İKİ hook birden uyanır ve aynı sol tık hem
 * gaz hattı hem baca yazardı (isMeasurementTool'un "her hook kendi DAVRANIŞINI
 * sorar" gerekçesiyle aynı).
 */
export function getGasLineKind(toolId: string): InstallationLineKind | null {
  const kind = getLineKind(toolId)
  if (kind === null || isDischargeKind(kind)) return null
  return kind
}

/** Baca/havalandırma aracı mı? `useDischargeTool` bunu sorar. */
export function getDischargeLineKind(toolId: string): DischargeLineKind | null {
  const kind = getLineKind(toolId)
  if (kind === null || !isDischargeKind(kind)) return null
  return kind
}
