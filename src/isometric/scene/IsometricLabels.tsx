import { useCallback } from 'react'

import { IsometricLabel } from './IsometricLabel'
import { ISOMETRIC_DIMMED_OPACITY } from './isometricTheme'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import type {
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import { useCameraZoom } from '../../scene/useCameraZoom'
import { useCadStore } from '../../store/cadStore'
import type { IsometricElevationContext } from '../core/isometricElevation'
import {
  ELEMENT_LABEL_DISTANCE_FACTOR,
  LINE_LABEL_DISTANCE_FACTOR,
  getIsometricElementLabelLines,
  getIsometricLabelOffsetCm,
  getIsometricLineLabelAnchor,
  getIsometricLineLabelLines,
} from '../core/isometricLabels'
import type { IsometricSceneData } from '../core/isometricModel'
import type { IsometricAngles } from '../core/isometricProjection'

type IsometricLabelsProps = {
  scene: IsometricSceneData
  lines: readonly InstallationLine[]
  elements: readonly InstallationElement[]
  context: IsometricElevationContext
  angles: IsometricAngles
  highlightedLineId: Id | null
  isDraggable: boolean
}

/**
 * Hat ve eleman etiketleri. drei `<Text>` troika'nın font indirmesiyle ASKIYA
 * ALINIR — bu yüzden çağıran taraf bu bileşeni KENDİ `<Suspense>`'ine sarar;
 * yoksa askıya alma izometrik kamerayı da söker ve `makeDefault` geri alınır
 * (bkz. IsometricLayer).
 *
 * Etiket METNİ ve varsayılan YERİ `core/isometricLabels.ts`'te üretiliyor:
 * burada yalnız bağlama ve sürükleme var. Çekirdekte olmasaydı testi olmazdı.
 */
export function IsometricLabels({
  scene,
  lines,
  elements,
  context,
  angles,
  highlightedLineId,
  isDraggable,
}: IsometricLabelsProps) {
  const zoom = useCameraZoom()
  const setLineIsometricLabelOffset = useCadStore((state) => state.setLineIsometricLabelOffset)
  const setElementIsometricLabelOffset = useCadStore(
    (state) => state.setElementIsometricLabelOffset,
  )

  const commitLineOffset = useCallback(
    (lineId: Id) => (offsetCm: PlanPoint) => setLineIsometricLabelOffset(lineId, offsetCm),
    [setLineIsometricLabelOffset],
  )
  const commitElementOffset = useCallback(
    (elementId: Id) => (offsetCm: PlanPoint) =>
      setElementIsometricLabelOffset(elementId, offsetCm),
    [setElementIsometricLabelOffset],
  )

  const opacityOf = (lineId: Id | null) =>
    highlightedLineId === null || highlightedLineId === lineId ? 1 : ISOMETRIC_DIMMED_OPACITY

  // Çizim boşsa etiket de yoktur; ışınsal yerleşimin merkezi ve ölçeği buradan.
  if (!scene.bounds) return null
  const { center, sizeCm } = scene.bounds

  return (
    <>
      {scene.lines.map((geometry, order) => {
        const anchor = getIsometricLineLabelAnchor(geometry.positions)
        if (!anchor) return null

        const line = lines.find((candidate) => candidate.id === geometry.lineId)
        if (!line) return null

        return (
          <IsometricLabel
            key={`line-${geometry.lineId}`}
            anchor={anchor}
            // Sıra 1'den başlar: kullanıcıya gösterilen numara, id DEĞİL.
            lines={getIsometricLineLabelLines(line, order + 1, context)}
            offsetCm={
              line.isometricLabelOffsetCm ??
              getIsometricLabelOffsetCm(anchor, center, angles, sizeCm, LINE_LABEL_DISTANCE_FACTOR)
            }
            angles={angles}
            zoom={zoom}
            opacity={opacityOf(geometry.lineId)}
            isDraggable={isDraggable}
            onCommitOffsetCm={commitLineOffset(geometry.lineId)}
          />
        )
      })}

      {scene.elements.map((placement) => {
        const element = elements.find((candidate) => candidate.id === placement.elementId)
        if (!element) return null

        return (
          <IsometricLabel
            key={`element-${placement.elementId}`}
            anchor={placement.position}
            lines={getIsometricElementLabelLines(element)}
            offsetCm={
              element.isometricLabelOffsetCm ??
              getIsometricLabelOffsetCm(
                placement.position,
                center,
                angles,
                sizeCm,
                ELEMENT_LABEL_DISTANCE_FACTOR,
              )
            }
            angles={angles}
            zoom={zoom}
            // Eleman etiketleri hatta bağlı değil; vurgu varken hepsi solar.
            opacity={opacityOf(null)}
            isDraggable={isDraggable}
            onCommitOffsetCm={commitElementOffset(placement.elementId)}
          />
        )
      })}
    </>
  )
}
