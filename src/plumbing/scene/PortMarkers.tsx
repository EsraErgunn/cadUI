import { DoubleSide, MeshBasicMaterial, RingGeometry } from 'three'

import { PORT_MARKER_ELEVATION_CM, SYMBOL_ELEVATION_CM } from './plumbingLayers'
import { planToThree } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import { SCENE_COLORS } from '../../scene/sceneTheme'
import { svgLocalToPlanOffset } from '../core/ports'
import type { SymbolMetadata } from '../core/symbolMetadata'

const PORT_MARKER_INNER_RADIUS_CM = 3
const PORT_MARKER_OUTER_RADIUS_CM = 5
const PORT_MARKER_SEGMENTS = 20

/**
 * Geometri ve material MODÜL DÜZEYİNDE bir kez üretilir, instance başına değil:
 * seçim her değiştiğinde yeni tampon GPU'ya gitmesin. Paylaşılan sembol
 * material'leriyle aynı ömür — uygulama boyunca yaşar, dispose EDİLMEZ.
 * Halka XY düzleminde üretilir; plan düzlemi (XZ) için bir kez yatırılır.
 */
const RING_GEOMETRY = new RingGeometry(
  PORT_MARKER_INNER_RADIUS_CM,
  PORT_MARKER_OUTER_RADIUS_CM,
  PORT_MARKER_SEGMENTS,
)
RING_GEOMETRY.rotateX(Math.PI / 2)

const RING_MATERIAL = new MeshBasicMaterial({
  color: SCENE_COLORS.selection,
  // Yatırılan halkanın ön yüzü aşağı bakıyor; tepeden bakan kamera arkasını görür.
  side: DoubleSide,
  depthWrite: false,
  toneMapped: false,
})

type PortMarkersProps = {
  metadata: SymbolMetadata
  /** Elemanın ölçeği: işaretin boyu sembolle birlikte büyümesin diye geri alınır. */
  scale: number
}

/**
 * Seçili elemanın portları. Sembol grubunun İÇİNDE durur: port ofsetleri yerel
 * koordinatta olduğu için dönme/ölçek/sürükleme grup dönüşümünden gelir ve
 * getPortWorldPosition'ın hesabıyla aynı sonucu verir (R2).
 */
export function PortMarkers({ metadata, scale }: PortMarkersProps) {
  // Grubun ölçeği çocuklara da uygulanıyor; yükseklik farkı dünya ölçüsünde
  // sabit kalsın diye ölçeğe bölünür.
  const elevationCm = (PORT_MARKER_ELEVATION_CM - SYMBOL_ELEVATION_CM) / scale

  // TODO(tesisat): bağlantı verisi Aşama 6'da gelince DOLU portlar içi dolu daire
  // olacak (ayrım yalnız renkle yapılmayacak); bağlantı yokken hepsi boş halka.
  return (
    <group name="port-markers">
      {metadata.ports.map((port) => (
        <mesh
          key={port.id}
          geometry={RING_GEOMETRY}
          material={RING_MATERIAL}
          position={planToThree(svgLocalToPlanOffset(port.position, metadata.origin, 1), elevationCm)}
          scale={1 / scale}
          renderOrder={RENDER_ORDER.portMarker}
          raycast={() => null}
        />
      ))}
    </group>
  )
}
