import { Line } from '@react-three/drei'

import { OPENING_ELEVATION_CM, OPENING_PREVIEW_ELEVATION_CM } from './architectureLayers'
import { ARCHITECTURE_COLORS } from './architectureTheme'
import { RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { planToThree, type PlanPoint, type ThreePosition } from '../core/coords'
import type { OpeningType } from '../core/model'

const OUTLINE_WIDTH = 1.6
const SYMBOL_WIDTH = 1.2

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

function getMidpoint(a: PlanPoint, b: PlanPoint): PlanPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** İki üçgen: 4 köşeden (0,1,2) ve (0,2,3). */
function toFillPositions(outline: readonly PlanPoint[], elevationCm: number): Float32Array {
  const order = [0, 1, 2, 0, 2, 3]
  const positions = new Float32Array(order.length * 3)

  order.forEach((cornerIndex, slot) => {
    const [x, y, z] = planToThree(outline[cornerIndex], elevationCm)
    positions.set([x, y, z], slot * 3)
  })

  return positions
}

/**
 * Kapı kanadı / pencere kayıdı. Simge geometrisi köşelerden TÜRETİLİR: duvarın
 * kalınlık yönü c0→c3, eksen yönü c0→c1. Böylece açıklık çapraz duvarda da
 * duvarın eksenini takip eder ve burada açı dönüşümü yapılmaz.
 */
function getSymbolPoints(
  outline: readonly PlanPoint[],
  type: OpeningType,
  elevationCm: number,
): ThreePosition[] {
  const [c0, c1, c2, c3] = outline

  if (type === 'window') {
    // Kanat çizgisi: iki jamb ortasını birleştirir.
    return [
      planToThree(getMidpoint(c0, c3), elevationCm),
      planToThree(getMidpoint(c1, c2), elevationCm),
    ]
  }

  // Kapı: başlangıç jamb'ından açıklık genişliği kadar dışa açılan düz kanat.
  // Tam yay simgesi ayrı bir simge işi, bu issue'nun kapsamı dışında.
  const hinge = getMidpoint(c0, c3)
  const widthCm = Math.hypot(c1.x - c0.x, c1.y - c0.y)
  const thicknessCm = Math.hypot(c3.x - c0.x, c3.y - c0.y)

  if (thicknessCm === 0) return []

  const leafX = hinge.x + ((c3.x - c0.x) / thicknessCm) * widthCm
  const leafY = hinge.y + ((c3.y - c0.y) / thicknessCm) * widthCm

  return [planToThree(hinge, elevationCm), planToThree({ x: leafX, y: leafY }, elevationCm)]
}

export function Opening({ outline, type, tone }: OpeningProps) {
  const isPreview = isPreviewTone(tone)
  const elevationCm = isPreview ? OPENING_PREVIEW_ELEVATION_CM : OPENING_ELEVATION_CM
  const renderOrder = isPreview ? RENDER_ORDER.linePreview : RENDER_ORDER.opening
  const strokeColor = STROKE_COLORS[tone]

  // Halkayı elle kapatıyoruz: drei <Line>'ın bu sürümünde `closed` propu yok.
  const outlinePoints = [...outline, outline[0]].map((corner) =>
    planToThree(corner, elevationCm),
  )
  const symbolPoints = getSymbolPoints(outline, type, elevationCm)

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

      {/* Kalın çizgi: three'nin düz Line'ında linewidth çalışmaz, drei <Line> gerekir. */}
      <Line
        points={outlinePoints}
        color={strokeColor}
        lineWidth={OUTLINE_WIDTH}
        frustumCulled={false}
        renderOrder={renderOrder}
        depthWrite={false}
        toneMapped={false}
      />

      {symbolPoints.length > 0 && (
        <Line
          points={symbolPoints}
          color={strokeColor}
          lineWidth={SYMBOL_WIDTH}
          frustumCulled={false}
          renderOrder={renderOrder}
          depthWrite={false}
          toneMapped={false}
        />
      )}
    </>
  )
}
