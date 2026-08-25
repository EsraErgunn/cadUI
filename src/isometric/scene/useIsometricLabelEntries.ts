import { useCallback, useMemo } from 'react'

import { getIsometricLineColor, ISOMETRIC_COLORS } from './isometricTheme'
import type { PlanPoint, ThreePosition } from '../../core/coords'
import type { Id } from '../../core/model'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import { useCadStore } from '../../store/cadStore'
import type { IsometricElevationContext } from '../core/isometricElevation'
import {
  ELEMENT_LABEL_DISTANCE_FACTOR,
  LINE_LABEL_DISTANCE_FACTOR,
} from '../core/isometricLabelLayout'
import {
  getIsometricElementLabelLines,
  getIsometricLineLabelAnchor,
  getIsometricLineLabelLines,
  getIsometricRiseLabel,
  hasIsometricElementLabel,
  isConsumptionLine,
} from '../core/isometricLabels'
import type { IsometricLineGeometry, IsometricSceneData } from '../core/isometricModel'

export type IsometricLabelEntry = {
  key: string
  anchor: ThreePosition
  textLines: string[]
  color: string
  /**
   * Künye hangi HALKAYA oturacak (K170). `null` → halkaya girmez, kendi
   * çapasının yanında kalır: yükseklik etiketi bir ÖLÇÜ, ölçülen parçadan
   * uzağa taşınamaz.
   */
  distanceFactor: number | null
  /** Hangi nesnenin etiketi — soluklaştırma kuralı buradan okunur. */
  lineId: Id | null
  elementId: Id | null
  /** Taşınamayan etikette (yükseklik) YOK — saklanacak bir alanı da yok. */
  commit: ((offsetCm: PlanPoint) => void) | undefined
  storedOffsetCm: PlanPoint | undefined
}

type LabelEntriesInput = {
  scene: IsometricSceneData
  lines: readonly InstallationLine[]
  elements: readonly InstallationElement[]
  connections: readonly InstallationConnection[]
  context: IsometricElevationContext
  highlightedLineId: Id | null
}

/**
 * Etiketlerin metni, çapası ve rengi. Yerleşim hepsini BİRLİKTE görmek zorunda
 * (yoksa hat ile eleman etiketleri birbirini bilmeden aynı yere oturur), o
 * yüzden tek listede toplanıyor.
 *
 * Bileşenden ayrı dosyada: `IsometricLabels` yalnız bağlama, yerleşim ve
 * sürüklemeyle kalsın — üçü bir arada 200 satırı aşıyordu.
 */
export function useIsometricLabelEntries({
  scene,
  lines,
  elements,
  connections,
  context,
  highlightedLineId,
}: LabelEntriesInput): IsometricLabelEntry[] {
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
   * KALICI künye yalnız tüketim noktasına varan hatlarda (kullanıcı kararı).
   * Bir binada gövde borusu onlarca parçaya bölünüyor; hepsine boy/çap
   * yazılınca çizim rakam bulutuna dönüyordu. Sıra numarası da süzülmüş liste
   * üzerinden verilir — atlamalı numaralar ("1, 4, 9") anlamsız gelirdi.
   *
   * VURGULANAN hat bu süzgecin DIŞINDA: tıklanan her boru künyesini açar,
   * numarasız (yukarıdaki sırayı bozmasın diye).
   */
  const labelledLines = useMemo(() => {
    const matched: {
      geometry: IsometricLineGeometry
      line: InstallationLine
      /** Numarasız etiket = tıklanarak geçici olarak açılan ara boru. */
      order: number | null
    }[] = []
    let consumptionCount = 0

    for (const geometry of scene.lines) {
      const line = lines.find((candidate) => candidate.id === geometry.lineId)
      if (!line) continue

      if (isConsumptionLine(line, elements, connections)) {
        consumptionCount += 1
        matched.push({ geometry, line, order: consumptionCount })
        continue
      }
      // Tüketime varmayan ara boru da TIKLANINCA künyesini açar (kullanıcı
      // isteği, 2026-08). Kalıcı yazılsaydı K156'nın kaldırdığı kalabalık geri
      // gelirdi; vurgu geçici olduğu için çizim yine sade kalıyor.
      if (geometry.lineId === highlightedLineId) {
        matched.push({ geometry, line, order: null })
      }
    }
    return matched
  }, [connections, elements, highlightedLineId, lines, scene.lines])

  return useMemo(() => {
    const built: IsometricLabelEntry[] = []

    for (const { geometry, line, order } of labelledLines) {
      const anchor = getIsometricLineLabelAnchor(geometry.positions)
      if (!anchor) continue
      built.push({
        key: `line-${geometry.lineId}`,
        anchor,
        textLines: getIsometricLineLabelLines(line, order, context),
        // Boruya ait yazı borunun RENGİNDE (kullanıcı isteği, 2026-08): çap
        // zaten renkten okunuyor (K27), etiket nötr kalınca hangi hattın
        // künyesi olduğu ancak kılavuz çizgisi izlenerek bulunuyordu.
        color: getIsometricLineColor(geometry),
        distanceFactor: LINE_LABEL_DISTANCE_FACTOR,
        lineId: geometry.lineId,
        elementId: null,
        commit: commitLineOffset(geometry.lineId),
        storedOffsetCm: line.isometricLabelOffsetCm,
      })
    }

    /**
     * Yükseklik etiketi TÜKETİM süzgecinin DIŞINDA: kot değiştiren her hatta
     * yazılır. Kolon gövde borusunun bir parçasıdır ve `isConsumptionLine` onu
     * eler — süzgece bağlansaydı binanın asıl yükselişleri yazısız kalırdı.
     */
    for (const geometry of scene.lines) {
      const line = lines.find((candidate) => candidate.id === geometry.lineId)
      if (!line) continue

      const rise = getIsometricRiseLabel(line, geometry, context)
      if (!rise) continue

      built.push({
        key: rise.key,
        anchor: rise.anchor,
        textLines: [rise.text],
        color: getIsometricLineColor(geometry),
        distanceFactor: null,
        lineId: rise.lineId,
        elementId: null,
        // Taşınmaz: hattın tek `isometricLabelOffsetCm` alanı künyeye ait,
        // yükseklik onu da birlikte kaydırırdı.
        commit: undefined,
        storedOffsetCm: undefined,
      })
    }

    for (const placement of scene.elements) {
      const element = elements.find((candidate) => candidate.id === placement.elementId)
      if (!element) continue
      // Vana/filtre/manometre gibi künyesiz armatürler EKRANDA da susar (K170,
      // kullanıcı isteği "vana etiketi olmasın"): etiketleri sembolün zaten
      // söylediği adı tekrarlıyor ve çok katlı binada onlarca satıra çıkıyordu.
      // Kâğıt bu kuralı K156'dan beri uyguluyordu; ekranın ayrı kalması için
      // öne sürülen gerekçe (etiket gezinmeye yarıyor) kullanıcıda tutmadı.
      if (!hasIsometricElementLabel(element)) continue

      built.push({
        key: `element-${placement.elementId}`,
        anchor: placement.position,
        textLines: getIsometricElementLabelLines(element),
        // Eleman künyesi NÖTR: sembolün kendi çizimi var, künyeyi de boyamak
        // çizimde ikinci bir renk kodu doğururdu.
        color: ISOMETRIC_COLORS.label,
        distanceFactor: ELEMENT_LABEL_DISTANCE_FACTOR,
        lineId: null,
        elementId: element.id,
        commit: commitElementOffset(placement.elementId),
        storedOffsetCm: element.isometricLabelOffsetCm,
      })
    }

    return built
  }, [
    commitElementOffset,
    commitLineOffset,
    context,
    elements,
    labelledLines,
    lines,
    scene.elements,
    scene.lines,
  ])
}
