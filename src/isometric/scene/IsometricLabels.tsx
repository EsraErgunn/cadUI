import { useMemo } from 'react'

import {
  GLYPH_WIDTH_RATIO,
  IsometricLabel,
  LABEL_LINE_HEIGHT,
  LABEL_SIZE_PX,
} from './IsometricLabel'
import { ISOMETRIC_DIMMED_OPACITY } from './isometricTheme'
import { useIsometricLabelEntries } from './useIsometricLabelEntries'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import { useCameraZoom } from '../../scene/useCameraZoom'
import type { IsometricElevationContext } from '../core/isometricElevation'
import { getConnectedElementIds } from '../core/isometricHighlight'
import {
  layoutIsometricLabels,
  LINE_LABEL_DISTANCE_FACTOR,
} from '../core/isometricLabelLayout'
import { layoutLabelsBesideAnchors } from '../core/isometricLabelPlacement'
import type { LabelBox } from '../core/isometricLabelPlacement'
import type { IsometricSceneData } from '../core/isometricModel'
import { getCameraProjection, type IsometricAngles } from '../core/isometricProjection'

/** Halkadaki etiketler arası açının en az kaç satır boyu olacağı; nefes payı. */
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
  const entries = useIsometricLabelEntries({
    scene,
    lines,
    elements,
    connections,
    context,
    highlightedLineId,
  })

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
   * Künyeler çizimin çevresinde bir HALKAYA dizilir (K170, kullanıcı isteği:
   * "güzel dağıt onları önceki gibi, sadece daha yakın olsunlar"). Halka
   * K167'de kaldırılıp kâğıdın "nesnenin yanında" yerleşimine geçilmişti;
   * ekranda etiketler o düzende karışık okunuyordu. Geri gelen halkanın
   * yarıçapı ESKİSİNDEN çok daha küçük — eski kusur mesafedeydi, düzende değil.
   *
   * ⚠️ KÂĞIT hâlâ `layoutLabelsBesideAnchors` kullanıyor (K156): orada halka
   * on kılavuz çizgisini çizimin üstünden geçiriyordu ve karar ölçülmüştü.
   *
   * Yükseklik etiketleri halkaya GİRMEZ (`distanceFactor === null`): onlar
   * künye değil ÖLÇÜ, ölçtükleri parçanın yanında kalmak zorundalar.
   */
  const placements = useMemo(() => {
    if (!scene.bounds || entries.length === 0) return new Map<string, PlanPoint>()

    const labelSizeCm = LABEL_SIZE_PX / zoom
    const projection = getCameraProjection(angles)

    // Ayırma payı EKRAN boyundan: yazı ekran-sabit çizildiği için iki etiketin
    // çakışmama mesafesi de piksel cinsinden, dünya cm'ine zoom ile çevriliyor.
    const maxLines = entries.reduce(
      (longest, entry) => Math.max(longest, entry.textLines.length),
      1,
    )
    const minSeparationCm =
      ((maxLines + LABEL_SEPARATION_EXTRA_LINES) * LABEL_SIZE_PX * LABEL_LINE_HEIGHT) / zoom

    const placed = layoutIsometricLabels(
      entries
        .filter((entry) => entry.distanceFactor !== null)
        .map((entry) => ({
          key: entry.key,
          anchor: entry.anchor,
          distanceFactor: entry.distanceFactor ?? LINE_LABEL_DISTANCE_FACTOR,
        })),
      scene.bounds.center,
      projection,
      scene.bounds.sizeCm,
      minSeparationCm,
    )

    // Halka dışında kalanlar (yükseklik) kendi çapalarının yanına yerleşir;
    // birbirleriyle çakışmasınlar diye yine itmeli yerleşimden geçerler.
    const besideBoxes: LabelBox[] = entries
      .filter((entry) => entry.distanceFactor === null)
      .map((entry) => ({
        key: entry.key,
        anchor: projection.project(entry.anchor),
        widthCm:
          Math.max(...entry.textLines.map((text) => text.length)) * labelSizeCm * GLYPH_WIDTH_RATIO,
        heightCm: entry.textLines.length * labelSizeCm * LABEL_LINE_HEIGHT,
      }))
    const beside = layoutLabelsBesideAnchors(
      besideBoxes,
      projection.project(scene.bounds.center),
      labelSizeCm,
    )
    for (const [key, offsetCm] of beside) placed.set(key, offsetCm)

    return placed
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
          color={entry.color}
          opacity={isDimmed(entry) ? ISOMETRIC_DIMMED_OPACITY : 1}
          isDraggable={isDraggable}
          onCommitOffsetCm={entry.commit}
        />
      ))}
    </>
  )
}
