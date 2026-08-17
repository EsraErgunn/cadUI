import { Line, Text } from '@react-three/drei'
import { Fragment, type RefObject } from 'react'

import { DragOffsetGroup } from './InstallationLineMesh'
import { FONT_URL } from './LengthLabels'
import { ELEMENT_LABEL_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { getLoadedSymbol } from './symbolLoader'
import { useCameraZoom } from './useCameraZoom'
import { planToThree, type PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { RENDER_ORDER } from '../../scene/layers'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import {
  clipLeaderEndToRectCm,
  ELEMENT_LABEL_SIZE_PX,
  getElementLabelRectCm,
  getElementWorldCenterCm,
  getElementLabelOffsetCm,
  hasElementNameLabel,
} from '../core/elementLabel'
import type { InstallationElement } from '../core/installationModel'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/** Plan düzlemine yatırma: kamera tepeden bakıyor, dik duran yazı görünmezdi. */
const FLAT_ROTATION: readonly [number, number, number] = [-Math.PI / 2, 0, 0]

/** Etiket tutması saf geometriyle (core/elementLabel.ts); ışın hedefi değildir. */
const NO_RAYCAST = () => null

/** Kılavuz deseni dünya biriminde — piksel değil, ekranı sabit taramasın
 *  (InstallationLineMesh'teki kesikli çizgiyle aynı gerekçe). */
const LEADER_DASH_SIZE_CM = 6
const LEADER_DASH_GAP_CM = 4
const LEADER_WIDTH_PX = 1.2

type ElementNameLabelProps = {
  element: InstallationElement
  zoom: number
}

function ElementNameLabel({ element, zoom }: ElementNameLabelProps) {
  const { metadata } = getLoadedSymbol(element.type)
  // Sürüklenen etiket geçici kaymasıyla çizilir; cadStore bırakılınca yazılır.
  const draggingOffset = usePlumbingUiStore((state) =>
    state.draggingLabel?.elementId === element.id ? state.draggingLabel.offsetCm : null,
  )

  const offset = draggingOffset ?? getElementLabelOffsetCm(element, metadata, zoom)
  const anchor: PlanPoint = {
    x: element.position.x + offset.x,
    y: element.position.y + offset.y,
  }
  const center = getElementWorldCenterCm(element, metadata)
  // Kılavuz yazının altına girmesin: etiket kutusuna girdiği yerde biter.
  const leaderEnd = clipLeaderEndToRectCm(
    center,
    anchor,
    getElementLabelRectCm(anchor, metadata.label, zoom),
  )

  return (
    <>
      <Line
        points={[
          planToThree(center, ELEMENT_LABEL_ELEVATION_CM),
          planToThree(leaderEnd, ELEMENT_LABEL_ELEVATION_CM),
        ]}
        color={PLUMBING_COLORS.elementLabelLeader}
        lineWidth={LEADER_WIDTH_PX}
        dashed
        dashSize={LEADER_DASH_SIZE_CM}
        gapSize={LEADER_DASH_GAP_CM}
        frustumCulled={false}
        renderOrder={RENDER_ORDER.label}
        depthWrite={false}
        toneMapped={false}
        raycast={NO_RAYCAST}
      />
      {/* Ekran-sabit boy ölçekle, fontSize ile değil (bkz. scene/WallDimensionLabels). */}
      <group
        position={planToThree(anchor, ELEMENT_LABEL_ELEVATION_CM)}
        rotation={FLAT_ROTATION}
        scale={1 / zoom}
      >
        <Text
          font={FONT_URL}
          fontSize={ELEMENT_LABEL_SIZE_PX}
          color={PLUMBING_COLORS.elementLabelInk}
          anchorX="center"
          anchorY="middle"
          renderOrder={RENDER_ORDER.label}
          raycast={NO_RAYCAST}
        >
          {metadata.label}
        </Text>
      </group>
    </>
  )
}

type ElementNameLabelsProps = {
  /** Sürüklenen elemanlar; etiket de elemanıyla birlikte kaysın (LengthLabels ile aynı). */
  draggedElementIds?: readonly Id[]
  dragDeltaRef?: RefObject<PlanPoint | null>
}

function VisibleElementNameLabels({ draggedElementIds, dragDeltaRef }: ElementNameLabelsProps) {
  const elements = useCadStore((state) => state.installationElements)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const zoom = useCameraZoom()

  return (
    <group name="element-name-labels">
      {elements
        // Vana gibi etiketsiz türler burada elenir; tutma sınavı aynı kuralı
        // core/elementLabel.ts'ten okur.
        .filter(
          (element) => element.floorId === activeFloorId && hasElementNameLabel(element.type),
        )
        .map((element) => {
          const label = <ElementNameLabel element={element} zoom={zoom} />

          if (!dragDeltaRef || !draggedElementIds?.includes(element.id)) {
            return <Fragment key={element.id}>{label}</Fragment>
          }
          return (
            <DragOffsetGroup key={element.id} deltaRef={dragDeltaRef}>
              {label}
            </DragOffsetGroup>
          )
        })}
    </group>
  )
}

/**
 * Yerleşmiş tesisat elemanlarının ad etiketi + elemana bağlayan kesikli
 * kılavuz. Yalnız AD gösterilir; etiket sürüklenebilir, kayma elemanda saklanır
 * (`labelOffsetCm`). Sürükleme mantığı useSelectionTool'da — burası salt çizim.
 *
 * Kapı gövdeden ayrı bileşen: etiketler kapalıyken hiçbir store aboneliği
 * kurulmaz (LengthLabels ile aynı desen).
 */
export function ElementNameLabels(props: ElementNameLabelsProps) {
  const isElementLabelsVisible = useUiStore((state) => state.isElementLabelsVisible)

  if (!isElementLabelsVisible) return null

  return <VisibleElementNameLabels {...props} />
}
