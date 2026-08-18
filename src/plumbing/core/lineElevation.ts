import type { InstallationLine, LineEndAttachment } from './installationModel'
import { getSegmentLengthCm, isSamePoint } from './lineGeometry'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'

/** `+`/`-` tuşunun tek basışta değiştirdiği kot miktarı (K102). */
export const PIPE_HEIGHT_STEP_CM = 25

/** Art arda tuşlamanın kotu sonsuza taşımaması için sağduyu sınırı. */
const MAX_PIPE_HEIGHT_CM = 2000

export function clampPipeHeightCm(heightCm: number): number {
  if (heightCm > MAX_PIPE_HEIGHT_CM) return MAX_PIPE_HEIGHT_CM
  if (heightCm < -MAX_PIPE_HEIGHT_CM) return -MAX_PIPE_HEIGHT_CM
  return heightCm
}

/**
 * Hattın her noktasındaki kot: kümülatif PLAN uzunluğuna göre başlangıç→bitiş
 * arasında doğrusal enterpolasyon. Plan boyu SIFIR ise (saf dikey bağlantı,
 * iki nokta aynı x,y'de) bölme sıfıra gitmeden tüm ara noktalar `endHeightCm`
 * alır — yalnız iki uç anlamlı, aradaki "oran" tanımsız.
 */
export function getLinePointElevationsCm(
  points: readonly PlanPoint[],
  startHeightCm: number,
  endHeightCm: number,
): number[] {
  if (points.length === 0) return []
  if (points.length === 1) return [startHeightCm]

  const totalCm = getPlanLengthCm(points)
  if (totalCm === 0) return points.map((_, index) => (index === 0 ? startHeightCm : endHeightCm))

  const elevations: number[] = [startHeightCm]
  let cumulativeCm = 0
  for (let index = 1; index < points.length; index += 1) {
    cumulativeCm += getSegmentLengthCm(points[index - 1], points[index])
    const ratio = cumulativeCm / totalCm
    elevations.push(startHeightCm + (endHeightCm - startHeightCm) * ratio)
  }
  return elevations
}

/** `offsetCm` (segment başından PLAN mesafesi) konumundaki kot — `onLine` yerleşimi için. */
export function getElevationAtOffsetCm(
  points: readonly PlanPoint[],
  startHeightCm: number,
  endHeightCm: number,
  offsetCm: number,
): number {
  const totalCm = getPlanLengthCm(points)
  if (totalCm === 0) return endHeightCm

  const ratio = Math.min(1, Math.max(0, offsetCm / totalCm))
  return startHeightCm + (endHeightCm - startHeightCm) * ratio
}

/** Gerçek 3B boru boyu: her segmentin plan+kot bileşke uzunluğu toplanır. */
export function getLine3dLengthCm(
  points: readonly PlanPoint[],
  startHeightCm: number,
  endHeightCm: number,
): number {
  if (points.length < 2) return 0

  const elevations = getLinePointElevationsCm(points, startHeightCm, endHeightCm)
  let totalCm = 0
  for (let index = 1; index < points.length; index += 1) {
    const planCm = getSegmentLengthCm(points[index - 1], points[index])
    const dzCm = elevations[index] - elevations[index - 1]
    totalCm += Math.hypot(planCm, dzCm)
  }
  return totalCm
}

/**
 * Boruya oturan (`inlineElementId`) bir elemanın kotu — borunun kendisi
 * yükselince/alçalınca vana/sayaç gibi armatürler görsel olarak izler.
 * Yalnız `pipe` türü hatlar kot taşır (K102); serbest duran ya da
 * chimney/duct/branch üstünde oturan elemanlarda `0` döner. Sürükleme
 * ANINDAKİ canlı önizleme bunu OKUMAZ (ayrı bir kanaldan gelir,
 * `plumbingUiStore` sürükleme durumu) — yalnız COMMİT edilmiş hat verisini
 * yansıtır; bilinen sınır: sürükleme sırasında kot bırakılana kadar eski
 * değerinde kalır.
 */
export function getInlineElementElevationCm(elementId: Id, lines: readonly InstallationLine[]): number {
  for (const line of lines) {
    const index = line.points.findIndex((point) => point.inlineElementId === elementId)
    if (index === -1) continue
    if (line.kind !== 'pipe' || !line.pipe) return 0

    const positions = line.points.map((point) => point.position)
    const offsetCm = getPlanLengthCm(positions.slice(0, index + 1))
    return getElevationAtOffsetCm(positions, line.pipe.startHeightCm, line.pipe.endHeightCm, offsetCm)
  }
  return 0
}

/**
 * "Boy" alanına yazılan hedef 3B uzunluğa göre BİTİŞ noktasının yeni plan
 * konumu + yeni bitiş kotu. Segmentin GÜNCEL 3B yönü (plan + kot bileşkesi)
 * korunur, yalnız ölçeklenir — saf yatay boruda yalnız plan uzar/kısalır, saf
 * dikey bağlantıda (K102) yalnız kot değişir, eğik segmentte ikisi orantılı
 * değişir. Başlangıç noktası SABİT kalır.
 *
 * Güncel 3B uzunluk SIFIRSA (start === end konumda VE kotta) yön tanımsızdır,
 * `null` döner — çağıran alanı reddeder.
 */
export function resolvePipeResizeTarget(
  start: PlanPoint,
  end: PlanPoint,
  startHeightCm: number,
  endHeightCm: number,
  targetLengthCm: number,
): { position: PlanPoint; endHeightCm: number } | null {
  if (targetLengthCm <= 0) return null

  const planLengthCm = getSegmentLengthCm(start, end)
  const heightDeltaCm = endHeightCm - startHeightCm
  const current3dLengthCm = Math.hypot(planLengthCm, heightDeltaCm)
  if (current3dLengthCm === 0) return null

  const scale = targetLengthCm / current3dLengthCm
  return {
    position: {
      x: start.x + (end.x - start.x) * scale,
      y: start.y + (end.y - start.y) * scale,
    },
    endHeightCm: startHeightCm + heightDeltaCm * scale,
  }
}

/**
 * Zincirin ucu ZATEN aynı konumda bir dikey (plan boyu sıfır) `pipe`
 * segmentinin bitişindeyse o hattın id'sini döner — art arda `+`/`-` basışı
 * ÜST ÜSTE BİNEN ayrı borular yazmasın diye (kullanıcı isteği, 2026-08):
 * ikinci basış yeni bir hat YAZMAZ, var olanın `endHeightCm`'i güncellenir.
 *
 * Yalnız zincirin `startTarget`'ı o hattın UCUNA bağlıysa eşleşir (`linePoint`
 * kind) — kullanıcı araya yatay bir adım koyduysa artık başka bir noktadayız,
 * eşleşmez.
 */
export function findMergeablePipeLineId(
  anchor: PlanPoint,
  startTarget: LineEndAttachment | null,
  lines: readonly InstallationLine[],
): Id | null {
  if (!startTarget || startTarget.kind !== 'linePoint') return null

  const line = lines.find((candidate) => candidate.id === startTarget.lineId)
  if (!line || line.kind !== 'pipe' || line.points.length !== 2) return null

  const [start, end] = line.points
  if (!isSamePoint(start.position, end.position)) return null
  if (!isSamePoint(start.position, anchor)) return null

  return line.id
}

function getPlanLengthCm(points: readonly PlanPoint[]): number {
  let totalCm = 0
  for (let index = 1; index < points.length; index += 1) {
    totalCm += getSegmentLengthCm(points[index - 1], points[index])
  }
  return totalCm
}
