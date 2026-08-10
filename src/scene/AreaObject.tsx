import { Line } from '@react-three/drei'

import { AREA_OBJECT_ELEVATION_CM, AREA_OBJECT_PREVIEW_ELEVATION_CM } from './architectureLayers'
import { ARCHITECTURE_COLORS } from './architectureTheme'
import { RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import {
  getAreaObjectPlanGeometry,
  type AreaObjectStrokeRole,
} from '../core/areaObjectGeometry'
import { planToThree } from '../core/coords'
import type { AreaObject as AreaObjectData } from '../core/model'

export type AreaObjectTone = 'normal' | 'hovered' | 'selected' | 'preview'

/**
 * Gövde (dış hat) KALIN, ayrıntı (basamak/ok/çember) İNCE. Birim CM —
 * `worldUnits` (aşağıda) sayesinde `Wall.tsx`'teki gibi zoom'dan bağımsız
 * SABİT fiziksel kalınlık: piksel-bazlı olsaydı (worldUnits YOK) uzaklaşınca
 * nesneye göre orantısız kalınlaşırdı (kullanıcı bunu fark etti).
 */
const STROKE_WIDTHS: Record<AreaObjectStrokeRole, number> = {
  body: 2.5,
  detail: 1.2,
}

const STROKE_COLORS: Record<AreaObjectTone, string> = {
  normal: ARCHITECTURE_COLORS.areaObjectStroke,
  hovered: SCENE_COLORS.wallHover,
  selected: SCENE_COLORS.selection,
  // Önizleme AYNI renk — yalnız SAYDAM: kullanıcı yerleştirmeden önce
  // "gerçek hâlinin bir tık soluğu"nu görsün, farklı bir renk değil.
  preview: ARCHITECTURE_COLORS.areaObjectStroke,
}

/** Yalnız önizlemede saydamlık uygulanır; yerleştirilmiş nesne tam opak. */
const PREVIEW_OPACITY = 0.45

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
 * İçi tamamen ŞEFFAF (tasarım referansı) — dolgu meshi YOK, yalnız çizgi.
 */
export function AreaObject({ type, areaObject, tone, areaObjectId }: AreaObjectProps) {
  const isPreview = tone === 'preview'
  const elevationCm = isPreview ? AREA_OBJECT_PREVIEW_ELEVATION_CM : AREA_OBJECT_ELEVATION_CM
  const renderOrder = isPreview ? RENDER_ORDER.linePreview : RENDER_ORDER.areaObject
  const strokeColor = STROKE_COLORS[tone]
  const geometry = getAreaObjectPlanGeometry(type, areaObject)

  return (
    <group userData={areaObjectId === undefined ? undefined : { id: areaObjectId }}>
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
