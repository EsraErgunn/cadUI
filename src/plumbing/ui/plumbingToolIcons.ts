import {
  Box,
  Disc3,
  Factory,
  FunnelPlus,
  Gauge,
  GitBranch,
  Layers,
  MousePointer2,
  Route,
  Ruler,
  SlidersHorizontal,
  SquareActivity,
  Timer,
  ToggleRight,
  Wind,
  type LucideIcon,
} from 'lucide-react'

import { StoveIcon } from './StoveIcon'
import type { InstallationToolId } from '../core/installationTools'

/**
 * Record olduğu için 16 aracın hepsine ikon vermek ZORUNLU — eksik ikon derlemede
 * yakalanır (mimari paletle aynı desen). Kurulu lucide sürümünde `Filter` yok
 * (yeni adı Funnel); filterKit için en yakın var olan ikon FunnelPlus seçildi.
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
  measurement: Ruler,
}
