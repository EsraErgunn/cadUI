import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ComponentRef, type RefObject } from 'react'
import { InterleavedBufferAttribute } from 'three'

import { PipeLine } from './InstallationLineMesh'
import { DraftLengthLabel, LABEL_OFFSET_PX, LengthText } from './LengthLabels'
import { MEASUREMENT_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { useCameraZoom } from './useCameraZoom'
import type { MeasurementToolState } from './useMeasurementTool'
import { planToThree, type PlanPoint, type ThreePosition } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import { formatLengthMeters } from '../core/lengthFormat'
import { getMeasurementAnchor, getSegmentLengthCm } from '../core/lineGeometry'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/**
 * Ölçüm çizgisi boru DEĞİL: kalınlığı çaptan gelmez, sabit ve ince kalır ki
 * altındaki hattı örtmesin.
 */
const MEASUREMENT_LINE_WIDTH_PX = 2

/** Lastik bandın başlangıç geometrisi; iki köşesi her karede yerinden yazılır. */
const RUBBER_BAND_SEED: ThreePosition[] = [
  [0, 0, 0],
  [0, 0, 0],
]

/**
 * İkinci nokta henüz konmadı: çizgi imleci takip eder. Teknik LineDraftPreview
 * ile aynı — köşeler her karede geometrinin İÇİNE yazılır, `points` propu
 * değişmez (drei `<Line>` her değişimde yeni BufferGeometry ayırırdı).
 */
function LiveMeasurement({
  start,
  cursorRef,
}: {
  start: PlanPoint
  cursorRef: RefObject<PlanPoint | null>
}) {
  const lineRef = useRef<ComponentRef<typeof Line> | null>(null)
  const zoom = useCameraZoom()

  useFrame(() => {
    const line = lineRef.current
    if (!line) return

    const cursor = cursorRef.current
    line.visible = cursor !== null
    if (!cursor) return

    const { instanceStart, instanceEnd } = line.geometry.attributes
    if (
      !(instanceStart instanceof InterleavedBufferAttribute) ||
      !(instanceEnd instanceof InterleavedBufferAttribute)
    ) {
      return
    }

    instanceStart.setXYZ(0, ...planToThree(start, MEASUREMENT_ELEVATION_CM))
    instanceEnd.setXYZ(0, ...planToThree(cursor, MEASUREMENT_ELEVATION_CM))
    instanceStart.data.needsUpdate = true
    // Kesikli desen `points` PROPUNDAN türeyen mesafeye bakar; bu teknikte prop
    // sabit kaldığı için drei'nin otomatik hesabı hiç tetiklenmez ve çizgi DÜZ
    // görünürdü (aynı tuzak DrawPreview'daki cihaz kolunda da var).
    line.computeLineDistances()
  })

  return (
    <>
      <PipeLine
        lineRef={lineRef}
        positions={RUBBER_BAND_SEED}
        colorHex={PLUMBING_COLORS.measurementLine}
        widthPx={MEASUREMENT_LINE_WIDTH_PX}
        renderOrder={RENDER_ORDER.measurement}
        isDashed
      />
      {/* Anlık uzunluk çizim geri bildirimiyle AYNI bileşenden: ölçüm de
          çizerken okunan bir sayı, ikinci bir yazı yolu açılmaz. */}
      <DraftLengthLabel anchor={start} cursorRef={cursorRef} zoom={zoom} />
    </>
  )
}

/** İki nokta da kondu: çizgi ve yazı donar, Esc'e ya da araç değişimine kadar durur. */
function FixedMeasurement({ start, end }: { start: PlanPoint; end: PlanPoint }) {
  const zoom = useCameraZoom()
  const positions = useMemo<ThreePosition[]>(
    () => [
      planToThree(start, MEASUREMENT_ELEVATION_CM),
      planToThree(end, MEASUREMENT_ELEVATION_CM),
    ],
    [start, end],
  )

  return (
    <>
      <PipeLine
        positions={positions}
        colorHex={PLUMBING_COLORS.measurementLine}
        widthPx={MEASUREMENT_LINE_WIDTH_PX}
        renderOrder={RENDER_ORDER.measurement}
        isDashed
      />
      <group
        position={planToThree(
          getMeasurementAnchor(start, end, LABEL_OFFSET_PX / zoom),
          MEASUREMENT_ELEVATION_CM,
        )}
      >
        <LengthText label={formatLengthMeters(getSegmentLengthCm(start, end))} zoom={zoom} />
      </group>
    </>
  )
}

/**
 * Ölçüm aracının ekrandaki karşılığı: iki nokta arasında kesikli çizgi ve metre
 * cinsinden yazı. Hiçbir parçası kalıcı değildir — durum `plumbingUiStore`da,
 * temizlenince bu ağaç unmount olur ve geçici geometri onunla birlikte gider.
 */
export function MeasurementOverlay({ isActive, cursorRef }: MeasurementToolState) {
  const measurement = usePlumbingUiStore((state) => state.measurement)

  if (!isActive || !measurement) return null

  return (
    <group name="measurement">
      {measurement.end === null ? (
        <LiveMeasurement start={measurement.start} cursorRef={cursorRef} />
      ) : (
        <FixedMeasurement start={measurement.start} end={measurement.end} />
      )}
    </group>
  )
}
