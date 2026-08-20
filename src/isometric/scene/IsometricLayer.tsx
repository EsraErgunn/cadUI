import { useMemo } from 'react'

import { IsometricCamera } from './IsometricCamera'
import { IsometricElement } from './IsometricElement'
import { IsometricFloorLink } from './IsometricFloorLink'
import { IsometricPipe } from './IsometricPipe'
import {
  ISOMETRIC_AMBIENT_INTENSITY,
  ISOMETRIC_DIMMED_OPACITY,
  ISOMETRIC_DIRECTIONAL_INTENSITY,
} from './isometricTheme'
import type { Id } from '../../core/model'
import { getTargetElementId } from '../../plumbing/core/installationModel'
import type { InstallationConnection } from '../../plumbing/core/installationModel'
import { useCadStore } from '../../store/cadStore'
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
  const isCameraLocked = useIsometricUiStore((state) => state.isCameraLocked)
  const highlightedLineId = useIsometricUiStore((state) => state.highlightedLineId)
  const setHighlightedLineId = useIsometricUiStore((state) => state.setHighlightedLineId)

  // Sahne verisi TÜRETİLMİŞ: store'a konmaz, her çizimde yeniden üretilir.
  // Memo şart — kamera çerçevelemesi `bounds`'tan türeyen ilkellere bağlı ve
  // her karede yeni nesne üretilseydi kullanıcının kaydırması geri alınırdı.
  const scene = useMemo(
    () =>
      buildIsometricScene(
        {
          floors,
          installationElements,
          installationLines,
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
      installationLines,
    ],
  )

  const connectedElementIds = useMemo(
    () =>
      highlightedLineId === null
        ? null
        : getConnectedElementIds(highlightedLineId, installationConnections),
    [highlightedLineId, installationConnections],
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
              isDimmed={connectedElementIds !== null && !connectedElementIds.has(element.id)}
            />
          )
        })}
      </group>
    </>
  )
}
