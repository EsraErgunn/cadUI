import { Line } from '@react-three/drei'
import { useMemo } from 'react'

import { DISCHARGE_ELEVATION_CM, INSTALLATION_GHOST_ELEVATION_CM } from './plumbingLayers'
import { DISCHARGE_STROKE_COLORS } from './plumbingTheme'
import { GHOST_OPACITY } from './symbolLoader'
import { planToThree, type PlanPoint } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import { SCENE_COLORS } from '../../scene/sceneTheme'
import { getDischargeRunGeometry } from '../core/dischargeGeometry'
import type { DischargeLineKind } from '../core/lineKinds'

/** Kanal tıklanabilir değil: tutma saf geometriyle (core/linePicking.ts). */
const LINE_MESH_PROPS = { raycast: () => null }

/**
 * Kontur kalınlığı EKRAN PİKSELİ. Burada iki ayrı büyüklük var, karıştırılmamalı:
 * kanalın GENİŞLİĞİ (20/30 cm) geometrinin kendisidir ve zoom'la doğal ölçeklenir;
 * karar gereken şey yalnız kontur çizgisinin kalınlığı. `AreaObject.tsx` mimari
 * tarafta `worldUnits` kullanıyor ama o yol en uzak zoom'da piksel altına düşüp
 * soluyor (K43) — üstelik tesisat katmanında `worldUnits` ortografik kamerada
 * ekran kenarına doğru inceltiyor (lineStyle.ts). Piksel yolu ikisinden de muaf.
 */
const DISCHARGE_STROKE_WIDTH_PX = 1.5

/** Yerleştirme önizlemesiyle aynı solukluk (DrawPreview). */
const PREVIEW_OPACITY = 0.5

/**
 * İç desen gövde konturundan İNCE: damga SVG'lerinde de tarama/panjur çizgileri
 * ayrıntıydı, dış hat kadar bağırmıyordu (AreaObject'in body/detail ayrımıyla
 * aynı fikir).
 */
const STROKE_WIDTH_PX: Record<'wall' | 'cap' | 'mark', number> = {
  wall: DISCHARGE_STROKE_WIDTH_PX,
  cap: DISCHARGE_STROKE_WIDTH_PX,
  mark: DISCHARGE_STROKE_WIDTH_PX * 0.75,
}

export type DischargeTone = 'normal' | 'ghost' | 'preview'

type DischargeRunMeshProps = {
  kind: DischargeLineKind
  /** Güzergâhın merkez hattı; ilk nokta cihazın deşarj portu. */
  centerline: readonly PlanPoint[]
  isSelected?: boolean
  tone?: DischargeTone
}

/**
 * Baca/havalandırma güzergâhının plan çizimi: sabit genişlikte ÇİFT ÇİZGİLİ,
 * içi boş bir kanal. Tek kalın çizgi olsaydı en kalın borudan yalnız iki kat
 * kalın görünür, "kanal" olduğu okunmazdı — çift çizgi mimari alan nesnelerinin
 * (AreaObject) çizim diliyle de akraba.
 *
 * Cihaza giren uç KAPATILMAZ: kanal oraya bağlanıyor, orada bir duvarı yok.
 */
export function DischargeRunMesh({
  kind,
  centerline,
  isSelected = false,
  tone = 'normal',
}: DischargeRunMeshProps) {
  const isGhost = tone === 'ghost'
  const isPreview = tone === 'preview'
  const elevationCm = isGhost ? INSTALLATION_GHOST_ELEVATION_CM : DISCHARGE_ELEVATION_CM

  const strokes = useMemo(
    () => getDischargeRunGeometry(kind, centerline, { hasStartCap: false, hasEndCap: true }),
    [centerline, kind],
  )

  // Referans kararlı tutulur: drei <Line> `points` değişince geometriyi yeniden ayırır.
  const positions = useMemo(
    () =>
      strokes.map((stroke) => ({
        name: stroke.name,
        role: stroke.role,
        points: stroke.points.map((point) => planToThree(point, elevationCm)),
      })),
    [strokes, elevationCm],
  )

  const colorHex =
    isSelected && !isGhost && !isPreview ? SCENE_COLORS.selection : DISCHARGE_STROKE_COLORS[kind]
  const isTransparent = isGhost || isPreview

  return (
    <group name="discharge-run">
      {positions.map((stroke) => (
        <Line
          key={stroke.name}
          points={stroke.points}
          color={colorHex}
          lineWidth={STROKE_WIDTH_PX[stroke.role]}
          alphaToCoverage
          frustumCulled={false}
          renderOrder={isGhost ? RENDER_ORDER.installationGhost : RENDER_ORDER.discharge}
          depthWrite={false}
          toneMapped={false}
          transparent={isTransparent}
          opacity={isGhost ? GHOST_OPACITY : isPreview ? PREVIEW_OPACITY : 1}
          {...LINE_MESH_PROPS}
        />
      ))}
    </group>
  )
}
