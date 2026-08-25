import { Billboard, Line, Text } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'

import { ISOMETRIC_COLORS } from './isometricTheme'
import type { PlanPoint, ThreePosition } from '../../core/coords'
import { FONT_URL } from '../../plumbing/scene/LengthLabels'
import { isometricOffsetToWorld } from '../core/isometricProjection'
import type { IsometricAngles } from '../core/isometricProjection'

/**
 * Yazı EKRAN boyunda sabit kalır: zoom = piksel/cm olduğu için dünya boyu
 * px/zoom (knowledge/viewport.md). Aksi hâlde küçük bir dairede kocaman,
 * on katlı bir binada okunmaz küçük çıkardı.
 */
export const LABEL_SIZE_PX = 11
export const LABEL_LINE_HEIGHT = 1.35

/** Kılavuz çizgisi piksel kalınlığında; `worldUnits` KULLANILMAZ (ortografik kamera). */
const LEADER_WIDTH_PX = 1
const LEADER_DASH_SIZE_CM = 12
const LEADER_GAP_SIZE_CM = 8

/**
 * Sürükleme hedefi: yazının arkasında görünmez bir dikdörtgen. Troika'nın kendi
 * ışın testi yalnız GLYPH'lere değiyor, harflerin arasındaki boşlukta sürükleme
 * kopuyordu. Ölçüler yazıdan tahmin ediliyor — troika'nın gerçek kutusu ancak
 * dizgi bittikten sonra okunabiliyor ve o değeri beklemek etiketi bir kare
 * geç tıklanabilir yapardı.
 */
export const GLYPH_WIDTH_RATIO = 0.62
const HIT_AREA_PADDING_PX = 6

/** Etiket tıklanmaz (vurgulama gövdeye tıklayarak yapılıyor); sürükleme ayrı hedefte. */
const NO_RAYCAST = () => null

type DragState = {
  startClientX: number
  startClientY: number
  baseOffsetCm: PlanPoint
}

type IsometricLabelProps = {
  /** Etiketin bağlı olduğu nokta (boru gövdesi ya da sembol). */
  anchor: ThreePosition
  lines: readonly string[]
  /** İzdüşüm düzleminde kayma (cm) — kullanıcı taşımadıysa varsayılan. */
  offsetCm: PlanPoint
  angles: IsometricAngles
  zoom: number
  /** Yazı rengi; boruya ait etiketlerde HATTIN rengi (K27), künyelerde nötr. */
  color: string
  opacity: number
  /** Serbest yörünge kipinde KAPALI: aynı jest kamerayı döndürüyor. */
  isDraggable: boolean
  /** Yoksa etiket taşınamaz — yükseklik etiketinin saklanacak bir alanı yok. */
  onCommitOffsetCm?: (offsetCm: PlanPoint) => void
}

/**
 * İzometrikteki tek bir etiket: çok satırlı yazı + çapaya giden kesik çizgili
 * kılavuz (referans çıktıdaki desen), sürüklenerek taşınabilir.
 *
 * Yazı BILLBOARD: kamera hangi açıda olursa olsun ekrana dik durur. İzdüşüme
 * girseydi eğik ve okunmaz olurdu — izometrik çizimde yazı hiçbir zaman
 * projeksiyona katılmaz.
 *
 * Kayma DÜNYAYA taşınıyor (`isometricOffsetToWorld`): 2B saklanan bir kayma
 * sahnede 3B uygulanmak zorunda, üstelik α/β değişince etiket çizimle birlikte
 * dönsün diye canlı açıyla hesaplanıyor.
 */
export function IsometricLabel({
  anchor,
  lines,
  offsetCm,
  angles,
  zoom,
  color,
  opacity,
  isDraggable,
  onCommitOffsetCm,
}: IsometricLabelProps) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [previewOffsetCm, setPreviewOffsetCm] = useState<PlanPoint | null>(null)

  const effectiveOffsetCm = previewOffsetCm ?? offsetCm

  /**
   * Sürükleme penceresi dinliyor, mesh değil: imleç etiketin dışına çıkınca
   * R3F olayları kesilir ve etiket parmağın altında kalırdı. Ekran pikseli →
   * cm dönüşümü doğrudan zoom'la yapılıyor (zoom = piksel/cm), ışın testine
   * gerek yok; ekranın y'si AŞAĞI büyüdüğü için işareti ters.
   */
  useEffect(() => {
    if (!drag) return undefined

    const toOffsetCm = (event: PointerEvent): PlanPoint => ({
      x: drag.baseOffsetCm.x + (event.clientX - drag.startClientX) / zoom,
      y: drag.baseOffsetCm.y - (event.clientY - drag.startClientY) / zoom,
    })

    const handleMove = (event: PointerEvent) => setPreviewOffsetCm(toOffsetCm(event))
    const handleUp = (event: PointerEvent) => {
      const committed = toOffsetCm(event)
      setDrag(null)
      setPreviewOffsetCm(null)
      onCommitOffsetCm?.(committed)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [drag, onCommitOffsetCm, zoom])

  const position = useMemo<ThreePosition>(() => {
    const [dx, dy, dz] = isometricOffsetToWorld(effectiveOffsetCm, angles)
    return [anchor[0] + dx, anchor[1] + dy, anchor[2] + dz]
  }, [anchor, angles, effectiveOffsetCm])

  const leaderPoints = useMemo<ThreePosition[]>(() => [anchor, position], [anchor, position])

  const hitArea = useMemo(() => {
    const longestLine = lines.reduce((longest, line) => Math.max(longest, line.length), 0)
    return {
      widthPx: longestLine * LABEL_SIZE_PX * GLYPH_WIDTH_RATIO + HIT_AREA_PADDING_PX * 2,
      heightPx: lines.length * LABEL_SIZE_PX * LABEL_LINE_HEIGHT + HIT_AREA_PADDING_PX * 2,
    }
  }, [lines])

  if (lines.length === 0) return null

  // Yazılacak yeri OLMAYAN etiket tutulamaz: sürükleme bırakıldığında hiçbir
  // yere yazılmayan bir önizleme geri sıçrardı.
  const isDragEnabled = isDraggable && onCommitOffsetCm !== undefined

  /**
   * Kılavuz çizgisi İSTİSNA (K167, kâğıtla aynı kural): etiket kendi nesnesinin
   * yanında durduğu için çoğunda gereksiz — üstelik kısa bir çizgi yazının
   * ortasına kadar girip okunurluğu bozuyor. Yalnız çakışma çözümü etiketi
   * kendi payının ötesine ittiyse çiziliyor; o zaman hangi nesneye ait olduğu
   * şekilden okunmuyor.
   */
  const offsetPx = Math.hypot(effectiveOffsetCm.x, effectiveOffsetCm.y) * zoom
  const isLeaderVisible = offsetPx > hitArea.widthPx / 2 + hitArea.heightPx

  return (
    <>
      {isLeaderVisible && (
        <Line
          points={leaderPoints}
          color={ISOMETRIC_COLORS.labelLeader}
          lineWidth={LEADER_WIDTH_PX}
          dashed
          dashSize={LEADER_DASH_SIZE_CM}
          gapSize={LEADER_GAP_SIZE_CM}
          transparent
          opacity={opacity}
          raycast={NO_RAYCAST}
        />
      )}
      <Billboard position={position}>
        {/* Ölçek ile ekran-sabit boy: `fontSize` her değiştiğinde troika metni
            yeniden dizer, ölçek yalnız matrisi günceller (LengthLabels deseni). */}
        <group scale={1 / zoom}>
          {isDragEnabled && (
            <mesh
              onPointerDown={(event) => {
                // Durdurulmazsa altındaki boru da tıklanmış sayılır ve etiketi
                // tutmak hattın vurgusunu açıp kapatırdı.
                event.stopPropagation()
                setDrag({
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  baseOffsetCm: effectiveOffsetCm,
                })
              }}
            >
              <planeGeometry args={[hitArea.widthPx, hitArea.heightPx]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          )}
          <Text
            font={FONT_URL}
            fontSize={LABEL_SIZE_PX}
            lineHeight={LABEL_LINE_HEIGHT}
            color={color}
            anchorX="center"
            anchorY="middle"
            textAlign="center"
            fillOpacity={opacity}
            raycast={NO_RAYCAST}
          >
            {lines.join('\n')}
          </Text>
        </group>
      </Billboard>
    </>
  )
}
