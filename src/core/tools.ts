export type ToolDefinition = {
  id: string
  /** Tooltip ve durum çubuğunda görünen ad (KK-7, KK-8). */
  label: string
  /**
   * Palette DURAN ama henüz yazılmamış araç (K79). Düğmesi pasif çıkar:
   * tıklanabilir görünüp hiçbir şey yapmayan bir araç, kullanıcıya "bozuk"
   * dedirtir — "henüz yok" demek dürüst olan.
   */
  isPlanned?: true
}

export type ToolGroup = {
  id: string
  /** Ekran okuyucu bu adı duyar; ekranda yalnız ayraç çizgisi görünür. */
  label: string
  tools: readonly ToolDefinition[]
}

/**
 * Mimari Tasarım paleti, İŞE göre gruplanmış (K82). Issue 2.7'deki düz sıra
 * bırakıldı: o sıra iki sütuna dizilince duvarla pano, kapıyla yangın
 * söndürücü yan yana düşüyordu — kullanıcı aradığı aracı sırayla değil
 * TÜRÜNE göre arıyor.
 *
 * Kimlikler burada (core) duruyor çünkü hem ui/ hem scene/ okuyacak;
 * eslint ui/ ↔ scene/ importunu engelliyor, ortak nokta core.
 *
 * "Toplu Silme" listeden ÇIKARILDI (K79): işi zaten var — çerçeveyle çoklu
 * seçim + Delete, hem de tek adımda (`useSelectionTool`, `selectionOps`).
 */
/**
 * Seçim aracı PALETTE YOK (K83): aynı kip tuvalin altındaki yüzen çubukta
 * zaten var (K54) ve orada El aracıyla yan yana duruyor — sol tuşun ne
 * yapacağını söyleyen iki düğme aynı yerde olmalı. İki palette birden
 * durduğunda kullanıcı hangisinin "asıl" olduğunu bilemiyordu.
 *
 * Yine de bir ARAÇ: varsayılan odur, durum çubuğu adını yazar ve bütün seçim
 * hook'ları `SELECTION_TOOL_ID` ile ona bakar. Bu yüzden tanımı duruyor,
 * yalnız paletin gruplarına girmiyor.
 */
const SELECTION_TOOL = { id: 'selection', label: 'Seçim Aracı' } as const

/**
 * Eksene göre aynalama da PALETTE YOK: özellik panelindeki düğmeden açılıyor ve
 * yalnız bir seçim varken anlamlı. Yine de gerçek bir ARAÇ, çünkü jesti
 * sahiplenmesinin en ucuz temiz yolu bu — bütün seçim/çizim hook'ları zaten
 * `activeToolId`ye bakıp kendi jestlerinden çekiliyor. Alternatifi, her birine
 * tek tek "aynalama bekliyorsa dur" kontrolü eklemekti (K44 dersinin pahalı hâli).
 */
const MIRROR_AXIS_TOOL = { id: 'mirrorAxis', label: 'Eksene Göre Aynala' } as const

export const ARCHITECTURE_TOOL_GROUPS = [
  {
    id: 'shell',
    label: 'Kabuk',
    tools: [
      { id: 'drawWall', label: 'Duvar Çiz' },
      { id: 'drawRoom', label: 'Oda Çiz' },
      { id: 'door', label: 'Kapı Ekle' },
      { id: 'window', label: 'Pencere Ekle' },
    ],
  },
  {
    id: 'structure',
    label: 'Yapı elemanları',
    tools: [
      { id: 'stairs', label: 'Merdiven Ekle' },
      // Yapısal kolon — gaz kolonu (Riser) DEĞİL. İkisi de "kolon" diye anılıyor.
      { id: 'structuralColumn', label: 'Kolon Ekle' },
      { id: 'beam', label: 'Kiriş Ekle' },
      { id: 'columnVentilation', label: 'Kolon Havalandırması Ekle' },
      { id: 'flueShaft', label: 'Baca Şaftı Ekle' },
    ],
  },
  {
    id: 'devices',
    label: 'Cihazlar',
    tools: [
      { id: 'lighting', label: 'Aydınlatma Ekle' },
      { id: 'panel', label: 'Pano Ekle' },
      { id: 'vent', label: 'Menfez Ekle' },
      { id: 'mainCutoffSwitch', label: 'Ana Kesme Şalteri Ekle' },
      { id: 'fireExtinguisher', label: 'Yangın Söndürücü Ekle' },
      { id: 'alarmDevice', label: 'Alarm Cihazı Ekle' },
      { id: 'earthquakeSensor', label: 'Deprem Sensörü Ekle' },
    ],
  },
  {
    // Not ve yardımcılar: hiçbiri binanın parçasını çizmiyor — ölçü okur, not
    // düşer, siler. Silgi de buraya: yapı elemanı eklemiyor, kaldırıyor.
    id: 'annotation',
    label: 'Notlar ve yardımcılar',
    tools: [
      { id: 'measure', label: 'Ölçüm' },
      { id: 'text', label: 'Metin Ekle' },
      { id: 'freeDraw', label: 'Serbest Çizim Araçları', isPlanned: true },
      { id: 'eraser', label: 'Silgi' },
    ],
  },
] as const satisfies readonly ToolGroup[]

type ArchitectureTool =
  | typeof SELECTION_TOOL
  | typeof MIRROR_AXIS_TOOL
  | (typeof ARCHITECTURE_TOOL_GROUPS)[number]['tools'][number]

/**
 * VAR OLAN araçların tamamı — palettekiler + palette görünmeyen seçim aracı.
 * Kimlik türeten (`ToolId`), ikon zorlayan (`TOOL_ICONS`) ve ad çözen
 * (`getToolLabel`) taraflar bunu okur; gruplar yalnız YERLEŞİM bilgisidir.
 *
 * Dönüş tipi ELLE yazıldı: `flatMap` demet (tuple) tiplerini birleştirirken
 * genişletiyor ve `ToolId` string'e düşüyordu — o zaman "olmayan araç kimliği"
 * derleme hatası vermezdi.
 */
export const ARCHITECTURE_TOOLS: readonly ArchitectureTool[] = [
  SELECTION_TOOL,
  MIRROR_AXIS_TOOL,
  ...ARCHITECTURE_TOOL_GROUPS.flatMap((group) => group.tools as readonly ArchitectureTool[]),
]

export type ToolId = ArchitectureTool['id']

export const DEFAULT_TOOL_ID: ToolId = 'selection'

// Araç hook'ları aktif aracı bu sabitlerle karşılaştırır; id metni tek yerde durur.
export const SELECTION_TOOL_ID: ToolId = 'selection'
export const WALL_TOOL_ID: ToolId = 'drawWall'
export const ROOM_TOOL_ID: ToolId = 'drawRoom'
export const DOOR_TOOL_ID: ToolId = 'door'
export const WINDOW_TOOL_ID: ToolId = 'window'
export const ERASER_TOOL_ID: ToolId = 'eraser'
export const BEAM_TOOL_ID: ToolId = 'beam'
export const TEXT_TOOL_ID: ToolId = 'text'
export const MEASURE_TOOL_ID: ToolId = 'measure'
export const MIRROR_AXIS_TOOL_ID: ToolId = 'mirrorAxis'

export function getToolLabel(toolId: ToolId): string {
  const tool = ARCHITECTURE_TOOLS.find((candidate) => candidate.id === toolId)
  return tool?.label ?? ''
}
