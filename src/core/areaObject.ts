import type { PlanPoint } from './coords'
import type { AreaObject, AreaObjectType, Id, Opening, Point, Wall } from './model'
import { applyTransform } from './transform'
import { findBlockingOpeningInSegments } from './wallGraph'
import { getWallFrameAtOffsetCm } from './wallPath'

/**
 * Etiket öneki. Record olduğu için yeni tip eklenip önek unutulursa DERLEME
 * kırılır — bkz. `pointSymbol.ts` → `SYMBOL_LABEL_PREFIXES`, aynı gerekçe.
 */
export const AREA_OBJECT_LABEL_PREFIXES: Record<AreaObjectType, string> = {
  stairs: 'M',
  structuralColumn: 'K',
  flueShaft: 'BS',
  columnVentilation: 'KH',
}

/** Kullanıcıya görünen Türkçe ad; panel başlığı ve durum metinleri bunu okur. */
export const AREA_OBJECT_TYPE_LABELS: Record<AreaObjectType, string> = {
  stairs: 'Merdiven',
  structuralColumn: 'Kolon',
  flueShaft: 'Baca Şaftı',
  columnVentilation: 'Kolon Havalandırması',
}

/** Sıfır/negatif boyut görünmez nesne üretir; akıl sağlığı sınırı (duvar kalınlığıyla aynı gerekçe). */
export const MIN_AREA_OBJECT_SIZE_CM = 1

/**
 * Tıkla-yerleştirmede kullanılan başlangıç boyutu; sürükleyerek boyutlandırma
 * (tutamaç) bunu sonradan değiştirir.
 */
export const DEFAULT_AREA_OBJECT_SIZE_CM: Record<AreaObjectType, { widthCm: number; lengthCm: number }> = {
  // Tek kol merdiven varsayımı — tam kat yüksekliği (300+) yerine kısa bir kol.
  stairs: { widthCm: 120, lengthCm: 200 },
  // En az 1m kenar — kullanıcı görsel referansla netleştirdi (K39 taslağı çok küçüktü).
  structuralColumn: { widthCm: 100, lengthCm: 100 },
  flueShaft: { widthCm: 100, lengthCm: 100 },
  // Baca şaftının iç çemberine YAKIN (100 × 0.92 = 92) ama bir tık küçük çap —
  // kullanıcı istedi. areaObjectGeometry.ts → FLUE_SHAFT_CIRCLE_RATIO değişirse
  // elle senkron kalmalı.
  columnVentilation: { widthCm: 80, lengthCm: 80 },
}

const LABEL_NUMBER_PAD = 2

export function formatAreaObjectLabel(type: AreaObjectType, sequence: number): string {
  return `${AREA_OBJECT_LABEL_PREFIXES[type]}-${String(sequence).padStart(LABEL_NUMBER_PAD, '0')}`
}

/**
 * Sıradaki etiket: aynı KAT ve aynı TİPTEKİ en yüksek numaranın bir fazlası.
 * Bkz. `pointSymbol.ts` → `getNextSymbolLabel`, aynı gerekçe (silinen numara
 * geri kullanılmaz).
 */
export function getNextAreaObjectLabel(
  areaObjects: readonly AreaObject[],
  type: AreaObjectType,
  floorId: Id,
): string {
  const pattern = new RegExp(`^${AREA_OBJECT_LABEL_PREFIXES[type]}-(\\d+)$`)

  let highest = 0
  for (const areaObject of areaObjects) {
    if (areaObject.type !== type || areaObject.floorId !== floorId) continue
    const match = pattern.exec(areaObject.label.trim())
    if (match) highest = Math.max(highest, Number(match[1]))
  }

  return formatAreaObjectLabel(type, highest + 1)
}

/**
 * Etiket çakışması KAT içinde tanımlıdır ve TİPTEN bağımsızdır — `pointSymbol.ts`
 * → `isSymbolLabelTaken` ile aynı kural, aynı gerekçe (KK-10).
 */
export function isAreaObjectLabelTaken(
  areaObjects: readonly AreaObject[],
  label: string,
  floorId: Id,
  exceptAreaObjectId?: Id,
): boolean {
  const trimmed = label.trim()
  return areaObjects.some(
    (areaObject) =>
      areaObject.id !== exceptAreaObjectId &&
      areaObject.floorId === floorId &&
      areaObject.label.trim() === trimmed,
  )
}

export function isAreaObjectLabelValid(label: string): boolean {
  return label.trim().length > 0
}

/**
 * Araç → alan nesnesi tipi eşlemesinin TEK yeri — `pointSymbol.ts` →
 * `getPointSymbolTypeForTool` ile aynı desen.
 */
export function getAreaObjectTypeForTool(toolId: string): AreaObjectType | undefined {
  return toolId in AREA_OBJECT_LABEL_PREFIXES ? (toolId as AreaObjectType) : undefined
}

/**
 * Geometri fonksiyonlarının ihtiyacı olan alt küme — `symbolPlacement.ts` →
 * `SymbolPose` ile aynı desen: sahne katmanı (önizleme, sürükleme çizimi) tam
 * `AreaObject`'i değil, henüz id/label/type almamış bir taslağı da geçirebilsin.
 */
export type AreaObjectShape = Pick<AreaObject, 'x' | 'y' | 'widthCm' | 'lengthCm' | 'angleDeg'>

/**
 * Yerel (merkeze göreli, döndürülmemiş) nokta → plan noktası. Yerel eksende
 * width=x, length=y. `architectureSymbol.ts` → `toPlanPoints` ile aynı desen.
 */
export function toAreaObjectPlanPoints(
  areaObject: AreaObjectShape,
  localPoints: readonly PlanPoint[],
): PlanPoint[] {
  const pivot = { x: areaObject.x, y: areaObject.y }
  return localPoints.map((local) =>
    applyTransform(
      { x: areaObject.x + local.x, y: areaObject.y + local.y },
      { kind: 'rotate', pivot, angleDeg: areaObject.angleDeg },
    ),
  )
}

/**
 * Dikdörtgenin dört köşesi, merkez (x,y) etrafında `angleDeg` kadar döndürülmüş.
 * Sırası: sol-üst, sağ-üst, sağ-alt, sol-alt (yerel eksende width=x, length=y).
 */
export function getAreaObjectCorners(areaObject: AreaObjectShape): PlanPoint[] {
  const halfWidth = areaObject.widthCm / 2
  const halfLength = areaObject.lengthCm / 2

  return toAreaObjectPlanPoints(areaObject, [
    { x: -halfWidth, y: -halfLength },
    { x: halfWidth, y: -halfLength },
    { x: halfWidth, y: halfLength },
    { x: -halfWidth, y: halfLength },
  ])
}

/** İmleç nesnenin üstünde mi? Döndürülmüş dikdörtgeni yerel eksene geri çevirip AABB testi yapar. */
export function isPointInAreaObject(target: PlanPoint, areaObject: AreaObjectShape): boolean {
  const pivot = { x: areaObject.x, y: areaObject.y }
  const local = applyTransform(target, { kind: 'rotate', pivot, angleDeg: -areaObject.angleDeg })

  return (
    Math.abs(local.x - areaObject.x) <= areaObject.widthCm / 2 &&
    Math.abs(local.y - areaObject.y) <= areaObject.lengthCm / 2
  )
}

/** Dikdörtgenin dört kenarı, sırayla — açıklık çarpışma kontrolüne segment olarak verilir. */
export function getAreaObjectEdges(areaObject: AreaObjectShape): { p1: PlanPoint; p2: PlanPoint }[] {
  const corners = getAreaObjectCorners(areaObject)
  return corners.map((corner, index) => ({ p1: corner, p2: corners[(index + 1) % corners.length] }))
}

/**
 * Alan nesnesi bir kapı/pencerenin İÇİNDEN geçiyorsa yerleştirme/taşıma
 * reddedilir — K35/K36'nın aynı fiziksel gerekçesi (bir açıklığın ortasında
 * hiçbir katı nesne duramaz), duvar yerine bu nesnenin kenarlarına uygulanmış
 * hâli. `findBlockingOpeningInSegments` zaten segment-agnostik, aynen kullanılır.
 *
 * **İkinci bir kontrol GEREKTİ.** Yalnız kenar-kesişimi yetmiyor: nesne
 * açıklıktan GENİŞSE, dört kenarın duvarı kestiği iki nokta açıklığın
 * aralığının İKİ YANINA düşebilir (aralığın kendisi değil) — nesne kapıyı
 * tamamen sarmalıyor ama hiçbir kenar aralığın İÇİNDE kesişmiyor, ilk kontrol
 * bunu KAÇIRIR. Bu yüzden açıklığın merkez noktası nesnenin içinde mi diye de
 * bakılıyor (`isPointInAreaObject`) — 100cm'lik varsayılan kolonla fark edildi.
 *
 * Bilinen sınır — wall-graph.md'deki "üst üste binen duvarlar" ile aynı sınır:
 * nesnenin kenarı açıklığı taşıyan duvarla PARALEL ve üst üsteyse (örn. bir
 * kolon duvara tam yaslanıp kapıyı örtüyor ama açıklığın MERKEZİ nesnenin
 * dışında kalıyorsa), `getInteriorCrossing` kesişim üretmez VE merkez noktası
 * kontrolü de kaçırabilir — ikisi de köşe/kenar durumlarını tam kapsamıyor.
 */
export function findBlockingOpeningForAreaObject(
  areaObject: AreaObjectShape & Pick<AreaObject, 'floorId'>,
  walls: readonly Wall[],
  points: readonly Point[],
  openings: readonly Opening[],
): Opening | undefined {
  const crossing = findBlockingOpeningInSegments(
    getAreaObjectEdges(areaObject),
    walls,
    points,
    openings,
    areaObject.floorId,
  )
  if (crossing) return crossing

  for (const wall of walls) {
    if (wall.floorId !== areaObject.floorId) continue
    const wallOpenings = openings.filter((opening) => opening.wallId === wall.id)
    if (wallOpenings.length === 0) continue

    for (const opening of wallOpenings) {
      const frame = getWallFrameAtOffsetCm(wall, points, opening.offsetCm)
      if (frame && isPointInAreaObject(frame.point, areaObject)) return opening
    }
  }

  return undefined
}
