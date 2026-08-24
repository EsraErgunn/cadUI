import { getPointSymbolPlanGeometry } from './architectureSymbol'
import type { PlanPoint } from './coords'
import { getLabelRectCm } from './labelLeader'
import type { PointSymbol, PointSymbolType } from './model'
import { SYMBOL_TYPE_LABELS } from './pointSymbol'
import { isPointInRect, type PlanRect } from './selection'
import type { SymbolPose } from './symbolPlacement'

/** Alan nesnesinin ad etiketiyle AYNI ölçü — ikisi aynı planda yan yana okunuyor. */
export const POINT_SYMBOL_LABEL_SIZE_PX = 12

/** Etiket, cihazın çiziminin bu kadar üstünde durur (ekran pikseli). */
const LABEL_MARGIN_PX = 14

/**
 * Etikette yazan metin: TÜRÜN Türkçe adı ("Deprem Sensörü"), cihazın `label`
 * kodu ("DS-01") DEĞİL — alan nesnesindeki kuralın aynısı (`getAreaObjectNameLabel`):
 * kullanıcının istediği "ne olduğunun anlaşılması", kod bunu söylemiyor. Kod
 * panelde duruyor ve düzenlenebilir kalıyor.
 *
 * ⚠️ TÜM cihaz tipleri etiketleniyor (kullanıcı: "hepsine"). Alan nesnesinde
 * merdiven dışarıda bırakılmıştı çünkü oku ve basamakları kendini anlatıyor;
 * cihaz işaretleri şematik, hiçbiri kendi başına okunmuyor.
 */
export function getPointSymbolNameLabel(type: PointSymbolType): string {
  return SYMBOL_TYPE_LABELS[type]
}

/**
 * Cihazın ÇİZİLEN geometrisinin dünya sınır kutusu.
 *
 * Çekme çizgili cihazda kutu duvar yüzünden İŞARETİN dış kenarına kadar uzanır;
 * etiket bu yüzden işaretin üstünde durur, duvarın üstünde değil — `SYMBOL_DISPLAY`
 * ölçülerinden hesaplansaydı çekme çizgisinin boyu hesaba katılmazdı.
 */
export function getPointSymbolWorldBoundsCm(type: PointSymbolType, pose: SymbolPose): PlanRect {
  const geometry = getPointSymbolPlanGeometry(type, pose)
  const points = geometry.strokes.flatMap((stroke) => stroke.points)

  // Geometrisi olmayan (kuramsal) şekilde kutu çapa noktasına iner.
  if (points.length === 0) {
    return {
      minX: pose.position.x,
      minY: pose.position.y,
      maxX: pose.position.x,
      maxY: pose.position.y,
    }
  }

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

/**
 * Cihazın DIŞA bakan yönü, plan uzayında birim vektör. Yerel +y duvardan dışa
 * bakıyor (`toPlanPoints` ile aynı dönüşüm, yalnız ötelemesiz).
 */
function getOutwardDirection(pose: SymbolPose): PlanPoint {
  const radians = (pose.rotationDeg * Math.PI) / 180
  const y = pose.outwardSign
  return { x: -Math.sin(radians) * y, y: Math.cos(radians) * y }
}

/**
 * Etiketin cihazın çapa noktasına göre etkin kayması: kullanıcı taşıdıysa
 * saklanan değer, taşımadıysa varsayılan yer (`getDefaultLabelAnchorCm`).
 *
 * Kayma ÇAPA NOKTASINA göreli — duvar taşınınca ya da cihaz duvar boyunca
 * kayınca etiket kendiliğinden birlikte gelir.
 */
export function getPointSymbolLabelOffsetCm(
  symbol: Pick<PointSymbol, 'type' | 'labelOffsetCm'>,
  pose: SymbolPose,
  zoom: number,
): PlanPoint {
  if (symbol.labelOffsetCm) return symbol.labelOffsetCm

  const anchor = getDefaultLabelAnchorCm(symbol.type, pose, zoom)
  return { x: anchor.x - pose.position.x, y: anchor.y - pose.position.y }
}

/** Etiket yazısının merkezi: kullanıcı taşıdıysa saklanan kayma, taşımadıysa varsayılan yer. */
export function getPointSymbolLabelAnchorCm(
  symbol: Pick<PointSymbol, 'type' | 'labelOffsetCm'>,
  pose: SymbolPose,
  zoom: number,
): PlanPoint {
  const offset = getPointSymbolLabelOffsetCm(symbol, pose, zoom)
  return { x: pose.position.x + offset.x, y: pose.position.y + offset.y }
}

/**
 * İmlecin altındaki etiketin cihazı. Üst üste binenlerde SON eklenen kazanır —
 * `pickAreaObjectLabelAt` ile aynı kural (dizinin sonu en üstte çizilen).
 */
export function pickPointSymbolLabelAt(
  target: PlanPoint,
  symbols: readonly PointSymbol[],
  resolvePose: (symbol: PointSymbol) => SymbolPose | undefined,
  zoom: number,
): PointSymbol | undefined {
  for (let index = symbols.length - 1; index >= 0; index -= 1) {
    const symbol = symbols[index]
    const pose = resolvePose(symbol)
    if (!pose) continue

    const anchor = getPointSymbolLabelAnchorCm(symbol, pose, zoom)
    const label = getPointSymbolNameLabel(symbol.type)
    if (isPointInRect(target, getLabelRectCm(anchor, label, POINT_SYMBOL_LABEL_SIZE_PX, zoom))) {
      return symbol
    }
  }

  return undefined
}

/**
 * Etiketin VARSAYILAN yeri: çizimin dışında, cihazın duvardan dışa baktığı
 * yönde ve cihazın enine göre ortalanmış.
 *
 * ⚠️ "Yukarı" sabit yön DEĞİL. İlk sürüm etiketi dünya +y'sine koyuyordu ve
 * aşağı bakan bir cihazda işaret duvarın altında, yazısı üstünde kalıyordu —
 * kılavuz duvarı kesiyor, yazı komşu odaya düşüyordu (tarayıcıda görüldü). Yön
 * cihazın kendi ekseninden geliyor, ama YAZI dönmüyor: dik duruyor, yalnız
 * nereye konacağı dönüyor.
 *
 * Pay ekran pikselinden çevrilir (px/zoom) — yazı ekran-sabit boyda olduğu için
 * pay da öyle olmalı, yoksa uzak zoom'da büyüyen yazı cihazın üstüne binerdi
 * (`getAreaObjectLabelOffsetCm` ile aynı gerekçe).
 */
function getDefaultLabelAnchorCm(
  type: PointSymbolType,
  pose: SymbolPose,
  zoom: number,
): PlanPoint {
  const bounds = getPointSymbolWorldBoundsCm(type, pose)
  const direction = getOutwardDirection(pose)
  // Dışa yönün dikeyi; etiket cihazın ENİNE göre de ortalansın.
  const lateral = { x: -direction.y, y: direction.x }

  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ].map((corner) => ({ x: corner.x - pose.position.x, y: corner.y - pose.position.y }))

  const along = corners.map((corner) => corner.x * direction.x + corner.y * direction.y)
  const across = corners.map((corner) => corner.x * lateral.x + corner.y * lateral.y)

  const distanceCm =
    Math.max(...along) + (LABEL_MARGIN_PX + POINT_SYMBOL_LABEL_SIZE_PX / 2) / zoom
  const centerAcrossCm = (Math.min(...across) + Math.max(...across)) / 2

  return {
    x: pose.position.x + direction.x * distanceCm + lateral.x * centerAcrossCm,
    y: pose.position.y + direction.y * distanceCm + lateral.y * centerAcrossCm,
  }
}
