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

export type InstallationToolGroup = {
  id: string
  /** Ekran okuyucu bu adı duyar; ekranda yalnız ayraç çizgisi görünür. */
  label: string
  tools: readonly InstallationToolDefinition[]
}

/**
 * Seçim aracı PALETTE YOK — mimarideki K83 kararının aynısı: aynı kip tuvalin
 * altındaki yüzen çubukta El aracıyla yan yana duruyor ve sol tuşun ne
 * yapacağını söyleyen düğmeler tek yerde olmalı.
 *
 * Yine de bir ARAÇ: varsayılan odur, hook'lar `INSTALLATION_SELECTION_TOOL_ID`
 * ile ona bakar. Tanımı bu yüzden duruyor, yalnız gruplara girmiyor.
 */
const SELECTION_TOOL = { id: 'selection', label: 'Seçim Aracı', behavior: 'selection' } as const

/**
 * Tesisat paleti, İŞE göre gruplanmış (mimarideki K82'nin karşılığı). Plan Bölüm
 * 10'un düz sırası bırakıldı: iki sütuna serilince boruyla izolasyon, sayaçla
 * manometre yan yana düşüyordu — kullanıcı aradığı aracı sırayla değil TÜRÜNE
 * göre arıyor.
 *
 * Grup sırası gazın yolunu izler: servis kutusundan girer, hat çizilir, hattın
 * üstüne armatür oturur, ucunda cihaz yanar. Elemanın hangi gruba düştüğü
 * `attachModes.ts`'teki tutunma kipiyle uyumlu (free/lineEnd · onLine ·
 * nearestLine) — kullanıcının gördüğü ayrım ile kodun davranış ayrımı ayrışmasın.
 *
 * Yakıcı cihazlarda ortak davranış aynı: tek gaz girişi, cihaz üzerinde vana yok
 * (doküman § 15, bkz. docs/kararlar.md).
 */
export const INSTALLATION_TOOL_GROUPS = [
  {
    id: 'supply',
    label: 'Besleme ve ölçüm',
    tools: [
      { id: 'serviceBox', label: 'Servis Kutusu Ekle', behavior: 'placement', elementType: 'serviceBox' },
      { id: 'regulator', label: 'Regülatör Ekle', behavior: 'placement', elementType: 'regulator' },
      { id: 'gasMeter', label: 'Sayaç Ekle', behavior: 'placement', elementType: 'gasMeter' },
      { id: 'strainerMeter', label: 'Süzme Sayaç Ekle', behavior: 'placement', elementType: 'strainerMeter' },
    ],
  },
  {
    id: 'lines',
    label: 'Hatlar',
    tools: [
      { id: 'pipe', label: 'Boru Ekle', behavior: 'polyline', lineKind: 'pipe' },
      { id: 'branch', label: 'Branşman Ekle', behavior: 'polyline', lineKind: 'branch' },
      // Baca ve havalandırma da hat: eleman değil, cihazın deşarj güzergâhı.
      { id: 'chimney', label: 'Baca Çiz', behavior: 'polyline', lineKind: 'chimney' },
      { id: 'ventilationDuct', label: 'Havalandırma Kanalı Çiz', behavior: 'polyline', lineKind: 'ventilationDuct' },
    ],
  },
  {
    id: 'fittings',
    label: 'Armatürler',
    tools: [
      { id: 'valve', label: 'Vana Ekle', behavior: 'placement', elementType: 'valve' },
      { id: 'solenoidValve', label: 'Selenoid Vana Ekle', behavior: 'placement', elementType: 'solenoidValve' },
      { id: 'manometer', label: 'Manometre Ekle', behavior: 'placement', elementType: 'manometer' },
      { id: 'filterKit', label: 'Filtre / Kit Ekle', behavior: 'placement', elementType: 'filterKit' },
      { id: 'insulation', label: 'İzolasyon Ekle', behavior: 'placement', elementType: 'insulation' },
    ],
  },
  {
    id: 'appliances',
    label: 'Yakıcı cihazlar',
    tools: [
      { id: 'stove', label: 'Ocak Ekle', behavior: 'placement', elementType: 'stove' },
      { id: 'spaceHeater', label: 'Soba Ekle', behavior: 'placement', elementType: 'spaceHeater' },
      { id: 'waterHeater', label: 'Şofben Ekle', behavior: 'placement', elementType: 'waterHeater' },
      { id: 'combiBoiler', label: 'Kombi Ekle', behavior: 'placement', elementType: 'combiBoiler' },
      { id: 'boiler', label: 'Kazan Ekle', behavior: 'placement', elementType: 'boiler' },
      { id: 'otherAppliance', label: 'Diğer Yakıcı Cihaz Ekle', behavior: 'placement', elementType: 'otherAppliance' },
    ],
  },
  {
    // Tesisatın hiçbir parçasını çizmeyen yardımcılar; bugün tek üye ölçüm.
    id: 'annotation',
    label: 'Notlar ve yardımcılar',
    tools: [{ id: 'measurement', label: 'Ölçüm', behavior: 'measurement' }],
  },
] as const satisfies readonly InstallationToolGroup[]

type InstallationTool =
  | typeof SELECTION_TOOL
  | (typeof INSTALLATION_TOOL_GROUPS)[number]['tools'][number]

/**
 * VAR OLAN araçların tamamı — palettekiler + palette görünmeyen seçim aracı.
 * Kimlik türeten (`InstallationToolId`), ikon zorlayan (`INSTALLATION_TOOL_ICONS`)
 * ve davranış çözen fonksiyonlar bunu okur; gruplar yalnız YERLEŞİM bilgisidir.
 *
 * Dönüş tipi ELLE yazıldı: `flatMap` demet (tuple) tiplerini birleştirirken
 * genişletiyor ve `InstallationToolId` string'e düşüyordu — o zaman "olmayan
 * araç kimliği" derleme hatası vermezdi (core/tools.ts'teki aynı tuzak).
 */
export const INSTALLATION_TOOLS: readonly InstallationTool[] = [
  SELECTION_TOOL,
  ...INSTALLATION_TOOL_GROUPS.flatMap((group) => group.tools as readonly InstallationTool[]),
]

export type InstallationToolId = InstallationTool['id']

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
