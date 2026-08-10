import { Line } from '@react-three/drei'

import {
  POINT_SYMBOL_ELEVATION_CM,
  POINT_SYMBOL_PREVIEW_ELEVATION_CM,
} from './architectureLayers'
import { ARCHITECTURE_COLORS } from './architectureTheme'
import { RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import {
  getPointSymbolPlanGeometry,
  type SymbolStrokeRole,
} from '../core/architectureSymbol'
import { planToThree, type PlanPoint } from '../core/coords'
import type { PointSymbol as PointSymbolData } from '../core/model'
import type { SymbolPose } from '../core/symbolPlacement'

/** Gövde çizgisi detaydan kalın: sembolün silueti uzaktan da okunsun. */
const STROKE_WIDTHS: Record<SymbolStrokeRole, number> = {
  body: 1.8,
  detail: 1.2,
}

export type PointSymbolTone = 'normal' | 'hovered' | 'selected' | 'preview'

const TONE_COLORS: Record<PointSymbolTone, string> = {
  normal: ARCHITECTURE_COLORS.pointSymbol,
  hovered: SCENE_COLORS.wallHover,
  selected: SCENE_COLORS.selection,
  preview: ARCHITECTURE_COLORS.previewValid,
}

type PointSymbolProps = {
  type: PointSymbolData['type']
  /** Konum + açı; duvara bağlı sembolde ikisi de duvardan türetilmiş olarak gelir. */
  pose: SymbolPose
  tone: PointSymbolTone
  /** Mesh'te yalnız id taşınır (CLAUDE.md kural 4); önizlemede id yok. */
  symbolId?: number
}

/** Kapalı çokgenden iki üçgen: dolgu meshi. */
function toFillPositions(corners: readonly PlanPoint[], elevationCm: number): Float32Array {
  // Şekiller dörtgen dolgu kullanıyor; halka kapanışı varsa son nokta atılır.
  const unique =
    corners.length > 1 &&
    corners[0].x === corners[corners.length - 1].x &&
    corners[0].y === corners[corners.length - 1].y
      ? corners.slice(0, -1)
      : corners

  const triangles: number[] = []
  for (let index = 1; index < unique.length - 1; index += 1) {
    for (const corner of [unique[0], unique[index], unique[index + 1]]) {
      triangles.push(...planToThree(corner, elevationCm))
    }
  }
  return new Float32Array(triangles)
}

/**
 * Tek bir nokta sembolünün çizimi. Geometri `core/architectureSymbol.ts`'ten
 * PLAN noktası olarak gelir — burada trigonometri yok, `scene/Opening.tsx` ile
 * aynı ayrım (şekil core'da, çizim sahnede).
 *
 * SVG yükleyici kullanılmıyor: mimari katman kendi sembolünü geometriyle çiziyor,
 * bu yüzden asset/metadata/material önbelleği gerekmiyor.
 */
export function PointSymbol({ type, pose, tone, symbolId }: PointSymbolProps) {
  const isPreview = tone === 'preview'
  const elevationCm = isPreview
    ? POINT_SYMBOL_PREVIEW_ELEVATION_CM
    : POINT_SYMBOL_ELEVATION_CM
  const renderOrder = isPreview ? RENDER_ORDER.linePreview : RENDER_ORDER.pointSymbol
  const color = TONE_COLORS[tone]
  const geometry = getPointSymbolPlanGeometry(type, pose)

  return (
    <group userData={symbolId === undefined ? undefined : { id: symbolId }}>
      {geometry.fills.map((fill, index) => (
        <mesh
          // Dolgu dizisi sembol tipinden TÜRETİLİR ve yeniden sıralanmaz; domain
          // nesnesi olmadığı için indeks anahtar olarak güvenli.
          key={index}
          frustumCulled={false}
          renderOrder={renderOrder}
          // Önizleme tıklanabilir değil: altındaki nesneyi gölgelemesin.
          raycast={isPreview ? () => null : undefined}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[toFillPositions(fill, elevationCm), 3]}
            />
          </bufferGeometry>
          <meshBasicMaterial color={color} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      {geometry.strokes.map((stroke) => (
        <Line
          key={stroke.name}
          points={stroke.points.map((point) => planToThree(point, elevationCm))}
          color={color}
          lineWidth={STROKE_WIDTHS[stroke.role]}
          frustumCulled={false}
          renderOrder={renderOrder}
          depthWrite={false}
          toneMapped={false}
          {...(isPreview ? { raycast: () => null } : {})}
        />
      ))}
    </group>
  )
}
