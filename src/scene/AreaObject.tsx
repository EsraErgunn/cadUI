import { Line } from '@react-three/drei'

import { AREA_OBJECT_ELEVATION_CM, AREA_OBJECT_PREVIEW_ELEVATION_CM } from './architectureLayers'
import { ARCHITECTURE_COLORS } from './architectureTheme'
import { RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import {
  getAreaObjectPlanGeometry,
  type AreaObjectStrokeRole,
} from '../core/areaObjectGeometry'
import { planToThree, type PlanPoint } from '../core/coords'
import type { AreaObject as AreaObjectData } from '../core/model'
import { triangulatePolygon } from '../core/roomFill'
import { DEFAULT_WALL_THICKNESS_CM } from '../core/wall'

export type AreaObjectTone = 'normal' | 'hovered' | 'selected' | 'preview'

/**
 * Gövde (dış hat) KALIN, ayrıntı (basamak/ok/çember) İNCE. Birim CM —
 * `worldUnits` (aşağıda) sayesinde `Wall.tsx`'teki gibi zoom'dan bağımsız
 * SABİT fiziksel kalınlık: piksel-bazlı olsaydı (worldUnits YOK) uzaklaşınca
 * nesneye göre orantısız kalınlaşırdı.
 *
 * Kalınlıklar duvardan TÜRETİLİR ki varsayılan duvar değişince oran korunsun.
 * İlk değerler (2.5 / 1.2 cm) uzaklaşınca piksel altına düşüp GÖRÜNMEZ
 * oluyordu — zoom 1'de 1 cm = 1 px, en uzak zoom'da (ZOOM_MIN = 0.1) 2.5 cm
 * yalnız 0.25 px eder. Önce duvarın yarısına (10 cm) çıkarıldı ama o da
 * AŞIRI KALIN göründü; şimdiki değer ikisinin ortası (5 cm) — en uzak zoom'da
 * 0.5 px eder, yani orada hâlâ solabilir. Tümüyle kaybolursa çözüm kalınlığı
 * artırmak değil, `Wall.tsx`'teki `alphaToCoverage` (bkz. docs/kararlar.md K43).
 */
const STROKE_WIDTHS: Record<AreaObjectStrokeRole, number> = {
  body: DEFAULT_WALL_THICKNESS_CM / 4,
  detail: DEFAULT_WALL_THICKNESS_CM / 8,
}

const STROKE_COLORS: Record<AreaObjectTone, string> = {
  normal: ARCHITECTURE_COLORS.areaObjectStroke,
  hovered: SCENE_COLORS.wallHover,
  selected: SCENE_COLORS.selection,
  // Önizleme AYNI renk — yalnız SAYDAM: kullanıcı yerleştirmeden önce
  // "gerçek hâlinin bir tık soluğu"nu görsün, farklı bir renk değil.
  preview: ARCHITECTURE_COLORS.areaObjectStroke,
}

/** Yalnız önizlemede saydamlık uygulanır; yerleştirilmiş nesnenin KONTURU tam opak. */
const PREVIEW_OPACITY = 0.45

const FILL_COLORS: Record<AreaObjectTone, string> = {
  normal: ARCHITECTURE_COLORS.areaObjectFill,
  hovered: SCENE_COLORS.wallHover,
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
export function AreaObject({ type, areaObject, tone, areaObjectId }: AreaObjectProps) {
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
          // worldUnits: kalınlık cm cinsinden, zoom'la BİRLİKTE ölçeklenir —
          // aksi hâlde ekran-pikseli sabit kalır ve uzaklaşınca nesneye göre
          // orantısız kalınlaşır (Wall.tsx ile aynı gerekçe).
          worldUnits
          lineWidth={STROKE_WIDTHS[stroke.role]}
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
