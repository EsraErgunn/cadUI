import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
  LineEndAttachment,
} from './installationModel'
import { getSegmentLengthCm, isSamePoint } from './lineGeometry'
import type { PipeLineProperties } from './lineProperties'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'

/** Kotun sonsuza taşınmaması için sağduyu sınırı. */
const MAX_PIPE_HEIGHT_CM = 2000

/**
 * Sayaç boş bir boru ucuna takılınca (`placeElementAtLineEnd`) o borunun
 * varsayılan kotu (kullanıcı isteği, 2026-08): sayaç saha uygulamasında
 * duvara ~2 m'de monte edilir, borusuz her zaman zemin kotunda (0) başlamazdı.
 */
export const GAS_METER_DEFAULT_HEIGHT_CM = 200

/**
 * Servis kutusundan çıkan İLK borunun varsayılan başlangıç kotu (kullanıcı
 * isteği, 2026-08): kutu zeminde/toprak altına yakın çıkar, sayaç kotuyla
 * (200) AYNI olsaydı borunun servis kutusundan sayaca dümdüz gittiği yanlış
 * izlenimi verirdi — düşük ama sıfırdan farklı, gerçek çıkış yüksekliği.
 */
export const SERVICE_BOX_SEED_HEIGHT_CM = 15

/**
 * Sayaç ÇIKIŞINDAN devam eden branşman borusunun varsayılan başlangıç kotu
 * (kullanıcı isteği, 2026-08): sayaçla (`GAS_METER_DEFAULT_HEIGHT_CM`) AYNI
 * değer — saha uygulamasında boru zaten duvar hizasında ~2 m'de gider,
 * sıfırdan başlayıp sayaçta aniden zıplamaz.
 */
export const BRANCH_SEED_HEIGHT_CM = GAS_METER_DEFAULT_HEIGHT_CM

export function clampPipeHeightCm(heightCm: number): number {
  if (heightCm > MAX_PIPE_HEIGHT_CM) return MAX_PIPE_HEIGHT_CM
  if (heightCm < -MAX_PIPE_HEIGHT_CM) return -MAX_PIPE_HEIGHT_CM
  return heightCm
}

export type ElevationFloorCap = {
  /** Bu katta yazılacak kot — tavanı (`floorHeightCm`) AŞMAZ. */
  endHeightCm: number
  /** Tavanı aşan kısım — üstteki kata taşınacak miktar. Aşılmadıysa 0. */
  overflowCm: number
}

/**
 * Hedef kot bir katın tavanını (`floorHeightCm`) aşarsa: bu katta biten kot
 * (tavanla sınırlı) + üstteki kata taşınacak kalan (kullanıcı isteği, 2026-08
 * — "boruya katın uzunluğundan fazla kot verilirse yeni kata çıksın, üstüne
 * hâlâ kot varsa o kadar daha yeni katta kot verilsin"). K102'nin "otomatik
 * kolon YOK" notunu bilinçli olarak geride bırakır, bkz.
 * knowledge/pipe-floor-crossing.md. Yalnız YUKARI yönde anlamlı — negatif
 * hedefler (0'ın altı) bu fonksiyondan hiç geçmez, kapsam dışı.
 */
export function capElevationToFloor(targetHeightCm: number, floorHeightCm: number): ElevationFloorCap {
  if (targetHeightCm <= floorHeightCm) return { endHeightCm: targetHeightCm, overflowCm: 0 }
  return { endHeightCm: floorHeightCm, overflowCm: targetHeightCm - floorHeightCm }
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
 * İKİ uçlu (`pipe.startHeightCm`/`endHeightCm`) kot taşıyan hat türleri.
 * `pipe` doğal sahibi; `branchStub` da (kullanıcı isteği, 2026-08) — mavi
 * kesikli kol sayaca giden gerçek bir borudur, yalnız çizim biçimi farklı.
 * `branch` bunun DIŞINDA: tek alanlı (`branch.elevationCm`), ayrı okunur.
 */
function hasTwoEndedPipeElevation(
  line: InstallationLine,
): line is InstallationLine & { pipe: PipeLineProperties } {
  return (line.kind === 'pipe' || line.kind === 'branchStub') && line.pipe !== undefined
}

/**
 * Boruya oturan (`inlineElementId`) bir elemanın kotu — borunun kendisi
 * yükselince/alçalınca vana/sayaç gibi armatürler görsel olarak izler.
 * Yalnız İKİ UÇLU kot taşıyan hatlar (`hasTwoEndedPipeElevation`) anlamlı;
 * serbest duran ya da chimney/duct/branch üstünde oturan elemanlarda `0`
 * döner. Sürükleme ANINDAKİ canlı önizleme bunu OKUMAZ (ayrı bir kanaldan
 * gelir, `plumbingUiStore` sürükleme durumu) — yalnız COMMİT edilmiş hat
 * verisini yansıtır; bilinen sınır: sürükleme sırasında kot bırakılana kadar
 * eski değerinde kalır.
 */
export function getInlineElementElevationCm(elementId: Id, lines: readonly InstallationLine[]): number {
  for (const line of lines) {
    const index = line.points.findIndex((point) => point.inlineElementId === elementId)
    if (index === -1) continue
    if (!hasTwoEndedPipeElevation(line)) return 0

    const positions = line.points.map((point) => point.position)
    const offsetCm = getPlanLengthCm(positions.slice(0, index + 1))
    return getElevationAtOffsetCm(positions, line.pipe.startHeightCm, line.pipe.endHeightCm, offsetCm)
  }
  return 0
}

/**
 * Bir elemanın SAHNEDEKİ (3B) kotu — tutunma biçiminden bağımsız TEK adres
 * (kullanıcı isteği, 2026-08: "Z ekseninde kullandığımız her şey için
 * geçerli"). Önceden yalnız `onLine` armatürler (`getInlineElementElevationCm`)
 * boruyu izliyordu; servis kutusu (`free`) ve sayaç (`lineEnd`) HER ZAMAN
 * `0`'da çiziliyordu — kutunun ÇIKIŞ borusu 15cm'e, sayacın giriş borusu
 * 200cm'e yükselse bile elemanın kendi sembolü zeminde kalıyordu.
 *
 * Sıra: önce `inlineElementId` (armatür bir boru DÜĞÜMÜdür), yoksa elemana
 * bağlı HERHANGİ bir port bağlantısı (servis kutusunun ÇIKIŞI, sayacın
 * GİRİŞİ, cihazın kolu) — o hattın UCUNDAKİ kotu alır. İkisi de yoksa (henüz
 * hiçbir şeye bağlanmamış serbest eleman) `0`.
 */
export function getElementElevationCm(
  elementId: Id,
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
): number {
  const isInline = lines.some((line) => line.points.some((point) => point.inlineElementId === elementId))
  if (isInline) return getInlineElementElevationCm(elementId, lines)

  const connection = connections.find(
    (candidate) => candidate.target.kind === 'port' && candidate.target.elementId === elementId,
  )
  if (!connection || connection.target.kind !== 'port') return 0

  const line = lines.find((candidate) => candidate.id === connection.lineId)
  if (!line || !hasTwoEndedPipeElevation(line)) return 0

  return connection.end === 'start' ? line.pipe.startHeightCm : line.pipe.endHeightCm
}

/**
 * Bir elemanın belirli GİRİŞ portuna bağlı boru (varsa) + hangi ucundan
 * bağlandığı. Sayaç gibi `lineEnd` ile takılan elemanlarda elemanın kendisi
 * hattın ÜSTÜNDE bir düğüm DEĞİLDİR (`inlineElementId` araya giren VANAda
 * durur) — kotu bu yüzden `getInlineElementElevationCm` ile OKUNAMAZ, ayrı bir
 * yoldan (`installationConnections`'taki `port` hedefinden) bulunması gerekir.
 * `portId` zorunlu: bir elemanın birden çok port bağlantısı olabilir (giriş VE
 * çıkışa ayrı borular), yalnız elementId ile arasak yanlışlıkla çıkış borusunu
 * bulabilirdik.
 */
export function findElementInputLine(
  elementId: Id,
  inputPortId: string,
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
): { line: InstallationLine; end: 'start' | 'end' } | null {
  const connection = connections.find(
    (candidate) =>
      candidate.target.kind === 'port' &&
      candidate.target.elementId === elementId &&
      candidate.target.portId === inputPortId,
  )
  if (!connection) return null

  const line = lines.find((candidate) => candidate.id === connection.lineId)
  return line ? { line, end: connection.end } : null
}

/**
 * Girişindeki borunun kotu (K102) — yalnız İKİ UÇLU kot taşıyan hatlarda
 * anlamlı (`hasTwoEndedPipeElevation`, `pipe` VE `branchStub`), yoksa `0`.
 * `findElementInputLine`'ın döndürdüğü UCA (`start`/`end`) göre doğru alan
 * okunur; borunun kotu düz olmayabilir (kullanıcı sonradan tek ucu değiştirmiş
 * olabilir), o yüzden her iki alan da değil, TAM o uç okunur.
 */
export function getElementInputElevationCm(
  elementId: Id,
  inputPortId: string,
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
): number {
  const found = findElementInputLine(elementId, inputPortId, lines, connections)
  if (!found || !hasTwoEndedPipeElevation(found.line)) return 0

  return found.end === 'start' ? found.line.pipe.startHeightCm : found.line.pipe.endHeightCm
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
 * segmentinin bitişindeyse o hattın id'sini döner — art arda kot değişikliği
 * ÜST ÜSTE BİNEN ayrı borular yazmasın diye (kullanıcı isteği, 2026-08):
 * yeni bir hat YAZMAZ, var olanın `endHeightCm`'i güncellenir.
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

/** Bir hattaki, target'ın gösterdiği NOKTAdaki kot (`linePoint`) ya da henüz
 *  bölünmemiş bir SEGMENT üstündeki konum (`lineSplit`) — `pipe`/`branchStub`
 *  ORANLA (`getElevationAtOffsetCm`), `branch` DÜZ tek değerle. */
function getLineElevationAtTargetCm(
  target: LineEndAttachment & { kind: 'linePoint' | 'lineSplit' },
  lines: readonly InstallationLine[],
): number {
  const line = lines.find((candidate) => candidate.id === target.lineId)
  if (!line) return 0
  if (line.kind === 'branch') return line.branch?.elevationCm ?? 0
  if (!hasTwoEndedPipeElevation(line)) return 0

  const positions = line.points.map((point) => point.position)
  const offsetCm =
    target.kind === 'linePoint'
      ? getPlanLengthCm(positions.slice(0, line.points.findIndex((p) => p.id === target.pointId) + 1))
      : getPlanLengthCm(positions.slice(0, target.segmentIndex + 1)) +
        getSegmentLengthCm(positions[target.segmentIndex], target.position)

  return getElevationAtOffsetCm(positions, line.pipe.startHeightCm, line.pipe.endHeightCm, offsetCm)
}

/**
 * Boş yere değil bir HEDEFE (port ya da mevcut hat) bağlı BAŞLAYAN yeni bir
 * borunun varsayılan kotu (kullanıcı isteği, 2026-08): hedefte NE VARSA o —
 * sayaçtan/servis kutusundan/branşmandan çıkan boru sıfırdan değil o
 * elemanın/hattın O ANKİ kotundan devam eder. Yalnız `pipe` aracı bu yolu
 * kullanır (`useLineTool.ts` → `startDraft`); branşman aracı hiç snap
 * ARAMAZ (kendi ground-free-point akışı `BRANCH_SEED_HEIGHT_CM`'i sabit
 * kullanır, bkz. `commitBranchGroundStep`).
 */
export function resolveSeedElevationCm(
  target: LineEndAttachment,
  elements: readonly InstallationElement[],
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
): number {
  if (target.kind === 'linePoint' || target.kind === 'lineSplit') {
    return getLineElevationAtTargetCm(target, lines)
  }
  if (target.kind !== 'port') return 0 // 'outlet' — baca/havalandırma ağzı, gaz taşımaz.

  const element = elements.find((candidate) => candidate.id === target.elementId)
  if (!element) return 0
  if (element.type === 'serviceBox') return SERVICE_BOX_SEED_HEIGHT_CM
  if (element.type !== 'gasMeter') return 0

  // Sayacın kotu DÜZ (giriş=çıkış, "Düz kot: eğim yok" notuna bkz.) — hangi
  // ucuna bağlı bir hat varsa ondan okunur, hiçbiri yoksa sabit varsayılana düşülür.
  const existingConnection = connections.find(
    (candidate) => candidate.target.kind === 'port' && candidate.target.elementId === element.id,
  )
  if (!existingConnection || existingConnection.target.kind !== 'port') {
    return GAS_METER_DEFAULT_HEIGHT_CM
  }

  return getElementInputElevationCm(element.id, existingConnection.target.portId, lines, connections)
}

function getPlanLengthCm(points: readonly PlanPoint[]): number {
  let totalCm = 0
  for (let index = 1; index < points.length; index += 1) {
    totalCm += getSegmentLengthCm(points[index - 1], points[index])
  }
  return totalCm
}
