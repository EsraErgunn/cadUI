import { Text } from '@react-three/drei'
import { Fragment, type RefObject } from 'react'

import { DragOffsetGroup } from './InstallationLineMesh'
import { FONT_URL } from './LengthLabels'
import { ELEMENT_LABEL_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { useCameraZoom } from './useCameraZoom'
import { useDraggedCorners, type DraggedCorner } from './useDraggedCorners'
import { useLinePointPositions } from './useLinePointPositions'
import { planToThree, type PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { RENDER_ORDER } from '../../scene/layers'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { ELEMENT_LABEL_SIZE_PX } from '../core/elementLabel'
import type { InstallationLine } from '../core/installationModel'
import { getLineDescriptionLabel, getLineLabelAnchorCm } from '../core/lineLabel'

/** Plan düzlemine yatırma: kamera tepeden bakıyor, dik duran yazı görünmezdi. */
const FLAT_ROTATION: readonly [number, number, number] = [-Math.PI / 2, 0, 0]

/** Etiket tıklanmaz; hat tutması saf geometriyle yapılıyor. */
const NO_RAYCAST = () => null

/**
 * Açıklama, ölçü etiketinin KARŞI tarafına kayar (bu yüzden eksi): ikisi aynı
 * yönde olsaydı "1,20 m · DN25" ile açıklama üst üste binerdi. Payı ölçününkinden
 * geniş, çünkü açıklama iki satır.
 */
const DESCRIPTION_OFFSET_PX = -20

type LineDescriptionLabelProps = {
  line: InstallationLine
  label: string
  zoom: number
  draggedCorner: DraggedCorner | undefined
}

function LineDescriptionLabel({ line, label, zoom, draggedCorner }: LineDescriptionLabelProps) {
  const positions = useLinePointPositions(line, draggedCorner)
  const anchor = getLineLabelAnchorCm(
    line.points.map((point) => positions.get(point.id) ?? point.position),
    DESCRIPTION_OFFSET_PX / zoom,
  )
  if (!anchor) return null

  return (
    // Ekran-sabit boy ölçekle, fontSize ile değil (bkz. scene/WallDimensionLabels).
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
        textAlign="center"
        renderOrder={RENDER_ORDER.label}
        raycast={NO_RAYCAST}
      >
        {label}
      </Text>
    </group>
  )
}

type LineDescriptionLabelsProps = {
  /** Sürüklenen hatlar; etiket de hattıyla birlikte kaysın (LengthLabels ile aynı). */
  draggedLineIds?: readonly Id[]
  dragDeltaRef?: RefObject<PlanPoint | null>
}

function VisibleLineDescriptionLabels({
  draggedLineIds,
  dragDeltaRef,
}: LineDescriptionLabelsProps) {
  const lines = useCadStore((state) => state.installationLines)
  const connections = useCadStore((state) => state.installationConnections)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const draggedCorners = useDraggedCorners(lines, connections)
  const zoom = useCameraZoom()

  return (
    <group name="line-description-labels">
      {lines
        .filter((line) => line.floorId === activeFloorId)
        .map((line) => {
          // Açıklaması boş olan hat etiket üretmez (bkz. core/lineLabel.ts).
          const label = getLineDescriptionLabel(line)
          if (label === null) return null

          const element = (
            <LineDescriptionLabel
              line={line}
              label={label}
              zoom={zoom}
              draggedCorner={draggedCorners.get(line.id)}
            />
          )

          if (!dragDeltaRef || !draggedLineIds?.includes(line.id)) {
            return <Fragment key={line.id}>{element}</Fragment>
          }
          return (
            <DragOffsetGroup key={line.id} deltaRef={dragDeltaRef}>
              {element}
            </DragOffsetGroup>
          )
        })}
    </group>
  )
}

/**
 * Boruların ADI + ÖZELLİK PANELİNDE girilen açıklaması, eleman ad etiketleriyle
 * AYNI anahtardan ("Eleman adları") ve aynı biçimde çizilir — kullanıcı için
 * ikisi tek bir "adlar" katmanı.
 *
 * Elemanınkinin aksine SÜRÜKLENEMEZ: hat modeli plan tarafında `labelOffsetCm`
 * taşımıyor, uydurulmadı. Çakışma olursa etiket hattın orta bölümünde kalır.
 *
 * Kapı gövdeden ayrı bileşen: etiketler kapalıyken hiçbir store aboneliği
 * kurulmaz (LengthLabels ile aynı desen).
 */
export function LineDescriptionLabels(props: LineDescriptionLabelsProps) {
  const isElementLabelsVisible = useUiStore((state) => state.isElementLabelsVisible)

  if (!isElementLabelsVisible) return null

  return <VisibleLineDescriptionLabels {...props} />
}
