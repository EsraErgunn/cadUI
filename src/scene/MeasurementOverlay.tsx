import { Line, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState, type RefObject } from 'react'
import type { Group } from 'three'

import { ARCHITECTURE_COLORS } from './architectureTheme'
import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { useCameraZoom } from './useCameraZoom'
import type { MeasurementToolState } from './useMeasurementTool'
import { planToThree, type PlanPoint } from '../core/coords'
import { formatLengthMeters } from '../core/lengthFormat'
import { getMeasurementAnchor } from '../core/measurement'
import { getSegmentLength } from '../core/wall'
import { useArchitectureUiStore } from '../store/architectureUiStore'

/** Ölçü etiketleriyle aynı yazı tipi; repodan gelir (CDN'e gitmez). */
const FONT_URL = '/fonts/roboto-regular.woff'

/** Plan düzlemine yatırma: kamera tepeden bakıyor, dik duran yazı görünmezdi. */
const FLAT_ROTATION: readonly [number, number, number] = [-Math.PI / 2, 0, 0]

const LABEL_SIZE_PX = 12
/** Yazı çizginin üstüne binmesin diye dikinde bu kadar ekran pikseli kayar. */
const LABEL_OFFSET_PX = 12

/** Ölçüm çizgisi duvardan İNCE ve kesikli: altındaki çizimi örtmesin. */
const LINE_WIDTH_PX = 1.6
const DASH_SIZE_CM = 10
const DASH_GAP_CM = 6

/** Ölçüm ışın hedefi değildir; altındaki duvar seçilebilir kalmalı. */
const NO_RAYCAST = () => null

function MeasurementLine({ start, end }: { start: PlanPoint; end: PlanPoint }) {
  return (
    <Line
      points={[planToThree(start, HANDLE_ELEVATION_CM), planToThree(end, HANDLE_ELEVATION_CM)]}
      color={ARCHITECTURE_COLORS.measurement}
      lineWidth={LINE_WIDTH_PX}
      dashed
      dashSize={DASH_SIZE_CM}
      gapSize={DASH_GAP_CM}
      // Uçlar her karede değişiyor; küme dışı bırakma eski sınır kutusuyla
      // çalışıp çizgiyi kaybettirebilir.
      frustumCulled={false}
      renderOrder={RENDER_ORDER.measurement}
      depthWrite={false}
      toneMapped={false}
      raycast={NO_RAYCAST}
    />
  )
}

function MeasurementText({
  label,
  position,
  zoom,
}: {
  label: string
  position: PlanPoint
  zoom: number
}) {
  return (
    <Text
      font={FONT_URL}
      position={planToThree(position, HANDLE_ELEVATION_CM)}
      rotation={FLAT_ROTATION}
      fontSize={LABEL_SIZE_PX / zoom}
      color={ARCHITECTURE_COLORS.measurement}
      anchorX="center"
      anchorY="middle"
      renderOrder={RENDER_ORDER.measurement}
      raycast={NO_RAYCAST}
    >
      {label}
    </Text>
  )
}

/**
 * İkinci nokta henüz konmadı: çizgi ve yazı imleci takip eder.
 *
 * İmleç ref'ten okunuyor, state'ten değil — her pointermove React render'ı
 * tetikleseydi ölçüm sırasında tüm sahne yeniden çizilirdi. Konum her karede
 * grubun object3D'sine yazılıyor; state yalnız YAZI değişince güncelleniyor,
 * çünkü metnin zaten yeniden çizilmesi gerekiyor (tesisattaki
 * `DraftLengthLabel` ile aynı desen).
 */
function LiveMeasurement({
  start,
  cursorRef,
  zoom,
}: {
  start: PlanPoint
  cursorRef: RefObject<PlanPoint | null>
  zoom: number
}) {
  const groupRef = useRef<Group>(null)
  const [cursor, setCursor] = useState<PlanPoint | null>(null)

  useFrame(() => {
    const next = cursorRef.current
    setCursor((current) => {
      if (!next) return current === null ? current : null
      if (current && current.x === next.x && current.y === next.y) return current
      return next
    })
  })

  // İmleç tuvale girene kadar (dokunmatikte ilk basışa kadar) hiçbir şey çizilmez.
  if (!cursor) return <group ref={groupRef} />

  const lengthCm = getSegmentLength(start, cursor)

  return (
    <group ref={groupRef}>
      <MeasurementLine start={start} end={cursor} />
      <MeasurementText
        label={formatLengthMeters(lengthCm)}
        position={getMeasurementAnchor(start, cursor, LABEL_OFFSET_PX / zoom)}
        zoom={zoom}
      />
    </group>
  )
}

/** İki nokta da kondu: çizgi ve yazı donar, Esc'e ya da araç değişimine kadar durur. */
function FixedMeasurement({
  start,
  end,
  zoom,
}: {
  start: PlanPoint
  end: PlanPoint
  zoom: number
}) {
  return (
    <>
      <MeasurementLine start={start} end={end} />
      <MeasurementText
        label={formatLengthMeters(getSegmentLength(start, end))}
        position={getMeasurementAnchor(start, end, LABEL_OFFSET_PX / zoom)}
        zoom={zoom}
      />
    </>
  )
}

/**
 * Ölçüm aracının ekrandaki karşılığı: iki nokta arasında kesikli çizgi ve metre
 * cinsinden yazı. Hiçbir parçası kalıcı değildir — durum `architectureUiStore`da,
 * temizlenince bu ağaç unmount olur ve geçici geometri onunla birlikte gider.
 *
 * Duvar ölçüleriyle (K72) karıştırılmamalı: onlar duvarın boyunu ANLATIR ve
 * çizimden türer; bu ise kullanıcının seçtiği iki serbest nokta arasını okur.
 */
export function MeasurementOverlay({ isActive, cursorRef }: MeasurementToolState) {
  const measurement = useArchitectureUiStore((state) => state.measurement)
  const zoom = useCameraZoom()

  if (!isActive || !measurement) return null

  return (
    <group name="measurement">
      {measurement.end === null ? (
        <LiveMeasurement start={measurement.start} cursorRef={cursorRef} zoom={zoom} />
      ) : (
        <FixedMeasurement start={measurement.start} end={measurement.end} zoom={zoom} />
      )}
    </group>
  )
}
