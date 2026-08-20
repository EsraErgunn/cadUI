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
import { getTargetElementId } from '../../plumbing/core/installationModel'
import type { InstallationConnection } from '../../plumbing/core/installationModel'
import { useCameraZoom } from '../../scene/useCameraZoom'
import { useCadStore } from '../../store/cadStore'
import type { IsometricElevationContext } from '../core/isometricElevation'
import { applyIsometricDrag } from '../core/isometricOffset'
import { buildIsometricScene } from '../core/isometricScene'
import { useIsometricUiStore } from '../store/isometricUiStore'

/** Işık yönü sahneye göre SABİT: kamera dönerken gölgeleme kaymasın. */
const DIRECTIONAL_LIGHT_POSITION: [number, number, number] = [1, 2, 1]

/** Vurgulanan hattın uçlarına bağlı elemanlar — onlar solmaz. */
function getConnectedElementIds(
  lineId: Id,
  connections: readonly InstallationConnection[],
): Set<Id> {
  const elementIds = new Set<Id>()
  for (const connection of connections) {
    if (connection.lineId !== lineId) continue
    const elementId = getTargetElementId(connection.target)
    if (elementId !== null) elementIds.add(elementId)
  }
  return elementIds
}

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

  const explodedGapCm = useIsometricUiStore((state) => state.explodedGapCm)
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
    return installationLines.map((line) =>
      line.id === lineDrag.lineId
        ? { ...line, points: applyIsometricDrag(line.points, lineDrag.pointId, lineDrag.deltaCm) }
        : line,
    )
  }, [installationLines, lineDrag])

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
        { angles, explodedGapCm },
      ),
    [
      angles,
      explodedGapCm,
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

  const handleDrag = useCallback(
    (lineId: Id, pointId: Id) => (deltaCm: PlanPoint) =>
      setLineDrag({ lineId, pointId, deltaCm }),
    [setLineDrag],
  )

  const handleDragEnd = useCallback(
    (lineId: Id, pointId: Id) => (deltaCm: PlanPoint) => {
      setLineDrag(null)
      applyIsometricLineDrag(lineId, pointId, deltaCm)
    },
    [applyIsometricLineDrag, setLineDrag],
  )

  // Tutamaçlar YALNIZ vurgulanan hatta çıkar: her köşede sürekli bir top
  // dursaydı kalabalık çizim okunmaz olurdu. Keşif yolu "hatta tıkla →
  // tutamaçlar belirsin".
  const handledGeometry =
    highlightedLineId === null
      ? null
      : (scene.lines.find((geometry) => geometry.lineId === highlightedLineId) ?? null)

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
              onDrag={handleDrag(handledGeometry.lineId, handledGeometry.pointIds[index])}
              onDragEnd={handleDragEnd(handledGeometry.lineId, handledGeometry.pointIds[index])}
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
