import { Suspense, useCallback, useMemo } from 'react'

import { IsometricCamera } from './IsometricCamera'
import { IsometricElement } from './IsometricElement'
import { IsometricFloorLink } from './IsometricFloorLink'
import { IsometricLabels } from './IsometricLabels'
import { IsometricPipe } from './IsometricPipe'
import { IsometricPointHandle } from './IsometricPointHandle'
import {
  ISOMETRIC_AMBIENT_INTENSITY,
  ISOMETRIC_DIMMED_OPACITY,
  ISOMETRIC_DIRECTIONAL_INTENSITY,
} from './isometricTheme'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { getSymbolMetadata } from '../../plumbing/scene/symbolLoader'
import { useCameraZoom } from '../../scene/useCameraZoom'
import { useCadStore } from '../../store/cadStore'
import {
  getIsometricDragAxes,
  pickIsometricDragAxis,
  projectDragOntoAxis,
} from '../core/isometricDragAxis'
import type { IsometricElevationContext } from '../core/isometricElevation'
import { getConnectedElementIds } from '../core/isometricHighlight'
import { applyIsometricNetworkDrag } from '../core/isometricNetworkDrag'
import { getCameraProjection } from '../core/isometricProjection'
import { buildIsometricScene } from '../core/isometricScene'
import { useIsometricUiStore } from '../store/isometricUiStore'

/** Işık yönü sahneye göre SABİT: kamera dönerken gölgeleme kaymasın. */
const DIRECTIONAL_LIGHT_POSITION: [number, number, number] = [1, 2, 1]

/**
 * İzometrik sahnenin kökü; `SceneRoot` yalnız izometrik görünümde mount eder.
 *
 * Aktif kat kavramı YOKTUR: tüm katlar aynı anda çizilir ("izometrik tüm binayı
 * tek parça gösterir"). Plan görünümlerinden ayrıldığı en temel nokta bu, o
 * yüzden burada `activeFloorId` hiç okunmaz.
 *
 * `scene/layers.ts` ve `RENDER_ORDER` BURAYA GİRMEZ: onlar tepeden bakan
 * ortografik kameranın z-fighting çözümü ve mikro yükseklik farklarına dayanıyor;
 * izometrikte o farklar görünür hâle gelir. Derinlik gerçek geometriyle çözülür.
 */
export function IsometricLayer() {
  const floors = useCadStore((state) => state.floors)
  const installationElements = useCadStore((state) => state.installationElements)
  const installationLines = useCadStore((state) => state.installationLines)
  const installationConnections = useCadStore((state) => state.installationConnections)
  const floorPipeLinks = useCadStore((state) => state.floorPipeLinks)
  const angles = useCadStore((state) => state.isometricAngles)

  const isLabelsVisible = useIsometricUiStore((state) => state.isLabelsVisible)
  const isCameraLocked = useIsometricUiStore((state) => state.isCameraLocked)
  const highlightedLineId = useIsometricUiStore((state) => state.highlightedLineId)
  const setHighlightedLineId = useIsometricUiStore((state) => state.setHighlightedLineId)
  const lineDrag = useIsometricUiStore((state) => state.lineDrag)
  const setLineDrag = useIsometricUiStore((state) => state.setLineDrag)
  const applyIsometricLineDrag = useCadStore((state) => state.applyIsometricLineDrag)
  const zoom = useCameraZoom()

  /**
   * Süren sürükleme sahne KURULMADAN ÖNCE uygulanıyor: aynı `applyIsometricDrag`
   * hem önizlemeyi hem kalıcı yazımı üretiyor, böylece bırakınca dal yerinden
   * oynamıyor. Önizleme sahnenin içinde ayrıca hesaplansaydı iki yol ayrışırdı.
   */
  const previewLines = useMemo(() => {
    if (!lineDrag) return installationLines
    return applyIsometricNetworkDrag(
      installationLines,
      installationConnections,
      lineDrag.pointId,
      lineDrag.anchorPointId,
      lineDrag.deltaCm,
    )
  }, [installationConnections, installationLines, lineDrag])

  // Sahne verisi TÜRETİLMİŞ: store'a konmaz, her çizimde yeniden üretilir.
  // Memo şart — kamera çerçevelemesi `bounds`'tan türeyen ilkellere bağlı ve
  // her karede yeni nesne üretilseydi kullanıcının kaydırması geri alınırdı.
  const scene = useMemo(
    () =>
      buildIsometricScene(
        {
          floors,
          installationElements,
          installationLines: previewLines,
          installationConnections,
          floorPipeLinks,
        },
        { projection: getCameraProjection(angles), getMetadata: getSymbolMetadata },
      ),
    [
      angles,
      floorPipeLinks,
      floors,
      installationConnections,
      installationElements,
      previewLines,
    ],
  )

  // Kot çözümü etiketlerde de gerekiyor (3B boy); sahne ile AYNI bağlam
  // kullanılıyor ki yazan boy ile çizilen gövde ayrışmasın.
  const elevationContext = useMemo<IsometricElevationContext>(
    () => ({ lines: previewLines, connections: installationConnections }),
    [installationConnections, previewLines],
  )

  const connectedElementIds = useMemo(
    () =>
      highlightedLineId === null
        ? null
        : getConnectedElementIds(highlightedLineId, installationConnections),
    [highlightedLineId, installationConnections],
  )

  // Tutamaçlar YALNIZ vurgulanan hatta çıkar: her köşede sürekli bir top
  // dursaydı kalabalık çizim okunmaz olurdu. Keşif yolu "hatta tıkla →
  // tutamaçlar belirsin".
  const handledGeometry =
    highlightedLineId === null
      ? null
      : (scene.lines.find((geometry) => geometry.lineId === highlightedLineId) ?? null)

  /**
   * Sürükleme borunun KENDİ eksenine kilitlenir (K169): serbest sürüklemede
   * yatay bir boru eğik bir yere bırakılabiliyordu ve şema teknik çizim
   * olmaktan çıkıyordu. Seçilen eksen aynı zamanda hangi ucun SABİT kalacağını
   * söyler — çekilen parça uzar, karşı taraftaki ağ yerinde durur.
   *
   * Eksenler tutamacın ÇİZİLEN konumundan okunur, yani kayma uygulanmış
   * hâlden: art arda çekişlerde yön kaymaz.
   */
  const resolveDrag = useCallback(
    (pointIndex: number, deltaCm: PlanPoint) => {
      if (!handledGeometry) return { deltaCm, anchorPointId: undefined }

      const axes = getIsometricDragAxes(
        handledGeometry.positions,
        pointIndex,
        getCameraProjection(angles).project,
      )
      const axis = pickIsometricDragAxis(deltaCm, axes)
      if (!axis) return { deltaCm, anchorPointId: undefined }

      return {
        deltaCm: projectDragOntoAxis(deltaCm, axis),
        anchorPointId: handledGeometry.pointIds[axis.neighborIndex],
      }
    },
    [angles, handledGeometry],
  )

  const handleDrag = useCallback(
    (lineId: Id, pointId: Id, pointIndex: number) => (rawDeltaCm: PlanPoint) => {
      const { deltaCm, anchorPointId } = resolveDrag(pointIndex, rawDeltaCm)
      setLineDrag({ lineId, pointId, anchorPointId, deltaCm })
    },
    [resolveDrag, setLineDrag],
  )

  const handleDragEnd = useCallback(
    (pointId: Id, pointIndex: number) => (rawDeltaCm: PlanPoint) => {
      const { deltaCm, anchorPointId } = resolveDrag(pointIndex, rawDeltaCm)
      setLineDrag(null)
      applyIsometricLineDrag(pointId, anchorPointId, deltaCm)
    },
    [applyIsometricLineDrag, resolveDrag, setLineDrag],
  )

  const opacityOf = (lineId: Id) =>
    highlightedLineId === null || highlightedLineId === lineId ? 1 : ISOMETRIC_DIMMED_OPACITY

  return (
    <>
      <IsometricCamera bounds={scene.bounds} angles={angles} isLocked={isCameraLocked} />
      <ambientLight intensity={ISOMETRIC_AMBIENT_INTENSITY} />
      <directionalLight
        position={DIRECTIONAL_LIGHT_POSITION}
        intensity={ISOMETRIC_DIRECTIONAL_INTENSITY}
      />

      {/* Boşluğa tıklamak vurguyu bırakır; yoksa kullanıcı soluk sahneden
          çıkmak için doğru hatta tekrar tıklamak zorunda kalırdı. */}
      <group onPointerMissed={() => setHighlightedLineId(null)}>
        {scene.lines.map((geometry) => (
          <IsometricPipe
            key={geometry.lineId}
            geometry={geometry}
            opacity={opacityOf(geometry.lineId)}
            onPointerDown={() =>
              setHighlightedLineId(highlightedLineId === geometry.lineId ? null : geometry.lineId)
            }
          />
        ))}

        {scene.floorLinks.map((geometry) => (
          <IsometricFloorLink
            key={geometry.linkId}
            geometry={geometry}
            // Kat bağlantısı hiçbir hattın kendisi değil; vurgu varken solar.
            opacity={highlightedLineId === null ? 1 : ISOMETRIC_DIMMED_OPACITY}
          />
        ))}

        {scene.elements.map((placement) => {
          const element = installationElements.find(
            (candidate) => candidate.id === placement.elementId,
          )
          if (!element) return null

          return (
            <IsometricElement
              key={placement.elementId}
              element={element}
              position={placement.position}
              anchorOffsetCm={placement.anchorOffsetCm}
              isDimmed={connectedElementIds !== null && !connectedElementIds.has(element.id)}
            />
          )
        })}
        {isCameraLocked &&
          handledGeometry?.positions.map((position, index) => (
            <IsometricPointHandle
              key={`handle-${handledGeometry.pointIds[index]}`}
              position={position}
              zoom={zoom}
              onDrag={handleDrag(handledGeometry.lineId, handledGeometry.pointIds[index], index)}
              onDragEnd={handleDragEnd(handledGeometry.pointIds[index], index)}
            />
          ))}
      </group>

      {/* KENDİ Suspense'i: drei <Text> troika'nın font indirmesiyle askıya
          alınır. Sarılmasaydı askıya alma yukarıdaki kamerayı da söker,
          `makeDefault` geri alınır ve çerçeveleme sıfırlanırdı. */}
      {isLabelsVisible && (
        <Suspense fallback={null}>
          <IsometricLabels
            scene={scene}
            lines={previewLines}
            elements={installationElements}
            connections={installationConnections}
            context={elevationContext}
            angles={angles}
            highlightedLineId={highlightedLineId}
            // Serbest yörüngede etiket sürüklemek kamerayı döndürmekle
            // çakışıyor; taşıma yalnız kilitli (teknik çizim) kipte açık.
            isDraggable={isCameraLocked}
          />
        </Suspense>
      )}
    </>
  )
}
