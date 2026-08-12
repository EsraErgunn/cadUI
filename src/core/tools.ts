export type ToolDefinition = {
  id: string
  /** Tooltip ve durum çubuğunda görünen ad (KK-7, KK-8). */
  label: string
}

/**
 * Mimari Tasarım paletindeki 22 araç, issue 2.7'deki sırayla.
 * Kimlikler burada (core) duruyor çünkü hem ui/ hem scene/ okuyacak;
 * eslint ui/ ↔ scene/ importunu engelliyor, ortak nokta core.
 */
export const ARCHITECTURE_TOOLS = [
  { id: 'selection', label: 'Seçim Aracı' },
  { id: 'mainCutoffSwitch', label: 'Ana Kesme Şalteri Ekle' },
  { id: 'drawWall', label: 'Duvar Çiz' },
  { id: 'panel', label: 'Pano Ekle' },
  { id: 'drawRoom', label: 'Oda Çiz' },
  { id: 'lighting', label: 'Aydınlatma Ekle' },
  { id: 'door', label: 'Kapı Ekle' },
  { id: 'fireExtinguisher', label: 'Yangın Söndürücü Ekle' },
  { id: 'window', label: 'Pencere Ekle' },
  { id: 'eraser', label: 'Silgi' },
  { id: 'stairs', label: 'Merdiven Ekle' },
  { id: 'bulkDelete', label: 'Toplu Silme' },
  // Yapısal kolon — gaz kolonu (Riser) DEĞİL. İkisi de "kolon" diye anılıyor.
  { id: 'structuralColumn', label: 'Kolon Ekle' },
  { id: 'text', label: 'Metin Ekle' },
  { id: 'beam', label: 'Kiriş Ekle' },
  { id: 'measure', label: 'Ölçüm' },
  { id: 'vent', label: 'Menfez Ekle' },
  { id: 'freeDraw', label: 'Serbest Çizim Araçları' },
  { id: 'columnVentilation', label: 'Kolon Havalandırması Ekle' },
  { id: 'alarmDevice', label: 'Alarm Cihazı Ekle' },
  { id: 'earthquakeSensor', label: 'Deprem Sensörü Ekle' },
  { id: 'flueShaft', label: 'Baca Şaftı Ekle' },
] as const satisfies readonly ToolDefinition[]

export type ToolId = (typeof ARCHITECTURE_TOOLS)[number]['id']

export const DEFAULT_TOOL_ID: ToolId = 'selection'

// Araç hook'ları aktif aracı bu sabitlerle karşılaştırır; id metni tek yerde durur.
export const SELECTION_TOOL_ID: ToolId = 'selection'
export const WALL_TOOL_ID: ToolId = 'drawWall'
export const ROOM_TOOL_ID: ToolId = 'drawRoom'
export const DOOR_TOOL_ID: ToolId = 'door'
export const WINDOW_TOOL_ID: ToolId = 'window'
export const ERASER_TOOL_ID: ToolId = 'eraser'
export const BEAM_TOOL_ID: ToolId = 'beam'

export function getToolLabel(toolId: ToolId): string {
  const tool = ARCHITECTURE_TOOLS.find((candidate) => candidate.id === toolId)
  return tool?.label ?? ''
}
