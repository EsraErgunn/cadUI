import { Line } from '@react-three/drei'

import {
  OPENING_ELEVATION_CM,
  OPENING_PREVIEW_ELEVATION_CM,
  OPENING_SYMBOL_LIFT_CM,
} from './architectureLayers'
import { ARCHITECTURE_COLORS } from './architectureTheme'
import { RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { planToThree, type PlanPoint } from '../core/coords'
import type { OpeningType } from '../core/model'
import { getOpeningSymbolPoints } from '../core/opening'

import { getOpeningSymbol, type OpeningSymbolRole } from '../core/openingSymbol'


/** SVG sembolündeki 1.5 / 1 / 1 kalınlık oranı; birim ekran px'i (drei <Line>). */
const STROKE_WIDTHS: Record<OpeningSymbolRole, number> = {
  jamb: 1.8,
  face: 1.2,
  detail: 1,
}

export type OpeningTone = 'normal' | 'selected' | 'previewValid' | 'previewInvalid'

type OpeningProps = {
  /** Plan uzayında 4 köşe — core/opening.ts getOpeningOutline'dan gelir. */
  outline: readonly PlanPoint[]
  type: OpeningType
  tone: OpeningTone
}

const STROKE_COLORS: Record<OpeningTone, string> = {
  normal: ARCHITECTURE_COLORS.opening,
  selected: SCENE_COLORS.selection,
  previewValid: ARCHITECTURE_COLORS.previewValid,
  previewInvalid: ARCHITECTURE_COLORS.previewInvalid,
}

function isPreviewTone(tone: OpeningTone): boolean {
  return tone === 'previewValid' || tone === 'previewInvalid'
}

/** İki üçgen: 4 köşeden (0,1,2) ve (0,2,3). */
function toFillPositions(corners: readonly PlanPoint[], elevationCm: number): Float32Array {
  const order = [0, 1, 2, 0, 2, 3]
  const positions = new Float32Array(order.length * 3)

  order.forEach((cornerIndex, slot) => {
    const [x, y, z] = planToThree(corners[cornerIndex], elevationCm)
    positions.set([x, y, z], slot * 3)
  })

  return positions
}

export function Opening({ outline, type, tone }: OpeningProps) {
  const isPreview = isPreviewTone(tone)
  const elevationCm = isPreview ? OPENING_PREVIEW_ELEVATION_CM : OPENING_ELEVATION_CM
  const renderOrder = isPreview ? RENDER_ORDER.linePreview : RENDER_ORDER.opening
  const strokeColor = STROKE_COLORS[tone]
<<<<<<< src/scene/Opening.tsx

  // Halkayı elle kapatıyoruz: drei <Line>'ın bu sürümünde `closed` propu yok.
  const outlinePoints = [...outline, outline[0]].map((corner) =>
    planToThree(corner, elevationCm),
  )
  const symbolPoints = getOpeningSymbolPoints(outline, type).map((point) =>
    planToThree(point, elevationCm),
  )
=======
  const symbolElevationCm = elevationCm + OPENING_SYMBOL_LIFT_CM
  const symbol = getOpeningSymbol(outline, type)
>>>>>>> src/scene/Opening.tsx

  return (
    <>
      {/* Dolgu duvarın üstüne boyanıyor (renderOrder.opening > wall): delik
          "boşluk" gibi okunsun, duvar kütlesi içinden geçmesin. */}
      <mesh frustumCulled={false} renderOrder={renderOrder}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[toFillPositions(outline, elevationCm), 3]}
          />
        </bufferGeometry>
        <meshBasicMaterial
          color={ARCHITECTURE_COLORS.openingFill}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Kapı kanadı: SVG'de fill="currentColor", yani çizgiyle AYNI renk. */}
      {symbol.panel && (
        <mesh frustumCulled={false} renderOrder={renderOrder}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[toFillPositions(symbol.panel, symbolElevationCm), 3]}
            />
          </bufferGeometry>
          <meshBasicMaterial color={strokeColor} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* Kalın çizgi: three'nin düz Line'ında linewidth çalışmaz, drei <Line> gerekir. */}
      {symbol.strokes.map((stroke) => (
        <Line
          key={stroke.name}
          points={stroke.points.map((corner) => planToThree(corner, symbolElevationCm))}
          color={strokeColor}
          lineWidth={STROKE_WIDTHS[stroke.role]}
          frustumCulled={false}
          renderOrder={renderOrder}
          depthWrite={false}
          toneMapped={false}
        />
      ))}
    </>
  )
}
