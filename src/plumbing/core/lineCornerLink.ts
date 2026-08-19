import { getTargetElementId } from './installationModel'
import type { InstallationConnection, InstallationLine } from './installationModel'
import { isLineEndOnPort } from './portSnap'
import type { FloorPipeLink, Id } from '../../core/model'

export type LinkedLinePoint = { lineId: Id; pointId: Id }

/**
 * Bir hat ucunun ne olduğu: bir elemanın portuna mı bağlı, komşu bir boru
 * adımının köşesi mi, yoksa serbest mi. Sahne uç işaretini buna göre seçer —
 * her sol tık kendi borusunu yazdığı için (K-W) zincirin ORTASINDAKİ noktalar
 * da birer "hat ucu"dur, ama kullanıcı için onlar köşedir, uç değil.
 */
export type LineEndRole = 'port' | 'corner' | 'free'

function toKey(lineId: Id, pointId: Id): string {
  return `${lineId}:${pointId}`
}

/** Bir hattın verilen ucundaki nokta id'si — bağlantı kayıtları ucu ADIYLA tutuyor. */
export function getLineEndPointId(
  lines: readonly InstallationLine[],
  lineId: Id,
  end: InstallationConnection['end'],
): Id | undefined {
  const line = lines.find((candidate) => candidate.id === lineId)
  const point = end === 'start' ? line?.points[0] : line?.points.at(-1)
  return point?.id
}

/** Verilen köşeye BİR ADIM uzaklıktaki bağlı noktalar (iki yön de taranır). */
function getDirectLinks(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  point: LinkedLinePoint,
): LinkedLinePoint[] {
  const links: LinkedLinePoint[] = []

  for (const connection of connections) {
    if (connection.target.kind !== 'line') continue

    // İleri yön: başka bir hattın ucu BU köşeye tutunuyor.
    if (connection.target.lineId === point.lineId && connection.target.pointId === point.pointId) {
      const ownPointId = getLineEndPointId(lines, connection.lineId, connection.end)
      if (ownPointId !== undefined) links.push({ lineId: connection.lineId, pointId: ownPointId })
      continue
    }

    // Ters yön: BU köşenin kendisi başka bir hattın noktasına tutunuyor. Zincirin
    // ikinci adımını tutup çektiğimizde birincinin ucu da gelsin diye şart —
    // yalnız ileri yön taransaydı zincir yazılış sırasının tersine çekilince KOPARDI.
    if (connection.lineId !== point.lineId) continue
    if (getLineEndPointId(lines, connection.lineId, connection.end) !== point.pointId) continue
    links.push({ lineId: connection.target.lineId, pointId: connection.target.pointId })
  }

  return links
}

/**
 * Bir köşe (`pointId`) taşındığında ONUNLA BİRLİKTE gitmesi gereken tüm hat
 * noktaları. İki kaynağı var:
 *
 * - Her sol tık kendi borusunu yazdığı için (K-W) ardışık iki adım aynı köşede
 *   buluşur; ikincinin başı birincinin ucuna `line` bağlantısıyla tutunur.
 * - Sonradan o köşeye eklenen bir branşman ya da cihaz kolu köşeden AYRI bir
 *   nokta nesnesi taşımaz, yalnız bağlantı kaydı vardır.
 *
 * İkisinde de kayıt izlenmezse bağlı hat eski yerinde asılı kalır ve KOPAR.
 * Kapanış geçişlidir (zincirin üçüncü halkası da gelir) ve İKİ YÖNLÜ: köşe
 * hangi adımdan tutulursa tutulsun aynı küme çıkar.
 *
 * Kendi köşesi hep [0]. index'e bakan çağıranlar (`moveLinePoint`) bunu
 * varsayabilir.
 */
export function getLinkedLinePoints(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  lineId: Id,
  pointId: Id,
): LinkedLinePoint[] {
  const linked: LinkedLinePoint[] = [{ lineId, pointId }]
  const seen = new Set<string>([toKey(lineId, pointId)])

  // Kuyruk dizinin kendisi: yeni bulunan her nokta sona eklenir ve o da taranır.
  for (let index = 0; index < linked.length; index += 1) {
    for (const link of getDirectLinks(lines, connections, linked[index])) {
      const key = toKey(link.lineId, link.pointId)
      if (seen.has(key)) continue

      seen.add(key)
      linked.push(link)
    }
  }

  return linked
}

/** Paylaşılan boş küme: çağıranların çoğunda taşınan eleman yok. */
const NO_ELEMENT_IDS: ReadonlySet<Id> = new Set()

/**
 * Bir elemanın portuna oturan hat uçları — ÇAPA. Konumlarını porttan alırlar,
 * dolayısıyla elemanları taşınmadıkça yerlerinden oynayamazlar: taşıma yayılımı
 * bunların üstünden geçmez, köşe sürüklemesi bunları çekemez.
 *
 * `movedElementIds` verilirse o elemanların portları çapa SAYILMAZ — onlar zaten
 * hareket ediyor, uçları da onlarla gelecek.
 */
export function getPortAnchoredPointIds(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  movedElementIds: ReadonlySet<Id> = NO_ELEMENT_IDS,
): Set<Id> {
  const anchored = new Set<Id>()

  for (const connection of connections) {
    const targetElementId = getTargetElementId(connection.target)
    if (targetElementId === null) continue
    if (movedElementIds.has(targetElementId)) continue

    const pointId = getLineEndPointId(lines, connection.lineId, connection.end)
    if (pointId !== undefined) anchored.add(pointId)
  }

  return anchored
}

/**
 * Bir `FloorPipeLink`in eşleştirdiği uçlar — port çapası gibi TAŞINAMAZ
 * (kullanıcı isteği, 2026-08): kayarsa link'in sakladığı `position` ile
 * hattın gerçek ucu ayrışır, `FloorLinkGlyphs` rozeti (▲/▼) yanlış yerde
 * kalır. `FloorPipeLink` id'leri proje geneli benzersiz olduğu için
 * `getPortAnchoredPointIds`'in aksine kata göre filtrelemeye gerek yok.
 */
export function getFloorLinkAnchoredPointIds(floorPipeLinks: readonly FloorPipeLink[]): Set<Id> {
  const anchored = new Set<Id>()
  for (const link of floorPipeLinks) {
    anchored.add(link.belowPointId)
    anchored.add(link.abovePointId)
  }
  return anchored
}

/** Bu köşeye tutunan BAŞKA bir hat ucu var mı — zincirin ortası serbest uç değildir. */
export function hasLinkedLinePoint(
  connections: readonly InstallationConnection[],
  lineId: Id,
  pointId: Id,
): boolean {
  return connections.some(
    (connection) =>
      connection.target.kind === 'line' &&
      connection.target.lineId === lineId &&
      connection.target.pointId === pointId,
  )
}

/**
 * Ucun rolü. Porta bağlılık kazanır: bir uç hem elemana bağlı hem de zincirin
 * devamıysa kullanıcı için orası bir bağlantı noktasıdır.
 */
export function getLineEndRole(
  connections: readonly InstallationConnection[],
  lineId: Id,
  pointId: Id,
  end: InstallationConnection['end'],
): LineEndRole {
  if (isLineEndOnPort(connections, lineId, end)) return 'port'

  const isChainCorner =
    hasLinkedLinePoint(connections, lineId, pointId) ||
    connections.some(
      (connection) =>
        connection.lineId === lineId &&
        connection.end === end &&
        connection.target.kind === 'line',
    )
  return isChainCorner ? 'corner' : 'free'
}
