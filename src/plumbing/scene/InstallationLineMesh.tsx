import { Line } from '@react-three/drei'
import { useMemo, type ComponentRef, type RefObject } from 'react'
import { CircleGeometry, DoubleSide, MeshBasicMaterial, RingGeometry } from 'three'

import { getLineColor, getLineWidthPx, toWidthCm } from './lineStyle'
import {
  INSTALLATION_GHOST_ELEVATION_CM,
  LINE_ELEVATION_CM,
  LINE_END_MARKER_LIFT_CM,
} from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { GHOST_OPACITY } from './symbolLoader'
import { useCameraZoom } from './useCameraZoom'
import { planToThree, type PlanPoint, type ThreePosition } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import { SCENE_COLORS } from '../../scene/sceneTheme'
import { useCadStore } from '../../store/cadStore'
import type { InstallationConnection, InstallationLine } from '../core/installationModel'
import { isLineEndConnected } from '../core/portSnap'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/** Hat tıklanabilir değil: tesisat tutması ışınla değil saf geometriyle yapılıyor. */
const LINE_MESH_PROPS = { raycast: () => null }

/**
 * Uç işaretleri birim yarıçapla üretilir, her hatta çapına göre ölçeklenir:
 * hat kalınlaştıkça işaret de büyür, tek geometri paylaşılır.
 */
const END_MARKER_SEGMENTS = 16
const CONNECTED_DISC_GEOMETRY = new CircleGeometry(1, END_MARKER_SEGMENTS)
CONNECTED_DISC_GEOMETRY.rotateX(Math.PI / 2)
const FREE_RING_GEOMETRY = new RingGeometry(0.55, 1, END_MARKER_SEGMENTS)
FREE_RING_GEOMETRY.rotateX(Math.PI / 2)

/** Bağlı uç dolu daire, serbest uç içi boş halka — ayrım yalnız renkle yapılmaz. */
const CONNECTED_MARKER_SCALE = 0.55
const FREE_MARKER_SCALE = 0.9

/** `ghost` = mimari görünümdeki soluk iz. */
export type LineTone = 'normal' | 'ghost'

type InstallationLineMeshProps = {
  line: InstallationLine
  /** Kalınlık zoom'a bağlı; kapsayıcı bir kez okur (bkz. useCameraZoom). */
  zoom: number
  connections?: readonly InstallationConnection[]
  isSelected?: boolean
  tone?: LineTone
}

/** Kesikli çizginin dünya birimindeki desen boyu — piksel değil, ekranı sabit taramasın. */
const DASH_SIZE_CM = 8
const DASH_GAP_CM = 6

type PipeLineProps = {
  positions: ThreePosition[]
  colorHex: string
  /** EKRAN pikseli — dünya birimi değil, gerekçesi lineStyle.ts'te. */
  widthPx: number
  renderOrder: number
  isGhost?: boolean
  /** Cihaz kolu gibi boru OLMAYAN bağlantılar kesikli çizilir. */
  isDashed?: boolean
  /** Ref YALNIZ lastik bandın ihtiyacı; köşeleri her karede tampona yazılıyor. */
  lineRef?: RefObject<ComponentRef<typeof Line> | null>
}

/**
 * Boru çizgisinin TEK çizim yolu: yerleşmiş hat da, çizim önizlemesi de buradan
 * geçer. İkisi ayrı ayrı kurulsaydı bir prop birinde unutulur ve önizleme
 * yerleşmiş hattan farklı (ör. daha ince) görünürdü.
 *
 * Hat = yuvarlak uçlu kalın çizgi. Duvardan farklı olarak `worldUnits` KULLANMAZ:
 * o shader yolu ortografik kamerada ekran kenarlarına doğru inceltiyor
 * (bkz. lineStyle.ts). Kalınlık `çap × zoom` ile piksel cinsinden veriliyor.
 */
export function PipeLine({
  positions,
  colorHex,
  widthPx,
  renderOrder,
  isGhost = false,
  isDashed = false,
  lineRef,
}: PipeLineProps) {
  return (
    <Line
      ref={lineRef}
      points={positions}
      color={colorHex}
      lineWidth={widthPx}
      dashed={isDashed}
      dashSize={DASH_SIZE_CM}
      gapSize={DASH_GAP_CM}
      // Kenar yumuşatma örtme maskesiyle: kapatılırsa yuvarlak uçlar tırtıklanır.
      alphaToCoverage
      // Çizgi geometrinin sınırlarını taştığı için kırpma kapalı (Wall.tsx ile aynı).
      frustumCulled={false}
      renderOrder={renderOrder}
      depthWrite={false}
      toneMapped={false}
      transparent={isGhost}
      opacity={isGhost ? GHOST_OPACITY : 1}
      {...LINE_MESH_PROPS}
    />
  )
}

type LineEndMarkerProps = {
  position: PlanPoint
  widthCm: number
  isConnected: boolean
  colorHex: string
}

/**
 * Hattın ucu bağlı mı serbest mi (KK-7). Material instance başına üretiliyor
 * çünkü renk çaptan geliyor; geometri paylaşılıyor ve mount başına dispose
 * gerektirmiyor (React unmount'ta material'i R3F bırakır).
 */
function LineEndMarker({ position, widthCm, isConnected, colorHex }: LineEndMarkerProps) {
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: colorHex,
        // Yatırılan halkanın ön yüzü aşağı bakıyor; tepeden bakan kamera arkasını görür.
        side: DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [colorHex],
  )

  return (
    <mesh
      geometry={isConnected ? CONNECTED_DISC_GEOMETRY : FREE_RING_GEOMETRY}
      material={material}
      position={planToThree(position, LINE_ELEVATION_CM + LINE_END_MARKER_LIFT_CM)}
      scale={widthCm * (isConnected ? CONNECTED_MARKER_SCALE : FREE_MARKER_SCALE)}
      renderOrder={RENDER_ORDER.fitting}
      raycast={() => null}
    />
  )
}

/** Renk ÇAPTAN gelir (K-W2); seçiliyken maviye döner — seçim rengi tek yerden. */
export function InstallationLineMesh({
  line,
  zoom,
  connections = [],
  isSelected = false,
  tone = 'normal',
}: InstallationLineMeshProps) {
  const isGhost = tone === 'ghost'
  const isApplianceStub = line.kind === 'applianceStub'
  const widthPx = getLineWidthPx(line.pipeTypeName, zoom)
  const colorHex =
    isSelected && !isGhost
      ? SCENE_COLORS.selection
      : isApplianceStub
        ? PLUMBING_COLORS.applianceStub
        : getLineColor(line.pipeTypeName)

  // Referans kararlı tutulur: drei <Line> `points` değişince geometriyi yeniden ayırır.
  const positions = useMemo(
    () =>
      line.points.map((point) =>
        planToThree(point.position, isGhost ? INSTALLATION_GHOST_ELEVATION_CM : LINE_ELEVATION_CM),
      ),
    [isGhost, line.points],
  )

  const firstPoint = line.points[0]
  const lastPoint = line.points[line.points.length - 1]

  return (
    <>
      <PipeLine
        positions={positions}
        colorHex={colorHex}
        widthPx={widthPx}
        renderOrder={isGhost ? RENDER_ORDER.installationGhost : RENDER_ORDER.pipe}
        isGhost={isGhost}
        isDashed={isApplianceStub}
      />

      {/* Uç işaretleri hayalette çizilmez: mimari görünümde tesisat salt bağlamdır.
          Boyları dünya ölçüsünde: çizginin piksel kalınlığı cm'ye geri çevrilir. */}
      {!isGhost && firstPoint && lastPoint && (
        <>
          <LineEndMarker
            position={firstPoint.position}
            widthCm={toWidthCm(widthPx, zoom)}
            colorHex={colorHex}
            isConnected={isLineEndConnected(connections, line.id, 'start')}
          />
          <LineEndMarker
            position={lastPoint.position}
            widthCm={toWidthCm(widthPx, zoom)}
            colorHex={colorHex}
            isConnected={isLineEndConnected(connections, line.id, 'end')}
          />
        </>
      )}
    </>
  )
}

/** Aktif kattaki hatlar. Store dizilerine olduğu gibi abone olunur (türetilmiş dizi
 *  her store değişiminde yeni referans üretirdi). */
export function InstallationLines({ tone }: { tone?: LineTone }) {
  const lines = useCadStore((state) => state.installationLines)
  const connections = useCadStore((state) => state.installationConnections)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const selectedLineIds = usePlumbingUiStore((state) => state.selectedLineIds)
  const zoom = useCameraZoom()

  return (
    <group name="installation-lines">
      {lines
        .filter((line) => line.floorId === activeFloorId)
        .map((line) => (
          <InstallationLineMesh
            key={line.id}
            line={line}
            zoom={zoom}
            connections={connections}
            isSelected={selectedLineIds.includes(line.id)}
            tone={tone}
          />
        ))}
    </group>
  )
}
