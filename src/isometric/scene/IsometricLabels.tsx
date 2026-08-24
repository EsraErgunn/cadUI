import { useCallback, useMemo } from 'react'

import { IsometricLabel, LABEL_LINE_HEIGHT, LABEL_SIZE_PX } from './IsometricLabel'
import { ISOMETRIC_DIMMED_OPACITY } from './isometricTheme'
import type { PlanPoint, ThreePosition } from '../../core/coords'
import type { Id } from '../../core/model'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import { useCameraZoom } from '../../scene/useCameraZoom'
import { useCadStore } from '../../store/cadStore'
import type { IsometricElevationContext } from '../core/isometricElevation'
import { layoutIsometricLabels } from '../core/isometricLabelLayout'
import type { IsometricLabelRequest } from '../core/isometricLabelLayout'
import {
  ELEMENT_LABEL_DISTANCE_FACTOR,
  LINE_LABEL_DISTANCE_FACTOR,
  getIsometricElementLabelLines,
  getIsometricLineLabelAnchor,
  getIsometricLineLabelLines,
  isConsumptionLine,
} from '../core/isometricLabels'
import type { IsometricLineGeometry, IsometricSceneData } from '../core/isometricModel'
import { getCameraProjection, type IsometricAngles } from '../core/isometricProjection'

/** Etiketler arası açının en az kaç satır boyu olacağı; yazı+nefes payı. */
const LABEL_SEPARATION_EXTRA_LINES = 1

const ZERO_OFFSET_CM: PlanPoint = { x: 0, y: 0 }

type IsometricLabelsProps = {
  scene: IsometricSceneData
  lines: readonly InstallationLine[]
  elements: readonly InstallationElement[]
  connections: readonly InstallationConnection[]
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
  connections,
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

  /**
   * Etiket YALNIZ tüketim noktasına varan hatlarda (kullanıcı kararı). Bir
   * binada gövde borusu onlarca parçaya bölünüyor; hepsine boy/çap yazılınca
   * çizim rakam bulutuna dönüyordu. Sıra numarası da süzülmüş liste üzerinden
   * verilir — atlamalı numaralar ("1, 4, 9") kullanıcıya anlamsız gelirdi.
   */
  const labelledLines = useMemo(() => {
    const matched: { geometry: IsometricLineGeometry; line: InstallationLine; order: number }[] = []
    for (const geometry of scene.lines) {
      const line = lines.find((candidate) => candidate.id === geometry.lineId)
      if (!line || !isConsumptionLine(line, elements, connections)) continue
      matched.push({ geometry, line, order: matched.length + 1 })
    }
    return matched
  }, [connections, elements, lines, scene.lines])

  /**
   * Her etiketin metni ve çapası; halka yerleşimi bunların hepsini BİRLİKTE
   * görmek zorunda, yoksa hat ile eleman etiketleri birbirini bilmeden aynı
   * açıya oturur.
   */
  const entries = useMemo(() => {
    const built: {
      key: string
      anchor: ThreePosition
      textLines: string[]
      distanceFactor: number
      lineId: Id | null
      commit: (offsetCm: PlanPoint) => void
      storedOffsetCm: PlanPoint | undefined
    }[] = []

    for (const { geometry, line, order } of labelledLines) {
      const anchor = getIsometricLineLabelAnchor(geometry.positions)
      if (!anchor) continue
      built.push({
        key: `line-${geometry.lineId}`,
        anchor,
        textLines: getIsometricLineLabelLines(line, order, context),
        distanceFactor: LINE_LABEL_DISTANCE_FACTOR,
        lineId: geometry.lineId,
        commit: commitLineOffset(geometry.lineId),
        storedOffsetCm: line.isometricLabelOffsetCm,
      })
    }

    for (const placement of scene.elements) {
      const element = elements.find((candidate) => candidate.id === placement.elementId)
      if (!element) continue
      built.push({
        key: `element-${placement.elementId}`,
        anchor: placement.position,
        textLines: getIsometricElementLabelLines(element),
        distanceFactor: ELEMENT_LABEL_DISTANCE_FACTOR,
        lineId: null,
        commit: commitElementOffset(placement.elementId),
        storedOffsetCm: element.isometricLabelOffsetCm,
      })
    }

    return built
  }, [commitElementOffset, commitLineOffset, context, elements, labelledLines, scene.elements])

  /**
   * Ayırma payı ekran boyundan gelir: yazı ekran-sabit çizildiği için iki
   * etiketin çakışmaması gereken mesafe de piksel cinsindendir, dünya cm'ine
   * zoom ile çevrilir. En uzun künye kaç satırsa pay ona göre.
   */
  const minSeparationCm = useMemo(() => {
    const maxLines = entries.reduce((longest, entry) => Math.max(longest, entry.textLines.length), 1)
    return ((maxLines + LABEL_SEPARATION_EXTRA_LINES) * LABEL_SIZE_PX * LABEL_LINE_HEIGHT) / zoom
  }, [entries, zoom])

  const placements = useMemo(() => {
    if (!scene.bounds) return new Map<string, PlanPoint>()

    const requests: IsometricLabelRequest[] = entries.map((entry) => ({
      key: entry.key,
      anchor: entry.anchor,
      distanceFactor: entry.distanceFactor,
    }))
    return layoutIsometricLabels(
      requests,
      scene.bounds.center,
      getCameraProjection(angles),
      scene.bounds.sizeCm,
      minSeparationCm,
    )
  }, [angles, entries, minSeparationCm, scene.bounds])

  const opacityOf = (lineId: Id | null) =>
    highlightedLineId === null || highlightedLineId === lineId ? 1 : ISOMETRIC_DIMMED_OPACITY

  if (!scene.bounds) return null

  return (
    <>
      {entries.map((entry) => (
        <IsometricLabel
          key={entry.key}
          anchor={entry.anchor}
          lines={entry.textLines}
          // Kullanıcı taşıdıysa onun yeri; taşımadıysa halka yerleşimi.
          offsetCm={entry.storedOffsetCm ?? placements.get(entry.key) ?? ZERO_OFFSET_CM}
          angles={angles}
          zoom={zoom}
          opacity={opacityOf(entry.lineId)}
          isDraggable={isDraggable}
          onCommitOffsetCm={entry.commit}
        />
      ))}
    </>
  )
}
