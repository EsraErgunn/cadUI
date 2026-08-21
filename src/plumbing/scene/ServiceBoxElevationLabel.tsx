import { Fragment, type RefObject } from 'react'

import { DragOffsetGroup } from './InstallationLineMesh'
import { LengthText } from './LengthLabels'
import { ELEMENT_LABEL_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { getLoadedSymbol } from './symbolLoader'
import { useCameraZoom } from './useCameraZoom'
import { planToThree, type PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { getElementElevationLabelAnchorCm } from '../core/elementLabel'
import type { InstallationElement } from '../core/installationModel'
import { formatElevationMeters } from '../core/lengthFormat'
import { getElementElevationCm } from '../core/lineElevation'

/** Kot glifiyle (`PipeElevationGlyph`) AYNI boy ve anahat: ikisi tek bir okuma. */
const ELEVATION_LABEL_SIZE_PX = 15
const ELEVATION_LABEL_OUTLINE_PX = 0.9
const ELEVATION_LABEL_OUTLINE_COLOR = '#ffffff'

function ServiceBoxElevationLabel({
  element,
  elevationCm,
  zoom,
}: {
  element: InstallationElement
  elevationCm: number
  zoom: number
}) {
  const { metadata } = getLoadedSymbol(element.type)
  const anchor = getElementElevationLabelAnchorCm(element, metadata, zoom)

  return (
    <group position={planToThree(anchor, ELEMENT_LABEL_ELEVATION_CM)}>
      <LengthText
        label={formatElevationMeters(elevationCm)}
        zoom={zoom}
        fontSizePx={ELEVATION_LABEL_SIZE_PX}
        color={PLUMBING_COLORS.pipeElevationLabel}
        outlineWidthPx={ELEVATION_LABEL_OUTLINE_PX}
        outlineColor={ELEVATION_LABEL_OUTLINE_COLOR}
      />
    </group>
  )
}

type ServiceBoxElevationLabelsProps = {
  /** Sürüklenen elemanlar; etiket de kutusuyla kaysın (ElementNameLabels ile aynı). */
  draggedElementIds?: readonly Id[]
  dragDeltaRef?: RefObject<PlanPoint | null>
}

/**
 * Servis kutusunun ÇIKIŞ kotu, sembolünün altında (`+0,15 m`). Tesisat kotunun
 * BAŞLADIĞI yer burası: kutunun kotu bilinmeden borudaki `▲`/`▼` farkları neye
 * göre okunacağı belirsiz kalıyordu (kullanıcı isteği, 2026-08).
 *
 * "Ölçüler" anahtarına BAĞLI DEĞİL — `PipeElevationGlyph` ile aynı kural (K129):
 * kot göstergesi kaybolmaz. Kot store'da DURMAZ, `getElementElevationCm` ile
 * türetilir (K102); kutu henüz boru çizilmemişken bile kendi tohum kotunu döner.
 *
 * Yalnız servis kutusu: sayaç/cihaz kotu bağlı olduğu borudan okunuyor ve her
 * elemana kot yazmak planı sayıya boğardı.
 */
export function ServiceBoxElevationLabels({
  draggedElementIds,
  dragDeltaRef,
}: ServiceBoxElevationLabelsProps) {
  const elements = useCadStore((state) => state.installationElements)
  const lines = useCadStore((state) => state.installationLines)
  const connections = useCadStore((state) => state.installationConnections)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const zoom = useCameraZoom()

  return (
    <group name="service-box-elevation-labels">
      {elements
        .filter(
          (element) => element.floorId === activeFloorId && element.type === 'serviceBox',
        )
        .map((element) => {
          const label = (
            <ServiceBoxElevationLabel
              element={element}
              elevationCm={getElementElevationCm(element.id, lines, connections, elements)}
              zoom={zoom}
            />
          )

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
