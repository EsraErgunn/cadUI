import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Fragment, useMemo, useRef, type ComponentRef, type ReactNode, type RefObject } from 'react'
import type { Group } from 'three'

import { LineTerminal, CornerMarker } from './LineMarkers'
import { getLineColor, getLineWidthPx, toWidthCm } from './lineStyle'
import { INSTALLATION_GHOST_ELEVATION_CM, LINE_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { GHOST_OPACITY } from './symbolLoader'
import { useCameraZoom } from './useCameraZoom'
import { useDraggedCorners, type DraggedCorner } from './useDraggedCorners'
import { planToThree, type PlanPoint, type ThreePosition } from '../../core/coords'
import type { Id } from '../../core/model'
import { RENDER_ORDER } from '../../scene/layers'
import { SCENE_COLORS } from '../../scene/sceneTheme'
import { useCadStore } from '../../store/cadStore'
import type { InstallationConnection, InstallationLine, InstallationLinePoint } from '../core/installationModel'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/** Hat tıklanabilir değil: tesisat tutması ışınla değil saf geometriyle yapılıyor. */
const LINE_MESH_PROPS = { raycast: () => null }

/** `ghost` = mimari görünümdeki soluk iz. */
export type LineTone = 'normal' | 'ghost'

type InstallationLineMeshProps = {
  line: InstallationLine
  /** Kalınlık zoom'a bağlı; kapsayıcı bir kez okur (bkz. useCameraZoom). */
  zoom: number
  connections?: readonly InstallationConnection[]
  isSelected?: boolean
  tone?: LineTone
  /** Sürüklenmekte olan köşe bu hattı ilgilendiriyorsa geçici konumu. */
  draggedCorner?: DraggedCorner
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

type DragOffsetGroupProps = {
  deltaRef: RefObject<PlanPoint | null>
  children: ReactNode
}

/**
 * Sürüklenen hattın canlı kayması: bütün köşelere AYNI ofset, nokta başına
 * hesap yerine tek `group` konumu (SymbolInstance ile aynı desen). Kayma ref'te
 * biriktiği için sürükleme boyunca ne store'a yazılır ne de React render eder.
 *
 * YALNIZ sürüklenen hatlar için mount edilir — her hatta bir `useFrame`
 * kurulsaydı kare başına hat sayısı kadar geri çağrım çalışırdı (aynı gerekçe
 * lineStyle.ts'teki zoom okumasında da var). Sürükleme bitince bu sarmalayıcı
 * unmount olur, ofset kendiliğinden sıfırlanır.
 */
export function DragOffsetGroup({ deltaRef, children }: DragOffsetGroupProps) {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    const delta = deltaRef.current
    // Plan (x,y) → three (x,-z): dönüşümün tek sahibi coords.ts, burada yalnız
    // hazır ofset uygulanıyor (planToThree bir KONUM üretir, kayma değil).
    groupRef.current?.position.set(delta?.x ?? 0, 0, -(delta?.y ?? 0))
  })

  return <group ref={groupRef}>{children}</group>
}

/**
 * Sürüklenen köşenin canlı konumuyla düzeltilmiş nokta listesi. `architectureUiStore
 * .draggingPoint` + `useArchitecturePoints()` ile AYNI desen (duvar köşesi
 * sürüklemesi): köşe bırakılana kadar cadStore YAZILMAZ, sahne geçici konumu
 * `plumbingUiStore.draggingLineCorner`'dan okur. Hat TEK PARÇA render edilir —
 * gövdeyi ikiye bölüp üstüne ayrı bir önizleme çizmek (önceki deneme) düz
 * borunun yanında bükülen bir kopyası varmış gibi durup boruyu İKİLİYORDU.
 */
function useDraggedLinePoints(
  line: InstallationLine,
  corner: DraggedCorner | undefined,
): InstallationLinePoint[] {
  return useMemo(() => {
    if (!corner) return line.points

    return line.points.map((point) =>
      point.id === corner.pointId ? { ...point, position: corner.position } : point,
    )
  }, [line.points, corner])
}

/** Renk ÇAPTAN gelir (K-W2); seçiliyken maviye döner — seçim rengi tek yerden. */
export function InstallationLineMesh({
  line,
  zoom,
  connections = [],
  isSelected = false,
  tone = 'normal',
  draggedCorner,
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

  const points = useDraggedLinePoints(line, draggedCorner)

  // Referans kararlı tutulur: drei <Line> `points` değişince geometriyi yeniden ayırır.
  const positions = useMemo(
    () =>
      points.map((point) =>
        planToThree(point.position, isGhost ? INSTALLATION_GHOST_ELEVATION_CM : LINE_ELEVATION_CM),
      ),
    [isGhost, points],
  )

  const firstPoint = points[0]
  const lastPoint = points.at(-1)

  return (
    <group>
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
          <LineTerminal
            point={firstPoint}
            end="start"
            lineId={line.id}
            connections={connections}
            widthCm={toWidthCm(widthPx, zoom)}
            colorHex={colorHex}
          />
          <LineTerminal
            point={lastPoint}
            end="end"
            lineId={line.id}
            connections={connections}
            widthCm={toWidthCm(widthPx, zoom)}
            colorHex={colorHex}
          />
          {/* Ara köşeler (kırılma noktaları): boru yalnız buralardan (ve
              uçlarından) tutulabiliyor — armatür oturan köşe kendi sembolüyle
              zaten işaretli, burada ikinci bir nokta çizip üst üste bindirmez. */}
          {points.slice(1, -1).map(
            (point) =>
              point.inlineElementId === undefined && (
                <CornerMarker
                  key={point.id}
                  position={point.position}
                  widthCm={toWidthCm(widthPx, zoom)}
                  colorHex={colorHex}
                />
              ),
          )}
        </>
      )}
    </group>
  )
}

type InstallationLinesProps = {
  tone?: LineTone
  /** Sürüklenen hatlar; canlı kayma YALNIZ bunlara uygulanır (bkz. useSelectionTool). */
  draggedLineIds?: readonly Id[]
  dragDeltaRef?: RefObject<PlanPoint | null>
}

/** Aktif kattaki hatlar. Store dizilerine olduğu gibi abone olunur (türetilmiş dizi
 *  her store değişiminde yeni referans üretirdi). */
export function InstallationLines({
  tone,
  draggedLineIds,
  dragDeltaRef,
}: InstallationLinesProps) {
  const lines = useCadStore((state) => state.installationLines)
  const connections = useCadStore((state) => state.installationConnections)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const selectedLineIds = usePlumbingUiStore((state) => state.selectedLineIds)
  const draggedCorners = useDraggedCorners(lines, connections)
  const zoom = useCameraZoom()

  return (
    <group name="installation-lines">
      {lines
        .filter((line) => line.floorId === activeFloorId)
        .map((line) => {
          const mesh = (
            <InstallationLineMesh
              line={line}
              zoom={zoom}
              connections={connections}
              isSelected={selectedLineIds.includes(line.id)}
              tone={tone}
              draggedCorner={draggedCorners.get(line.id)}
            />
          )

          if (!dragDeltaRef || !draggedLineIds?.includes(line.id)) {
            return <Fragment key={line.id}>{mesh}</Fragment>
          }
          return (
            <DragOffsetGroup key={line.id} deltaRef={dragDeltaRef}>
              {mesh}
            </DragOffsetGroup>
          )
        })}
    </group>
  )
}
