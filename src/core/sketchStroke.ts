import type { PlanPoint } from './coords'
import type { Id } from './model'

/**
 * Serbest çizim darbesi — kalemi basılı tutarken çizilen TEK sürekli çizgi.
 *
 * ⚠️ Bu bir MODEL tipi DEĞİL: `core/model.ts`'e girmiyor, projeye kaydedilmiyor
 * ve JSON'a yazılmıyor (K163, kullanıcı kararı). Ekran üstü bir not; kalıcı
 * olsaydı WebCAD tur-dönüş sözleşmesini de genişletmek gerekirdi.
 */
export type SketchStroke = {
  id: Id
  /** Hangi katın üstüne çizildi; başka katta görünmez. */
  floorId: Id
  points: PlanPoint[]
}

/**
 * İki örnek arasındaki en küçük uzaklık (cm). Fare hareketi saniyede onlarca
 * olay üretiyor ve hepsi yazılsaydı tek darbe binlerce nokta taşırdı — çizgi
 * her karede yeniden tamponlanır, K99'daki `bufferData` fırtınasının aynısı
 * doğardı. Eşik EKRAN mesafesi değil PLAN mesafesi: yakınlaştırınca daha sık
 * örnekleniyor, yani detay zoom'la birlikte artıyor.
 */
const MIN_SAMPLE_DISTANCE_CM = 2

/**
 * Darbenin tıklama sayılmaması için gereken en küçük toplam uzunluk (cm).
 * Aracı seçip tuvale bir kez tıklayan kullanıcı ekranda nokta bırakmamalı.
 */
const MIN_STROKE_LENGTH_CM = 3

/**
 * Yeni örneği darbeye ekler; çok yakınsa AYNI diziyi döndürür.
 *
 * Aynı referansı döndürmek bilinçli: React tarafı değişmediğini referanstan
 * anlıyor ve gereksiz yeniden çizim yapmıyor.
 */
export function appendStrokePoint(
  points: readonly PlanPoint[],
  next: PlanPoint,
): readonly PlanPoint[] {
  const last = points.at(-1)
  if (last && Math.hypot(next.x - last.x, next.y - last.y) < MIN_SAMPLE_DISTANCE_CM) {
    return points
  }
  return [...points, next]
}

export function getStrokeLengthCm(points: readonly PlanPoint[]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]
    const b = points[index]
    total += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return total
}

/** Ekranda iz bırakmaya değer mi? Tek tıklama ve titreme elenir. */
export function isStrokeWorthKeeping(points: readonly PlanPoint[]): boolean {
  return points.length >= 2 && getStrokeLengthCm(points) >= MIN_STROKE_LENGTH_CM
}

/**
 * Silginin darbeye değip değmediği. Uzaklık noktalara değil SEGMENTLERE
 * bakılarak ölçülüyor: seyreltme yüzünden iki örnek arası 2 cm'e kadar
 * açılabiliyor ve yalnız noktalara bakan bir silgi çizginin ortasından geçerken
 * hiçbir şey silmezdi.
 */
export function isStrokeHit(
  points: readonly PlanPoint[],
  target: PlanPoint,
  toleranceCm: number,
): boolean {
  for (let index = 1; index < points.length; index += 1) {
    if (getDistanceToSegmentCm(target, points[index - 1], points[index]) <= toleranceCm) {
      return true
    }
  }
  // Tek noktalı darbe normalde saklanmıyor ama savunmacı: uzaklık ona bakılır.
  const sole = points[0]
  return points.length === 1 && sole !== undefined
    ? Math.hypot(target.x - sole.x, target.y - sole.y) <= toleranceCm
    : false
}

function getDistanceToSegmentCm(target: PlanPoint, a: PlanPoint, b: PlanPoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(target.x - a.x, target.y - a.y)

  // Segmentin DIŞINA düşen izdüşüm uca kırpılır: sonsuz doğruya olan uzaklık,
  // kısa bir segmentin çok uzağındaki imleci de "değdi" sayardı.
  const t = Math.min(
    1,
    Math.max(0, ((target.x - a.x) * dx + (target.y - a.y) * dy) / lengthSquared),
  )
  return Math.hypot(target.x - (a.x + dx * t), target.y - (a.y + dy * t))
}

/**
 * Serbest çizimin geri alınabilir işlemi (K164).
 *
 * Anlık görüntü değil İŞLEM tutuluyor: silgi de geri alınabilmeli ve "eklendi"
 * ile "silindi" birbirinin tam tersi — tersini almak için darbenin kendisini
 * saklamak yetiyor.
 */
export type SketchOp = { kind: 'add' | 'remove'; stroke: SketchStroke }
