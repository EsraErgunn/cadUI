import {
  Box,
  Disc3,
  Droplets,
  Factory,
  Flame,
  FlameKindling,
  FunnelPlus,
  Gauge,
  GitBranch,
  Heater,
  Layers,
  MousePointer2,
  Route,
  Ruler,
  SlidersHorizontal,
  SquareActivity,
  Thermometer,
  Timer,
  ToggleRight,
  Wind,
  type LucideIcon,
} from 'lucide-react'

import { StoveIcon } from './StoveIcon'
import type { InstallationToolId } from '../core/installationTools'

/**
 * Record olduğu için her aracın ikonu ZORUNLU — eksik ikon derlemede yakalanır
 * (mimari paletle aynı desen). Kurulu lucide sürümünde `Filter` yok (yeni adı
 * Funnel); filterKit için en yakın var olan ikon FunnelPlus seçildi.
 * `stove` istisna: lucide'da "4 gözlü ocak" karşılığı yok, StoveIcon.tsx özel çizildi.
 */
export const INSTALLATION_TOOL_ICONS: Record<InstallationToolId, LucideIcon> = {
  selection: MousePointer2,
  regulator: SlidersHorizontal,
  pipe: Route,
  chimney: Factory,
  branch: GitBranch,
  insulation: Layers,
  gasMeter: Timer,
  manometer: Gauge,
  serviceBox: Box,
  filterKit: FunnelPlus,
  valve: Disc3,
  strainerMeter: SquareActivity,
  solenoidValve: ToggleRight,
  ventilationDuct: Wind,
  stove: StoveIcon,
  spaceHeater: Heater,
  waterHeater: Droplets,
  combiBoiler: Thermometer,
  boiler: Flame,
  otherAppliance: FlameKindling,
  measurement: Ruler,
}
