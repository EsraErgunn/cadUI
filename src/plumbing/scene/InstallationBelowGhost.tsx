import { Line } from '@react-three/drei'

import { getLineWidthPx } from './lineStyle'
import { INSTALLATION_BELOW_GHOST_ELEVATION_CM } from './plumbingLayers'
import { useCameraZoom } from './useCameraZoom'
import { planToThree } from '../../core/coords'
import { getFloorBelowId } from '../../core/floors'
import { ARCHITECTURE_COLORS } from '../../scene/architectureTheme'
import { RENDER_ORDER } from '../../scene/layers'
import { useCadStore } from '../../store/cadStore'
import type { InstallationLine } from '../core/installationModel'

function GhostPipeLine({ line, zoom }: { line: InstallationLine; zoom: number }) {
  if (line.points.length < 2) return null

  return (
    <Line
      points={line.points.map((point) => planToThree(point.position, INSTALLATION_BELOW_GHOST_ELEVATION_CM))}
      color={ARCHITECTURE_COLORS.floorBelowGhost}
      lineWidth={getLineWidthPx(line.pipeTypeName, zoom)}
      alphaToCoverage
      frustumCulled={false}
      renderOrder={RENDER_ORDER.installationBelowGhost}
      depthWrite={false}
      // Alt kat SEÇİLEMEZ (KK-13): salt hizalama referansı — FloorBelowGhost ile aynı kural.
      raycast={() => null}
      toneMapped={false}
    />
  )
}

/**
 * Tesisat görünümünde aktif katın ALTINDAKİ katın boru güzergâhının soluk izi
 * (kullanıcı isteği, 2026-08: "mimaride nasılsa öyle yap") — `scene/FloorBelowGhost.tsx`
 * ile BİREBİR aynı desen: yalnız bir kat aşağı (yukarı YOK, mimariyle aynı
 * kısıtlama), yalnız hizalamaya yarayan geometri (borular — mimarideki
 * duvar/açıklık karşılığı), eleman/sembol/armatür ÇİZİLMEZ (mimaride oda/kiriş/
 * alan nesnesi de çizilmediği gibi), tek soluk düz renk (çap renklerinden
 * BAĞIMSIZ — ArchitectureGhost/InstallationGhost'un "rengi koru, saydamlaştır"
 * yönteminden FARKLI, çünkü bu ayna katman değil karşı KAT: `ARCHITECTURE_COLORS
 * .floorBelowGhost` ile AYNI ton kullanılıyor).
 */
export function InstallationBelowGhost() {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const lines = useCadStore((state) => state.installationLines)
  const zoom = useCameraZoom()

  const floorBelowId = getFloorBelowId(floors, activeFloorId)
  if (floorBelowId === undefined) return null

  return (
    <group name="installation-below-ghost">
      {lines
        .filter((line) => line.floorId === floorBelowId)
        .map((line) => (
          <GhostPipeLine key={line.id} line={line} zoom={zoom} />
        ))}
    </group>
  )
}
