import { Line, Text } from '@react-three/drei'
import { Fragment } from 'react'

import { POINT_SYMBOL_COLORS } from './architectureTheme'
import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { useCameraZoom } from './useCameraZoom'
import { planToThree, type PlanPoint } from '../core/coords'
import { clipLeaderEndToRectCm, getLabelRectCm } from '../core/labelLeader'
import type { PointSymbol } from '../core/model'
import {
  getPointSymbolLabelAnchorCm,
  getPointSymbolNameLabel,
  getPointSymbolWorldBoundsCm,
  POINT_SYMBOL_LABEL_SIZE_PX,
} from '../core/pointSymbolLabel'
import { getSymbolPose, getSymbolsOnFloor, type SymbolPose } from '../core/symbolPlacement'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

/** AreaObjectNameLabels ile aynı yazı tipi ve kılavuz deseni; tek görsel dil. */
const FONT_URL = '/fonts/roboto-regular.woff'
const FLAT_ROTATION: readonly [number, number, number] = [-Math.PI / 2, 0, 0]
const NO_RAYCAST = () => null
const LEADER_DASH_SIZE_CM = 6
const LEADER_DASH_GAP_CM = 4
const LEADER_WIDTH_PX = 1.2

type PointSymbolNameLabelProps = {
  symbol: PointSymbol
  pose: SymbolPose
  zoom: number
}

function PointSymbolNameLabel({ symbol, pose, zoom }: PointSymbolNameLabelProps) {
  // Sürüklenen etiket geçici kaymasıyla çizilir; cadStore bırakılınca yazılır.
  const draggingOffset = useArchitectureUiStore((state) =>
    state.draggingPointSymbolLabel?.symbolId === symbol.id
      ? state.draggingPointSymbolLabel.offsetCm
      : null,
  )

  const bounds = getPointSymbolWorldBoundsCm(symbol.type, pose)
  const anchor = draggingOffset
    ? { x: pose.position.x + draggingOffset.x, y: pose.position.y + draggingOffset.y }
    : getPointSymbolLabelAnchorCm(symbol, pose, zoom)
  const text = getPointSymbolNameLabel(symbol.type)
  // Etiket cihazın KENDİ hue'sunun koyu tonu: yazı ile şekil aynı aileden
  // okunsun, göz ikisini kendiliğinden eşleştirsin.
  const labelColor = POINT_SYMBOL_COLORS[symbol.type].label

  // Kılavuz çizimin MERKEZİNDEN çıkar (çapa noktasından değil): çekme çizgili
  // cihazda çapa duvarda, işaret 45 cm dışarıda — çizgi duvardan çıksaydı
  // cihazın kendisini es geçerdi.
  const center: PlanPoint = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  // Kılavuz yazının altına girmesin: etiket kutusuna girdiği yerde biter.
  const leaderEnd = clipLeaderEndToRectCm(
    center,
    anchor,
    getLabelRectCm(anchor, text, POINT_SYMBOL_LABEL_SIZE_PX, zoom),
  )

  return (
    <>
      <Line
        points={[
          planToThree(center, HANDLE_ELEVATION_CM),
          planToThree(leaderEnd, HANDLE_ELEVATION_CM),
        ]}
        color={labelColor}
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
          fontSize={POINT_SYMBOL_LABEL_SIZE_PX}
          color={labelColor}
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
 * Mimari cihazların (alarm, deprem sensörü, yangın söndürücü, pano, şalter,
 * menfez, aydınlatma) AD etiketi + cihaza bağlayan kesikli kılavuz.
 *
 * Alan nesnesinin etiketiyle AYNI desen ve aynı görünürlük anahtarı ("Nesne
 * adları"): kullanıcı için ikisi de "nesnenin adı", ayrı iki menü maddesi
 * gereksiz bir ayrım olurdu.
 *
 * Etiket sürüklenebilir, kayma cihazda saklanır (`labelOffsetCm`). Sürükleme
 * mantığı `usePointSymbolLabelTool`'da — burası salt çizim, alan nesnesindeki
 * `AreaObjectNameLabels` ile aynı iş bölümü.
 */
export function PointSymbolNameLabels() {
  const isVisible = useUiStore((state) => state.isDeviceNamesVisible)
  const zoom = useCameraZoom()
  const symbols = useCadStore((state) => state.symbols)
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  if (!isVisible) return null

  return (
    <group name="point-symbol-name-labels">
      {getSymbolsOnFloor(symbols, activeFloorId, walls).map((symbol) => {
        // Duvara bağlı cihazın konumu duvardan TÜRER; duvarı silinmiş sembol
        // pose üretmez ve çizilmez (PointSymbols ile aynı kural).
        const pose = getSymbolPose(symbol, walls, points)
        if (!pose) return null

        return (
          <Fragment key={symbol.id}>
            <PointSymbolNameLabel symbol={symbol} pose={pose} zoom={zoom} />
          </Fragment>
        )
      })}
    </group>
  )
}
