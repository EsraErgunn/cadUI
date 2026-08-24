import { Line } from '@react-three/drei'

import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useFreehandTool } from './useFreehandTool'
import { planToThree, type PlanPoint } from '../core/coords'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

/** Kalem kalınlığı (px). Ekran-sabit: yakınlaştırınca kalınlaşmıyor. */
const STROKE_WIDTH_PX = 2

function toLinePoints(points: readonly PlanPoint[]): [number, number, number][] {
  return points.map((point) => [...planToThree(point, HANDLE_ELEVATION_CM)])
}

/**
 * Serbest çizim darbeleri ve çizilmekte olan taslak (K163).
 *
 * ⚠️ Darbeler `uiStore`'da, çizim verisinde DEĞİL: projeye kaydedilmiyorlar
 * (kullanıcı kararı). Bu yüzden bileşen `useArchitectureDraft`ten değil
 * doğrudan store'dan okuyor — taşıma önizlemesiyle ilgisi yok.
 *
 * ⚠️ En ÜSTTE çiziliyor (`RENDER_ORDER.label` ile aynı bant): elle alınmış bir
 * not, altında kalırsa notluğunu yitirir.
 */
export function SketchStrokes() {
  const strokes = useUiStore((state) => state.sketchStrokes)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const draft = useFreehandTool()

  // Başka katta çizilen not burada görünmez: kat değiştirince ekran temizlenir.
  const visible = strokes.filter((stroke) => stroke.floorId === activeFloorId)

  return (
    <>
      {visible.map((stroke) => (
        <Line
          key={stroke.id}
          points={toLinePoints(stroke.points)}
          color={SCENE_COLORS.sketch}
          lineWidth={STROKE_WIDTH_PX}
          renderOrder={RENDER_ORDER.label}
        />
      ))}

      {/* Taslak, bırakılana kadar store'a yazılmıyor; ekranda yine de görünmeli
          yoksa kullanıcı ne çizdiğini bırakınca öğrenirdi. Tek noktalı taslak
          çizilmez: drei `<Line>` iki nokta ister. */}
      {draft && draft.length >= 2 && (
        <Line
          points={toLinePoints(draft)}
          color={SCENE_COLORS.sketch}
          lineWidth={STROKE_WIDTH_PX}
          renderOrder={RENDER_ORDER.label}
        />
      )}
    </>
  )
}
