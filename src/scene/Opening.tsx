import { Line } from '@react-three/drei'

import {
  OPENING_ELEVATION_CM,
  OPENING_PREVIEW_ELEVATION_CM,
  OPENING_SYMBOL_LIFT_CM,
} from './architectureLayers'
import { ARCHITECTURE_COLORS } from './architectureTheme'
import { RENDER_ORDER } from './layers'
import { toOpeningFillPositions } from './openingFill'
import { SCENE_COLORS } from './sceneTheme'
import { planToThree, type PlanPoint } from '../core/coords'
import type { OpeningType } from '../core/model'
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

export function Opening({ outline, type, tone }: OpeningProps) {
  const isPreview = isPreviewTone(tone)
  const elevationCm = isPreview ? OPENING_PREVIEW_ELEVATION_CM : OPENING_ELEVATION_CM
  const renderOrder = isPreview ? RENDER_ORDER.linePreview : RENDER_ORDER.opening
  const strokeColor = STROKE_COLORS[tone]
  const symbolElevationCm = elevationCm + OPENING_SYMBOL_LIFT_CM
  const symbol = getOpeningSymbol(outline, type)

  return (
    <>
      {/* Dolgu duvarın üstüne boyanıyor (renderOrder.opening > wall): delik
          "boşluk" gibi okunsun, duvar kütlesi içinden geçmesin. */}
      <mesh frustumCulled={false} renderOrder={renderOrder}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[toOpeningFillPositions(outline, elevationCm), 3]}
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
              args={[toOpeningFillPositions(symbol.panel, symbolElevationCm), 3]}
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
