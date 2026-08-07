import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { CircleGeometry, DoubleSide, MeshBasicMaterial, RingGeometry, type Mesh } from 'three'

import { PORT_MARKER_ELEVATION_CM, SYMBOL_ELEVATION_CM } from './plumbingLayers'
import { getLoadedSymbol } from './symbolLoader'
import type { LineToolState } from './useLineTool'
import { planToThree } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import { SCENE_COLORS } from '../../scene/sceneTheme'
import { useCadStore } from '../../store/cadStore'
import type { InstallationElement } from '../core/installationModel'
import { isPortOccupied } from '../core/portSnap'
import { svgLocalToPlanOffset } from '../core/ports'
import type { SymbolMetadata } from '../core/symbolMetadata'

const PORT_MARKER_INNER_RADIUS_CM = 3
const PORT_MARKER_OUTER_RADIUS_CM = 5
const PORT_MARKER_SEGMENTS = 20
/** Yakalanan portun halkası: altındaki işaretin dışından okunmalı. */
const PORT_HIGHLIGHT_OUTER_RADIUS_CM = 8

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

/** Dolu port İÇİ DOLU çizilir: ayrım yalnız renge bırakılmaz (erişilebilirlik). */
const DISC_GEOMETRY = new CircleGeometry(PORT_MARKER_OUTER_RADIUS_CM, PORT_MARKER_SEGMENTS)
DISC_GEOMETRY.rotateX(Math.PI / 2)

const HIGHLIGHT_GEOMETRY = new RingGeometry(
  PORT_MARKER_OUTER_RADIUS_CM,
  PORT_HIGHLIGHT_OUTER_RADIUS_CM,
  PORT_MARKER_SEGMENTS,
)
HIGHLIGHT_GEOMETRY.rotateX(Math.PI / 2)

/** Borunun üstündeki ayırma noktası: halka değil DOLU nokta — "buraya bağlan"
 *  değil "boruyu burada ayır" demek. */
const SPLIT_DOT_GEOMETRY = new CircleGeometry(PORT_MARKER_OUTER_RADIUS_CM, PORT_MARKER_SEGMENTS)
SPLIT_DOT_GEOMETRY.rotateX(Math.PI / 2)

function createMarkerMaterial(color: string) {
  return new MeshBasicMaterial({
    color,
    // Yatırılan halkanın ön yüzü aşağı bakıyor; tepeden bakan kamera arkasını görür.
    side: DoubleSide,
    depthWrite: false,
    toneMapped: false,
  })
}

const FREE_MATERIAL = createMarkerMaterial(SCENE_COLORS.selection)
/** Dolu port "kapalı": mavi değil nötr — tıklanacak bir hedef değil. */
const OCCUPIED_MATERIAL = createMarkerMaterial(SCENE_COLORS.wallFill)
const HIGHLIGHT_MATERIAL = createMarkerMaterial(SCENE_COLORS.snapMarker)

type PortMarkersProps = {
  metadata: SymbolMetadata
  /** Elemanın ölçeği: işaretin boyu sembolle birlikte büyümesin diye geri alınır. */
  scale: number
  /** Bu elemanın dolu portları; boş bırakılırsa hepsi boş kabul edilir. */
  occupiedPortIds?: readonly string[]
}

/**
 * Seçili elemanın portları. Sembol grubunun İÇİNDE durur: port ofsetleri yerel
 * koordinatta olduğu için dönme/ölçek/sürükleme grup dönüşümünden gelir ve
 * getPortWorldPosition'ın hesabıyla aynı sonucu verir (R2).
 */
export function PortMarkers({ metadata, scale, occupiedPortIds = [] }: PortMarkersProps) {
  // Grubun ölçeği çocuklara da uygulanıyor; yükseklik farkı dünya ölçüsünde
  // sabit kalsın diye ölçeğe bölünür.
  const elevationCm = (PORT_MARKER_ELEVATION_CM - SYMBOL_ELEVATION_CM) / scale

  return (
    <group name="port-markers">
      {metadata.ports.map((port) => {
        const isOccupied = occupiedPortIds.includes(port.id)
        return (
          <mesh
            key={port.id}
            geometry={isOccupied ? DISC_GEOMETRY : RING_GEOMETRY}
            material={isOccupied ? OCCUPIED_MATERIAL : FREE_MATERIAL}
            position={planToThree(
              svgLocalToPlanOffset(port.position, metadata.origin, 1),
              elevationCm,
            )}
            scale={1 / scale}
            renderOrder={RENDER_ORDER.portMarker}
            raycast={() => null}
          />
        )
      })}
    </group>
  )
}

/** Elemanın portlarını sembol grubu DIŞINDA, dünya koordinatında çizen sarmalayıcı. */
function ElementPortMarkers({
  element,
  occupiedPortIds,
}: {
  element: InstallationElement
  occupiedPortIds: readonly string[]
}) {
  const metadata = getLoadedSymbol(element.type).metadata

  return (
    <group
      position={planToThree(element.position, SYMBOL_ELEVATION_CM)}
      rotation={[0, (element.angleDeg * Math.PI) / 180, 0]}
      scale={element.scale}
    >
      <PortMarkers metadata={metadata} scale={element.scale} occupiedPortIds={occupiedPortIds} />
    </group>
  )
}

/**
 * Hat çizerken bağlanılabilecek noktaların tamamı görünür; imlecin yakaladığı
 * hedef ayrıca vurgulanır. Vurgu React durumu DEĞİL: imleç her kıpırdadığında
 * ağaç yeniden kurulmasın diye konum ve biçim useFrame'de doğrudan mesh'e yazılır.
 *
 * İki vurgu biçimi var çünkü iki farklı iş yapılıyor: PORT halkası "buraya
 * bağlan" der, BORU üstündeki dolu nokta "boruyu burada ayır" der.
 *
 * Aktif kattaki TÜM elemanların portları mount edilir (yalnız imlece yakın
 * olanlar değil): eleman sayısı onlarla ölçülüyor, geometri/material paylaşılıyor
 * ve yakınlık her karede yeniden hesaplansaydı mount/unmount dalgalanırdı.
 * Eleman sayısı yüzleri geçerse önce burası daraltılır (Bölüm 15, spatial index).
 */
export function DrawingPortMarkers({ kind, snapRef }: LineToolState) {
  const elements = useCadStore((state) => state.installationElements)
  const connections = useCadStore((state) => state.installationConnections)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const portHighlightRef = useRef<Mesh>(null)
  const lineHighlightRef = useRef<Mesh>(null)

  useFrame(() => {
    const portMesh = portHighlightRef.current
    const lineMesh = lineHighlightRef.current
    if (!portMesh || !lineMesh) return

    const snap = snapRef.current
    portMesh.visible = snap?.kind === 'port'
    lineMesh.visible = snap?.kind === 'line'
    if (!snap) return

    const target = snap.kind === 'port' ? portMesh : lineMesh
    target.position.set(...planToThree(snap.position, PORT_MARKER_ELEVATION_CM))
  })

  if (kind === null) return null

  return (
    <group name="drawing-port-markers">
      {elements
        .filter((element) => element.floorId === activeFloorId)
        .map((element) => (
          <ElementPortMarkers
            key={element.id}
            element={element}
            occupiedPortIds={getLoadedSymbol(element.type)
              .metadata.ports.filter((port) => isPortOccupied(connections, element.id, port.id))
              .map((port) => port.id)}
          />
        ))}

      <mesh
        ref={portHighlightRef}
        visible={false}
        geometry={HIGHLIGHT_GEOMETRY}
        material={HIGHLIGHT_MATERIAL}
        renderOrder={RENDER_ORDER.portMarker}
        raycast={() => null}
      />

      <mesh
        ref={lineHighlightRef}
        visible={false}
        geometry={SPLIT_DOT_GEOMETRY}
        material={HIGHLIGHT_MATERIAL}
        renderOrder={RENDER_ORDER.portMarker}
        raycast={() => null}
      />
    </group>
  )
}
