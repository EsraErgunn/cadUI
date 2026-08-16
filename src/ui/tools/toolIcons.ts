import {
  AppWindow,
  BellRing,
  Blinds,
  BrickWall,
  ChartNoAxesColumnIncreasing,
  CircleDot,
  Columns3,
  Cylinder,
  DoorOpen,
  Eraser,
  FireExtinguisher,
  Lightbulb,
  MousePointer2,
  PanelTop,
  PencilLine,
  RectangleHorizontal,
  Ruler,
  Square,
  Type,
  Wind,
  ZapOff,
  type LucideIcon,
} from 'lucide-react'

import type { ToolId } from '../../core/tools'

/**
 * Record olduğu için araçların hepsine ikon vermek ZORUNLU: core/tools.ts'e yeni
 * araç eklenip buraya eklenmezse derleme kırılır, sessizce boş kutu çıkmaz.
 * Bazı CAD'e özgü araçların lucide'da birebir karşılığı yok, en yakını seçildi.
 */
export const TOOL_ICONS: Record<ToolId, LucideIcon> = {
  selection: MousePointer2,
  mainCutoffSwitch: ZapOff,
  drawWall: BrickWall,
  panel: PanelTop,
  drawRoom: Square,
  lighting: Lightbulb,
  door: DoorOpen,
  fireExtinguisher: FireExtinguisher,
  window: AppWindow,
  eraser: Eraser,
  stairs: ChartNoAxesColumnIncreasing,
  structuralColumn: Columns3,
  text: Type,
  beam: RectangleHorizontal,
  measure: Ruler,
  vent: Blinds,
  freeDraw: PencilLine,
  columnVentilation: Wind,
  alarmDevice: BellRing,
  earthquakeSensor: CircleDot,
  flueShaft: Cylinder,
}
