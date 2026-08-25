import { useCallback, useMemo } from 'react'

import {
  GLYPH_WIDTH_RATIO,
  IsometricLabel,
  LABEL_LINE_HEIGHT,
  LABEL_SIZE_PX,
} from './IsometricLabel'
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
import { getConnectedElementIds } from '../core/isometricHighlight'
import { layoutLabelsBesideAnchors } from '../core/isometricLabelPlacement'
import type { LabelBox } from '../core/isometricLabelPlacement'
import {
  getIsometricElementLabelLines,
  getIsometricLineLabelAnchor,
  getIsometricLineLabelLines,
  isConsumptionLine,
} from '../core/isometricLabels'
import type { IsometricLineGeometry, IsometricSceneData } from '../core/isometricModel'
import { getCameraProjection, type IsometricAngles } from '../core/isometricProjection'

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
 * Etiket METNİ ve YERLEŞİMİ `core/`de üretiliyor: burada yalnız bağlama ve
 * sürükleme var. Çekirdekte olmasaydı testi olmazdı.
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
   * Vurgu varken SOLMAYACAK elemanlar: vurgulanan hattın uçlarındakiler.
   * Sembolleriyle aynı kural (`IsometricLayer`) — cihaz soluk dururken künyesi
   * tam opak kalsaydı ekranda sahipsiz bir yazı asılı olurdu.
   */
  const connectedElementIds = useMemo(
    () =>
      highlightedLineId === null ? null : getConnectedElementIds(highlightedLineId, connections),
    [connections, highlightedLineId],
  )

  /**
   * Her etiketin metni ve çapası; yerleşim hepsini BİRLİKTE görmek zorunda,
   * yoksa hat ile eleman etiketleri birbirini bilmeden aynı yere oturur.
   */
  const entries = useMemo(() => {
    const built: {
      key: string
      anchor: ThreePosition
      textLines: string[]
      /** Hangi nesnenin etiketi — soluklaştırma kuralı buradan okunur. */
      lineId: Id | null
      elementId: Id | null
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
        lineId: geometry.lineId,
        elementId: null,
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
        lineId: null,
        elementId: element.id,
        commit: commitElementOffset(placement.elementId),
        storedOffsetCm: element.isometricLabelOffsetCm,
      })
    }

    return built
  }, [commitElementOffset, commitLineOffset, context, elements, labelledLines, scene.elements])

  /**
   * Yerleşim KÂĞITLA ORTAK (K167): etiket kendi nesnesinin yanında durur,
   * çakışanlar itilerek ayrılır. Önce halka yerleşimi vardı — etiket sayısı
   * arttıkça çember büyüyüp çizim ortada küçülüyordu.
   *
   * Kutu ölçüsü ZOOM'a bağlı: yazı ekran-sabit boyda çiziliyor, yani dünya
   * cinsinden boyu px/zoom. Sabit bir cm alınsaydı yakınlaşınca etiketler
   * gereksiz yere ayrılırdı.
   */
  const placements = useMemo(() => {
    if (!scene.bounds || entries.length === 0) return new Map<string, PlanPoint>()

    const labelSizeCm = LABEL_SIZE_PX / zoom
    const projection = getCameraProjection(angles)
    const boxes: LabelBox[] = entries.map((entry) => ({
      key: entry.key,
      anchor: projection.project(entry.anchor),
      widthCm:
        Math.max(...entry.textLines.map((text) => text.length)) * labelSizeCm * GLYPH_WIDTH_RATIO,
      heightCm: entry.textLines.length * labelSizeCm * LABEL_LINE_HEIGHT,
    }))

    return layoutLabelsBesideAnchors(
      boxes,
      projection.project(scene.bounds.center),
      labelSizeCm,
    )
  }, [angles, entries, scene.bounds, zoom])

  /**
   * Soluklaştırma yerleşimin DIŞINDA: `entries`ye girseydi her tıklamada
   * yerleşim yeniden hesaplanırdı (sonuç aynı, iş boşuna).
   */
  const isDimmed = (entry: { lineId: Id | null; elementId: Id | null }) => {
    if (highlightedLineId === null) return false
    if (entry.lineId !== null) return entry.lineId !== highlightedLineId
    return entry.elementId !== null && !connectedElementIds?.has(entry.elementId)
  }

  if (!scene.bounds) return null

  return (
    <>
      {entries.map((entry) => (
        <IsometricLabel
          key={entry.key}
          anchor={entry.anchor}
          lines={entry.textLines}
          // Kullanıcı taşıdıysa onun yeri; taşımadıysa otomatik yerleşim.
          offsetCm={entry.storedOffsetCm ?? placements.get(entry.key) ?? ZERO_OFFSET_CM}
          angles={angles}
          zoom={zoom}
          opacity={isDimmed(entry) ? ISOMETRIC_DIMMED_OPACITY : 1}
          isDraggable={isDraggable}
          onCommitOffsetCm={entry.commit}
        />
      ))}
    </>
  )
}
