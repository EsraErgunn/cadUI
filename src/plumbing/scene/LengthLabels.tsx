import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Fragment, useMemo, useRef, useState, type RefObject } from 'react'
import type { Group } from 'three'

import { DragOffsetGroup } from './InstallationLineMesh'
import { MEASUREMENT_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { useCameraZoom } from './useCameraZoom'
import { useDraggedCorners, type DraggedCorner } from './useDraggedCorners'
import { planToThree, type PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { RENDER_ORDER } from '../../scene/layers'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import type { InstallationLine } from '../core/installationModel'
import { formatLengthMeters } from '../core/lengthFormat'
import { getMeasurementAnchor, getSegmentLengthCm, isSamePoint } from '../core/lineGeometry'

/**
 * Font REPODAN gelir (RoomLabel ile aynı gerekçe): verilmezse troika varsayılanı
 * Google Fonts CDN'ine gidiyor ve istek düşünce hata vermeden 0 piksel çiziyor.
 */
export const FONT_URL = '/fonts/roboto-regular.woff'

/**
 * Yazı EKRAN boyunda sabit kalsın: zoom = piksel/cm olduğu için dünya boyu
 * px/zoom'dur (bkz. knowledge/viewport.md). drei `<Html>` yerine `<Text>`
 * seçildi — ölçü sayısı yüzleri bulabiliyor ve her etiket için ayrı bir DOM
 * portal'ı (üstelik ayrı react-dom kökü, bkz. RoomNameEditor) hem pahalı hem de
 * store aboneliğini bozan bir yol.
 */
const LABEL_SIZE_PX = 12
/** Etiket borunun ÜSTÜNE binmesin diye bölümün dikinde bu kadar ekran pikseli kayar. */
export const LABEL_OFFSET_PX = 11

/** Plan düzlemine yatırma: kamera tepeden bakıyor, dik duran yazı görünmezdi. */
const FLAT_ROTATION: readonly [number, number, number] = [-Math.PI / 2, 0, 0]

/** Ölçü yazısı tıklanmaz; tesisat tutması zaten saf geometriyle yapılıyor. */
const NO_RAYCAST = () => null

/**
 * Ölçü yazısının TEK çizim yolu: anlık (lastik bant), ayrım önizlemesi ve kalıcı
 * etiket aynı biçimi alsın. Konumu YOK — çapayı sarmalayan grup taşır, çünkü
 * anlık etiketin konumu her karede object3D'ye yazılıyor.
 */
export function LengthText({ label, zoom }: { label: string; zoom: number }) {
  return (
    // Ekran-sabit boy ölçekle: `fontSize` her değişiminde troika metni yeniden
    // dizer, ölçek yalnız matrisi günceller (bkz. scene/WallDimensionLabels).
    <group rotation={FLAT_ROTATION} scale={1 / zoom}>
      <Text
        font={FONT_URL}
        fontSize={LABEL_SIZE_PX}
        color={PLUMBING_COLORS.measurementLabel}
        anchorX="center"
        anchorY="middle"
        renderOrder={RENDER_ORDER.measurement}
        raycast={NO_RAYCAST}
      >
        {label}
      </Text>
    </group>
  )
}

/**
 * Hattın köşeleri, sürüklenen köşe geçici konumuyla yerine konmuş hâlde.
 * `useDraggedLinePoints` ile aynı gerekçe: köşe bırakılana kadar cadStore
 * yazılmaz, etiket yine de canlı uzunluğu göstermeli.
 */
function useLinePointPositions(
  line: InstallationLine,
  corner: DraggedCorner | undefined,
): ReadonlyMap<Id, PlanPoint> {
  return useMemo(() => {
    const positions = new Map<Id, PlanPoint>()
    for (const point of line.points) {
      positions.set(point.id, point.id === corner?.pointId ? corner.position : point.position)
    }
    return positions
  }, [line.points, corner])
}

type LineLengthLabelsProps = {
  line: InstallationLine
  zoom: number
  draggedCorner: DraggedCorner | undefined
}

function LineLengthLabels({ line, zoom, draggedCorner }: LineLengthLabelsProps) {
  const positions = useLinePointPositions(line, draggedCorner)
  const offsetCm = LABEL_OFFSET_PX / zoom

  return (
    <>
      {line.segments.map((segment) => {
        const from = positions.get(segment.fromPointId)
        const to = positions.get(segment.toPointId)
        if (!from || !to) return null
        // Plan boyu SIFIR segment (K98, dikey bağlantı) burada "0,00 m" yazmaz
        // — kotu `PipeElevationGlyph` (InstallationLineMesh.tsx) gösteriyor.
        if (isSamePoint(from, to)) return null

        return (
          <group
            key={segment.id}
            position={planToThree(getMeasurementAnchor(from, to, offsetCm), MEASUREMENT_ELEVATION_CM)}
          >
            <LengthText label={formatLengthMeters(getSegmentLengthCm(from, to))} zoom={zoom} />
          </group>
        )
      })}
    </>
  )
}

type LengthLabelsProps = {
  /** Sürüklenen hatlar; etiket de hattıyla birlikte kaysın (bkz. InstallationLines). */
  draggedLineIds?: readonly Id[]
  dragDeltaRef?: RefObject<PlanPoint | null>
}

function VisibleLengthLabels({ draggedLineIds, dragDeltaRef }: LengthLabelsProps) {
  const lines = useCadStore((state) => state.installationLines)
  const connections = useCadStore((state) => state.installationConnections)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const draggedCorners = useDraggedCorners(lines, connections)
  const zoom = useCameraZoom()

  return (
    <group name="length-labels">
      {lines
        .filter((line) => line.floorId === activeFloorId)
        .map((line) => {
          const labels = (
            <LineLengthLabels
              line={line}
              zoom={zoom}
              draggedCorner={draggedCorners.get(line.id)}
            />
          )

          if (!dragDeltaRef || !draggedLineIds?.includes(line.id)) {
            return <Fragment key={line.id}>{labels}</Fragment>
          }
          return (
            <DragOffsetGroup key={line.id} deltaRef={dragDeltaRef}>
              {labels}
            </DragOffsetGroup>
          )
        })}
    </group>
  )
}

/**
 * Yerleşmiş hatların kalıcı ölçü etiketleri. Uzunluk HER ZAMAN geometriden
 * hesaplanır; modelde `lengthCm` diye bir alan yok — olsaydı köşe taşındığında
 * bayatlardı.
 *
 * Kapı gövdeden ayrı bir bileşen: ölçüler kapalıyken hiçbir store aboneliği ve
 * `useFrame` kurulmaz.
 */
export function LengthLabels(props: LengthLabelsProps) {
  const isDimensionsVisible = useUiStore((state) => state.isDimensionsVisible)

  if (!isDimensionsVisible) return null

  return <VisibleLengthLabels {...props} />
}

type DraftLengthLabelProps = {
  /** Zincirin ucundaki sabit köşe; lastik bant buradan imlece uzanıyor. */
  anchor: PlanPoint
  cursorRef: RefObject<PlanPoint | null>
  zoom: number
}

/**
 * Çizim sırasındaki anlık bölüm uzunluğu — lastik bandın ortasında. `Ölçüleri
 * Göster`den BAĞIMSIZ: bu bir çizim geri bildirimi, kalıcı bir kotalama değil.
 *
 * Konum her karede grubun object3D'sine yazılır (React render'ı tetiklemez);
 * state yalnız YAZI değiştiğinde güncellenir — metnin zaten yeniden çizilmesi
 * gerekiyor, useCameraZoom'daki "değişmediyse dokunma" deseninin aynısı.
 */
export function DraftLengthLabel({ anchor, cursorRef, zoom }: DraftLengthLabelProps) {
  const groupRef = useRef<Group>(null)
  const [label, setLabel] = useState<string | null>(null)

  useFrame(() => {
    const group = groupRef.current
    const cursor = cursorRef.current
    if (!group) return

    // İmleç tuvale girene kadar (dokunmatikte ilk basışa kadar) etiket çıkmaz.
    if (!cursor) {
      setLabel((current) => (current === null ? current : null))
      return
    }

    const labelAnchor = getMeasurementAnchor(anchor, cursor, LABEL_OFFSET_PX / zoom)
    group.position.set(...planToThree(labelAnchor, MEASUREMENT_ELEVATION_CM))

    const next = formatLengthMeters(getSegmentLengthCm(anchor, cursor))
    setLabel((current) => (current === next ? current : next))
  })

  return (
    <group ref={groupRef}>{label !== null && <LengthText label={label} zoom={zoom} />}</group>
  )
}
