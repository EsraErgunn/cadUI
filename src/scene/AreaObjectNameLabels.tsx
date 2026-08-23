import { Line, Text } from '@react-three/drei'
import { Fragment } from 'react'

import { ARCHITECTURE_COLORS } from './architectureTheme'
import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { useCameraZoom } from './useCameraZoom'
import type { AreaObjectShape } from '../core/areaObject'
import {
  AREA_OBJECT_LABEL_SIZE_PX,
  getAreaObjectLabelOffsetCm,
  getAreaObjectLabelRectCm,
  getAreaObjectNameLabel,
  getAreaObjectWorldBoundsCm,
  hasAreaObjectNameLabel,
} from '../core/areaObjectLabel'
import { planToThree, type PlanPoint } from '../core/coords'
import { clipLeaderEndToRectCm } from '../core/labelLeader'
import type { AreaObject } from '../core/model'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

/** RoomLabel ile aynı yazı tipi; mimari tarafın kendi sabiti. */
const FONT_URL = '/fonts/roboto-regular.woff'

/** Plan düzlemine yatırma: kamera tepeden bakıyor, dik duran yazı görünmezdi. */
const FLAT_ROTATION: readonly [number, number, number] = [-Math.PI / 2, 0, 0]

/** Etiket tutması saf geometriyle (core/areaObjectLabel.ts); ışın hedefi değildir. */
const NO_RAYCAST = () => null

/** Kılavuz deseni dünya biriminde — ekranı sabit taramasın. */
const LEADER_DASH_SIZE_CM = 6
const LEADER_DASH_GAP_CM = 4
const LEADER_WIDTH_PX = 1.2

type AreaObjectNameLabelProps = {
  areaObject: AreaObject
  /** Sürükleme/tutamaç sırasında ÖNİZLENEN şekil; etiket ona yapışık kalsın. */
  shape: AreaObjectShape
  zoom: number
}

function AreaObjectNameLabel({ areaObject, shape, zoom }: AreaObjectNameLabelProps) {
  // Sürüklenen etiket geçici kaymasıyla çizilir; cadStore bırakılınca yazılır.
  const draggingOffset = useArchitectureUiStore((state) =>
    state.draggingAreaObjectLabel?.areaObjectId === areaObject.id
      ? state.draggingAreaObjectLabel.offsetCm
      : null,
  )

  const bounds = getAreaObjectWorldBoundsCm(areaObject.type, shape)
  // Varsayılan kayma ÖNİZLENEN şekilden hesaplanır: nesne büyütülürken etiket
  // kutunun üstünde kalmalı. Hesap core'dan geliyor — tutma sınavı da aynı
  // fonksiyonu okuyor, ayrışsalar görünmez bir etiket tutulabilir olurdu.
  const offset =
    draggingOffset ?? getAreaObjectLabelOffsetCm({ ...areaObject, ...shape }, zoom)

  const anchor: PlanPoint = { x: shape.x + offset.x, y: shape.y + offset.y }
  const center: PlanPoint = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  const text = getAreaObjectNameLabel(areaObject.type)
  // Kılavuz yazının altına girmesin: etiket kutusuna girdiği yerde biter.
  const leaderEnd = clipLeaderEndToRectCm(
    center,
    anchor,
    getAreaObjectLabelRectCm(anchor, text, zoom),
  )

  return (
    <>
      <Line
        points={[
          planToThree(center, HANDLE_ELEVATION_CM),
          planToThree(leaderEnd, HANDLE_ELEVATION_CM),
        ]}
        color={ARCHITECTURE_COLORS.areaObjectLabel}
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
      {/* Ekran-sabit boy ölçekle, fontSize ile değil (bkz. WallDimensionLabels). */}
      <group
        position={planToThree(anchor, HANDLE_ELEVATION_CM)}
        rotation={FLAT_ROTATION}
        scale={1 / zoom}
      >
        <Text
          font={FONT_URL}
          fontSize={AREA_OBJECT_LABEL_SIZE_PX}
          color={ARCHITECTURE_COLORS.areaObjectLabel}
          anchorX="center"
          anchorY="middle"
          renderOrder={RENDER_ORDER.label}
          raycast={NO_RAYCAST}
        >
          {text}
        </Text>
      </group>
    </>
  )
}

/**
 * Alan nesnelerinin AD etiketi + nesneye bağlayan kesikli kılavuz. Yazan şey
 * TÜRÜN adı ("Kolon"), nesnenin `label` kodu değil: kullanıcı "ne olduğu
 * anlaşılsın" istedi. Merdiven etiketsiz — oku ve basamakları zaten anlatıyor.
 *
 * Etiket sürüklenebilir, kayma nesnede saklanır (`labelOffsetCm`). Sürükleme
 * mantığı `useAreaObjectLabelTool`'da — burası salt çizim, tesisattaki
 * `ElementNameLabels` ile aynı iş bölümü.
 */
export function AreaObjectNameLabels() {
  const isVisible = useUiStore((state) => state.isAreaObjectNamesVisible)
  const zoom = useCameraZoom()
  const areaObjects = useCadStore((state) => state.areaObjects)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const draggingAreaObjects = useArchitectureUiStore((state) => state.draggingAreaObjects)
  const handleDrag = useArchitectureUiStore((state) => state.areaObjectHandleDrag)

  // Kapalıyken hiç çizilmez; etiket sürükleme jesti de `pickAreaObjectLabelAt`
  // üzerinden GÖRÜNMEYEN etiketi bulmasın diye ayrıca susturuluyor (K56).
  if (!isVisible) return null

  return (
    <group name="area-object-name-labels">
      {areaObjects
        .filter(
          (areaObject) =>
            areaObject.floorId === activeFloorId && hasAreaObjectNameLabel(areaObject.type),
        )
        .map((areaObject) => {
          // Nesne taşınıyor/boyutlanıyorsa etiket ÖNİZLENEN şekli takip eder;
          // ArchitectureLayer'daki çizimle aynı türetme.
          const drag = draggingAreaObjects?.areaObjectIds.includes(areaObject.id)
            ? draggingAreaObjects
            : undefined
          const shape =
            handleDrag?.areaObjectId === areaObject.id
              ? { ...areaObject, ...handleDrag.shape }
              : drag
                ? { ...areaObject, x: areaObject.x + drag.dxCm, y: areaObject.y + drag.dyCm }
                : areaObject

          return (
            <Fragment key={areaObject.id}>
              <AreaObjectNameLabel areaObject={areaObject} shape={shape} zoom={zoom} />
            </Fragment>
          )
        })}
    </group>
  )
}
