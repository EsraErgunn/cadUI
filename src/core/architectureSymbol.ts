import type { PlanPoint } from './coords'
import type { PointSymbolType } from './model'
import type { SymbolPose } from './symbolPlacement'
import { applyTransform } from './transform'

/**
 * Cihazın PLANDAKİ ayak izi: `widthCm` duvar boyunca, `depthCm` duvara dik.
 *
 * Ölçüler UYDURULMADI, `docs/webcad-reference.json`'daki gerçek cihaz
 * kayıtlarından alındı (`width` × `depth`). Referans planda cihazı bir resim
 * değil, bu ölçülerde düz bir DİKDÖRTGEN olarak çiziyor — şematik piktogram
 * (daire+çarpı, titreşim dalgası vb.) kullanmıyor.
 *
 * Sabit kare kullanılsaydı pano ile alarm planda aynı boyda görünürdü; oysa
 * pano 50 cm geniş, alarm 20. Oran yanlış olunca çizim duvara göre yanlış yer
 * kaplıyor ve "garip" görünüyor.
 */
export const SYMBOL_FOOTPRINTS_CM: Record<
  PointSymbolType,
  { widthCm: number; depthCm: number }
> = {
  panel: { widthCm: 50, depthCm: 10 },
  mainCutoffSwitch: { widthCm: 50, depthCm: 20 },
  alarmDevice: { widthCm: 20, depthCm: 20 },
  earthquakeSensor: { widthCm: 20, depthCm: 20 },
  fireExtinguisher: { widthCm: 26, depthCm: 20 },
  // Referansta menfezin `depth` alanı yok; `height` (10) düşey yüz ölçüsü.
  // Planda ince bir bant olarak çiziliyor, o yüzden derinlik ondan alındı.
  vent: { widthCm: 15, depthCm: 10 },
  // Aydınlatma referansta ölçüsüz (tavana takılıyor, duvar cihazı değil).
  // Bu ölçü TEYİDE AÇIK — diğerleriyle okunabilir bir oranda tutuldu.
  lighting: { widthCm: 20, depthCm: 20 },
}

/** Çizgi kalınlığını sahne bu role göre seçer; px değeri core'da tutulmaz. */
export type SymbolStrokeRole = 'body' | 'detail'

export type SymbolStroke = {
  /** Benzersiz ad — React key (indeks DEĞİL, CLAUDE.md kural 6). */
  name: string
  role: SymbolStrokeRole
  points: PlanPoint[]
}

export type SymbolGeometry = {
  strokes: SymbolStroke[]
  /** Dolu alanların köşeleri; boşsa dolgu yok. */
  fills: PlanPoint[][]
}

/**
 * Sembolün YEREL cm geometrisi: orijin cihazın merkezi, +x duvar boyunca,
 * +y duvara dik. Referans gibi düz bir dikdörtgen; içi dolu çizilir, konturu
 * ayrıca çekilir ki küçük cihazlar (20 cm) da sınırıyla okunsun.
 */
export function getPointSymbolGeometry(type: PointSymbolType): SymbolGeometry {
  const { widthCm, depthCm } = SYMBOL_FOOTPRINTS_CM[type]
  const halfWidth = widthCm / 2
  const halfDepth = depthCm / 2

  const corners: PlanPoint[] = [
    { x: -halfWidth, y: -halfDepth },
    { x: halfWidth, y: -halfDepth },
    { x: halfWidth, y: halfDepth },
    { x: -halfWidth, y: halfDepth },
  ]

  return {
    strokes: [{ name: 'outline', role: 'body', points: [...corners, corners[0]] }],
    fills: [corners],
  }
}

/**
 * Yerel cm → plan uzayı: sembolün açısı kadar döndür, konumuna taşı.
 *
 * ÖLÇEKLEME YOK — geometri zaten gerçek santimetrede. (Önce birim çerçevede
 * tanımlanıp ölçekleniyordu; ölçüler referanstan gelince ara katman gereksiz
 * kaldı.) Dönme `core/transform.ts` → `applyTransform` ile, ikinci bir rotasyon
 * uygulaması yazılmıyor.
 */
export function toPlanPoints(pose: SymbolPose, localPoints: readonly PlanPoint[]): PlanPoint[] {
  return localPoints.map((local) => {
    const rotated = applyTransform(local, {
      kind: 'rotate',
      pivot: { x: 0, y: 0 },
      angleDeg: pose.rotationDeg,
    })
    return { x: rotated.x + pose.position.x, y: rotated.y + pose.position.y }
  })
}

/**
 * Sembolün plandaki tam geometrisi — sahne bunu doğrudan çizer. Konum ve açı
 * `core/symbolPlacement.ts` → `getSymbolPose`'dan gelir; duvara bağlı sembolde
 * ikisi de duvardan türer, burada o ayrım bilinmez.
 */
export function getPointSymbolPlanGeometry(
  type: PointSymbolType,
  pose: SymbolPose,
): SymbolGeometry {
  const geometry = getPointSymbolGeometry(type)

  return {
    strokes: geometry.strokes.map((stroke) => ({
      ...stroke,
      points: toPlanPoints(pose, stroke.points),
    })),
    fills: geometry.fills.map((fill) => toPlanPoints(pose, fill)),
  }
}

/**
 * İmleç sembolün üstünde mi? Ayak izinin sınır KUTUSU kullanılıyor: kullanıcı
 * cihazı tutmaya çalışırken kenarının tam üstüne basmak zorunda kalmasın.
 * Döndürülmüş sembolde kutu bir miktar büyük kalır — tutmayı kolaylaştırdığı
 * için kabul edilir, seçim zaten en yakın sembole gidiyor.
 */
export function isPointInSymbol(
  target: PlanPoint,
  position: PlanPoint,
  toleranceCm: number,
  type: PointSymbolType,
): boolean {
  const { widthCm, depthCm } = SYMBOL_FOOTPRINTS_CM[type]
  const reach = Math.max(widthCm, depthCm) / 2 + toleranceCm

  return Math.abs(target.x - position.x) <= reach && Math.abs(target.y - position.y) <= reach
}
