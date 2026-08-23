import { Line } from '@react-three/drei'

import { AREA_OBJECT_ELEVATION_CM, AREA_OBJECT_PREVIEW_ELEVATION_CM } from './architectureLayers'
import {
  AREA_OBJECT_STROKE_WIDTHS_CM,
  getArchitectureStrokeWidthPx,
} from './architectureStrokeStyle'
import { ARCHITECTURE_COLORS } from './architectureTheme'
import { RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { getAreaObjectPlanGeometry } from '../core/areaObjectGeometry'
import { planToThree, type PlanPoint } from '../core/coords'
import type { AreaObject as AreaObjectData } from '../core/model'
import { triangulatePolygon } from '../core/roomFill'

export type AreaObjectTone = 'normal' | 'hovered' | 'selected' | 'preview'

/**
 * ⚠️ Hover artık NESNENİN kendi ailesinin koyu tonu (kullanıcı isteği).
 * Eskiden duvarın hover grisiydi (SCENE_COLORS.wallHover) ve nesne rengi
 * grileşince ikisi birbirine yaklaştı — imleç üstündeyken hiçbir şey değişmiyor
 * gibi okunuyordu.
 */
const STROKE_COLORS: Record<AreaObjectTone, string> = {
  normal: ARCHITECTURE_COLORS.areaObjectStroke,
  hovered: ARCHITECTURE_COLORS.areaObjectHover,
  selected: SCENE_COLORS.selection,
  // Önizleme AYNI renk — yalnız SAYDAM: kullanıcı yerleştirmeden önce
  // "gerçek hâlinin bir tık soluğu"nu görsün, farklı bir renk değil.
  preview: ARCHITECTURE_COLORS.areaObjectStroke,
}

/** Yalnız önizlemede saydamlık uygulanır; yerleştirilmiş nesnenin KONTURU tam opak. */
const PREVIEW_OPACITY = 0.45

const FILL_COLORS: Record<AreaObjectTone, string> = {
  normal: ARCHITECTURE_COLORS.areaObjectFill,
  hovered: ARCHITECTURE_COLORS.areaObjectHover,
  selected: SCENE_COLORS.selection,
  preview: ARCHITECTURE_COLORS.areaObjectFill,
}

function toFillPositions(corners: readonly PlanPoint[], elevationCm: number): Float32Array {
  const triangleCorners = triangulatePolygon(corners)
  const positions = new Float32Array(triangleCorners.length * 3)

  triangleCorners.forEach((corner, index) => {
    positions.set(planToThree(corner, elevationCm), index * 3)
  })

  return positions
}

type AreaObjectProps = {
  type: AreaObjectData['type']
  /** Yalnız geometri için gereken alanlar — önizlemede id/label yok. */
  areaObject: Pick<AreaObjectData, 'x' | 'y' | 'widthCm' | 'lengthCm' | 'angleDeg'>
  tone: AreaObjectTone
  /** Mesh'te yalnız id taşınır (CLAUDE.md kural 4); önizlemede id yok. */
  areaObjectId?: number
  /** Kontur kalınlığı piksel cinsinden verildiği için zoom'a bağlı; kapsayıcı bir kez okur. */
  zoom: number
}

/**
 * Tek bir alan nesnesinin (merdiven/kolon/baca şaftı) çizimi. Geometri
 * `core/areaObject.ts` → `getAreaObjectPlanGeometry`'den PLAN noktası olarak
 * gelir — burada trigonometri yok, `scene/PointSymbol.tsx` ile aynı ayrım.
 *
 * Gövdenin içi ÇOK SOLUK dolgulu: tümüyle boş bırakıldığında nesne bir duvar
 * köşesinin üstüne oturunca altındaki köşe "boşluktan" görünüyordu. Dolgu salt
 * görsel — tıklama kararını `isPointInAreaObject` veriyor, raycast değil.
 */
export function AreaObject({ type, areaObject, tone, areaObjectId, zoom }: AreaObjectProps) {
  const isPreview = tone === 'preview'
  const elevationCm = isPreview ? AREA_OBJECT_PREVIEW_ELEVATION_CM : AREA_OBJECT_ELEVATION_CM
  const renderOrder = isPreview ? RENDER_ORDER.linePreview : RENDER_ORDER.areaObject
  const fillRenderOrder = isPreview
    ? RENDER_ORDER.areaObjectPreviewFill
    : RENDER_ORDER.areaObjectFill
  const strokeColor = STROKE_COLORS[tone]
  const geometry = getAreaObjectPlanGeometry(type, areaObject)

  return (
    <group userData={areaObjectId === undefined ? undefined : { id: areaObjectId }}>
      <mesh frustumCulled={false} renderOrder={fillRenderOrder} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[toFillPositions(geometry.fill, elevationCm), 3]}
          />
        </bufferGeometry>
        {/* Önizlemede dolgu bir kat daha soluk: kontur zaten PREVIEW_OPACITY ile
            soluyor, dolgu ondan koyu kalırsa önizleme yerleştirilmişten ağır görünür. */}
        <meshBasicMaterial
          color={FILL_COLORS[tone]}
          transparent
          opacity={
            ARCHITECTURE_COLORS.areaObjectFillOpacity * (isPreview ? PREVIEW_OPACITY : 1)
          }
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {geometry.strokes.map((stroke) => (
        <Line
          key={stroke.name}
          points={stroke.points.map((point) => planToThree(point, elevationCm))}
          color={strokeColor}
          // Kalınlık EKRAN PİKSELİ (`worldUnits` YOK): o yol hem ekran
          // kenarlarına doğru inceltiyor hem de uzaklaşınca piksel altına
          // düşürüyordu — bkz. architectureStrokeStyle.ts.
          lineWidth={getArchitectureStrokeWidthPx(
            AREA_OBJECT_STROKE_WIDTHS_CM[stroke.role],
            zoom,
          )}
          transparent={isPreview}
          opacity={isPreview ? PREVIEW_OPACITY : 1}
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
