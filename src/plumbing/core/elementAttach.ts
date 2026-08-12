import {
  findNearestFreeLineEnd,
  findNearestSegment,
  getDirectionAngleDeg,
  getFlowAxisAngleDeg,
  getHalfLengthCm,
  getInputPort,
  getOnLineAngleDeg,
  getOnLineAnchorOffset,
  getPortOffset,
  getPositionForAnchor,
  getUnitDirection,
  ORIGIN,
  STRAIGHT_ANGLE_DEG,
  type ElementPlacement,
} from './attachGeometry'
import { ATTACHED_VALVE_TYPE, getInlineSpecs } from './attachModes'
import type { SymbolMetadataLookup } from './elementPicking'
import { getTargetElementId } from './installationModel'
import type { InstallationConnection, InstallationLine } from './installationModel'
import { getSegmentLengthCm } from './lineGeometry'
import { rotatePlanOffset } from './ports'
import type { InstallationElementType } from './symbolMetadata'
import { normalizeZero, type PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { projectOntoSegment } from '../../core/wall'

/**
 * Düğüm bir köşeye bu kadar yaklaşırsa yerleştirme REDDEDİLİR — köşenin dibinde
 * sıfıra yakın boyda bir boru parçası doğardı. Kaydırma değil ret: geçersiz
 * yerleşimin sessizce oynatılmaması açıklık yerleştirmesiyle aynı kural.
 */
const MIN_NODE_GAP_CM = 1

/** Cihazı boruya bağlayan kol bundan kısaysa yerleştirme reddedilir. */
const MIN_STUB_LENGTH_CM = 10

/**
 * İki armatür arasında bırakılan serbest pay: semboller üst üste binmesin.
 * Bilerek dar tutuldu (regülatör grubundaki VALVE_MANOMETER_CLEARANCE_CM ile
 * aynı değer, `attachModes.ts`) — sayaç/vana ikilisi de sıkı durmalı.
 */
const ATTACH_CLEARANCE_CM = 10

/** Boru üstünde bir düğüme oturan eleman. */
export type InlineNode = {
  placement: ElementPlacement
  /** Düğümün boru üzerindeki yeri — gövde buradan kayabilir (manometre yanda durur). */
  nodePosition: PlanPoint
  /** Parçanın başından uzaklık; boruyu ayırma sırası buna göre. */
  nodeOffsetCm: number
}

export type OnLineAttachment = {
  lineId: Id
  segmentIndex: number
  /** Boru yönünde ARTAN sırada — getPlacementPreviewTypes ile birebir aynı sıra. */
  nodes: readonly InlineNode[]
}

export type FreeEndAttachment = {
  lineId: Id
  end: 'start' | 'end'
  /** Hattın mevcut uç noktası; araya giren vana bu düğüme oturur. */
  endPointId: Id
  /** [0] ana eleman, [1] vana — getPlacementPreviewTypes ile aynı sıra. */
  placements: readonly [ElementPlacement, ElementPlacement]
  /** Hattın uzatılacağı yeni köşe = ana elemanın giriş portunun dünya konumu. */
  extendTo: PlanPoint
  inputPortId: string
}

export type NearestLineAttachment = {
  lineId: Id
  end: 'start' | 'end'
  /** Kolun oturduğu, hattın zaten var olan BOŞ ucu — boru burada ayrılmaz. */
  endPointId: Id
  /** Kolun boruya değdiği düğüm konumu; vana buraya oturur. */
  nodePosition: PlanPoint
  /** [0] ana eleman, [1] vana — getPlacementPreviewTypes ile aynı sıra. */
  placements: readonly [ElementPlacement, ElementPlacement]
  /** Kolun cihaz tarafındaki ucu. */
  inputPortId: string
  inputPortPosition: PlanPoint
}

/**
 * Boruya oturan eleman (vana, regülatör, manometre, izolasyon…). Ana eleman ve
 * refakatçilerinin TAMAMI aynı parçaya sığmak zorundadır: biri taşarsa yerleşim
 * kaydırılmaz, tümüyle reddedilir ve önizleme çıkmaz.
 */
export function resolveOnLineAttachment(
  lines: readonly InstallationLine[],
  getMetadata: SymbolMetadataLookup,
  type: InstallationElementType,
  cursor: PlanPoint,
  radiusCm: number,
): OnLineAttachment | null {
  if (radiusCm <= 0) return null

  const hit = findNearestSegment(lines, cursor, radiusCm)
  if (!hit || hit.lengthCm <= 0) return null

  const segmentAngleDeg = getDirectionAngleDeg(hit.from, hit.to)
  const unit = getUnitDirection(hit.from, hit.to, hit.lengthCm)
  const nodes: InlineNode[] = []

  for (const spec of getInlineSpecs(type)) {
    const nodeOffsetCm = hit.offsetCm + spec.offsetCm
    if (nodeOffsetCm < MIN_NODE_GAP_CM || nodeOffsetCm > hit.lengthCm - MIN_NODE_GAP_CM) return null

    const nodePosition = {
      x: normalizeZero(hit.from.x + unit.x * nodeOffsetCm),
      y: normalizeZero(hit.from.y + unit.y * nodeOffsetCm),
    }
    const metadata = getMetadata(spec.type)
    const angleDeg = getOnLineAngleDeg(metadata, segmentAngleDeg)
    nodes.push({
      nodePosition,
      nodeOffsetCm,
      placement: {
        type: spec.type,
        angleDeg,
        position: getPositionForAnchor(getOnLineAnchorOffset(metadata), angleDeg, nodePosition),
      },
    })
  }

  return { lineId: hit.line.id, segmentIndex: hit.segmentIndex, nodes }
}

/**
 * Sayaç boş bir boru ucuna takılır: uç düğümüne bir VANA oturur, hat sayacın
 * giriş portuna kadar uzar. Vana ile sayaç arasındaki pay vananın kendi
 * boyundan türetilir — sembol büyürse ofset elle güncellenmek zorunda kalmasın.
 */
export function resolveFreeEndAttachment(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  getMetadata: SymbolMetadataLookup,
  type: InstallationElementType,
  cursor: PlanPoint,
  radiusCm: number,
): FreeEndAttachment | null {
  if (radiusCm <= 0) return null

  const hit = findNearestFreeLineEnd(lines, connections, cursor, radiusCm)
  if (!hit) return null

  const outwardLengthCm = getSegmentLengthCm(hit.neighbor.position, hit.point.position)
  if (outwardLengthCm <= 0) return null

  const metadata = getMetadata(type)
  const inputPort = getInputPort(metadata)
  if (!inputPort) return null

  const valveMetadata = getMetadata(ATTACHED_VALVE_TYPE)
  const outwardAngleDeg = getDirectionAngleDeg(hit.neighbor.position, hit.point.position)
  const unit = getUnitDirection(hit.neighbor.position, hit.point.position, outwardLengthCm)
  const gapCm = getHalfLengthCm(valveMetadata) + ATTACH_CLEARANCE_CM
  const extendTo = {
    x: normalizeZero(hit.point.position.x + unit.x * gapCm),
    y: normalizeZero(hit.point.position.y + unit.y * gapCm),
  }

  const portOffset = getPortOffset(metadata, inputPort)
  const flowAxisAngleDeg = getFlowAxisAngleDeg(metadata)
  const angleDeg = normalizeZero(
    flowAxisAngleDeg !== null
      ? outwardAngleDeg - flowAxisAngleDeg
      : // Tek bağlantılı eleman: portu boruya BAKAR, gövdesi borudan uzağa düşer.
        outwardAngleDeg + STRAIGHT_ANGLE_DEG - getDirectionAngleDeg(ORIGIN, portOffset),
  )
  const valveAngleDeg = getOnLineAngleDeg(valveMetadata, outwardAngleDeg)

  return {
    lineId: hit.line.id,
    end: hit.end,
    endPointId: hit.point.id,
    extendTo,
    inputPortId: inputPort.id,
    placements: [
      { type, angleDeg, position: getPositionForAnchor(portOffset, angleDeg, extendTo) },
      {
        type: ATTACHED_VALVE_TYPE,
        angleDeg: valveAngleDeg,
        position: getPositionForAnchor(
          getOnLineAnchorOffset(valveMetadata),
          valveAngleDeg,
          hit.point.position,
        ),
      },
    ],
  }
}

/**
 * Yakıcı cihaz imlecin bıraktığı yerde durur ve EN YAKIN BOŞ boru ucuna kısa bir
 * kolla bağlanır; kolun boruya değdiği uç düğüme vana oturur (vana cihazda değil
 * boruda). Borunun ortasına bağlanmaz — yalnız açık uçlar aday: bir boru ucuna
 * ikinci bir cihaz/eleman takılamaz (port kuralıyla aynı, `findNearestFreeLineEnd`
 * hem bağlı hem de zaten armatür oturan uçları eler).
 *
 * Yarıçap YOK: "en yakına yapışır" kuralı gereği hangi açık uç en yakınsa ona
 * bağlanır; hiç açık uç yoksa yerleştirme de olmaz.
 */
export function resolveNearestLineAttachment(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  getMetadata: SymbolMetadataLookup,
  type: InstallationElementType,
  cursor: PlanPoint,
): NearestLineAttachment | null {
  const hit = findNearestFreeLineEnd(lines, connections, cursor, Number.POSITIVE_INFINITY)
  if (!hit) return null

  const metadata = getMetadata(type)
  const inputPort = getInputPort(metadata)
  if (!inputPort) return null

  const portOffset = getPortOffset(metadata, inputPort)
  const portRadiusCm = Math.hypot(portOffset.x, portOffset.y)
  const stubLengthCm = getSegmentLengthCm(hit.point.position, cursor)
  // Port düğümü geçerse kol ters döner; cihaz boruya bu kadar yaklaşamaz.
  if (stubLengthCm < portRadiusCm + MIN_STUB_LENGTH_CM) return null

  // Cihaz, giriş portu boruya BAKACAK şekilde döner: kol hep porttan çıkar,
  // gövdenin içinden geçmez.
  const angleDeg = normalizeZero(
    getDirectionAngleDeg(cursor, hit.point.position) - getDirectionAngleDeg(ORIGIN, portOffset),
  )
  const rotated = rotatePlanOffset(portOffset, angleDeg)
  const valveMetadata = getMetadata(ATTACHED_VALVE_TYPE)
  const valveAngleDeg = getOnLineAngleDeg(
    valveMetadata,
    getDirectionAngleDeg(hit.neighbor.position, hit.point.position),
  )

  return {
    lineId: hit.line.id,
    end: hit.end,
    endPointId: hit.point.id,
    nodePosition: hit.point.position,
    inputPortId: inputPort.id,
    inputPortPosition: {
      x: normalizeZero(cursor.x + rotated.x),
      y: normalizeZero(cursor.y + rotated.y),
    },
    placements: [
      { type, angleDeg, position: cursor },
      {
        type: ATTACHED_VALVE_TYPE,
        angleDeg: valveAngleDeg,
        position: getPositionForAnchor(
          getOnLineAnchorOffset(valveMetadata),
          valveAngleDeg,
          hit.point.position,
        ),
      },
    ],
  }
}

/** Boruya oturan elemanı sürüklerken düğümün taşınacağı yeni yer. */
export type OnLineSlideTarget = {
  lineId: Id
  pointId: Id
  /** Sembolün oturduğu düğümün yeni konumu — komşu köşeler arasındaki hattan taşmaz. */
  nodePosition: PlanPoint
  elementPosition: PlanPoint
}

/**
 * Boruya oturan (`onLine`) bir elemanı SÜRÜKLERKEN borunun ŞEKLİNİ bozmadan
 * kaydırır: düğüm yalnız kendi iki SABİT komşusu (bir önceki/sonraki köşe)
 * arasındaki düz hat üzerinde kalabilir. `projectOntoSegment` izdüşümü zaten
 * [0,1] aralığına kelepçeliyor — segment dışına taşan bir sürükleme boruyu
 * BÜKMEZ, en yakın komşu köşeye yapışır.
 *
 * Açı SABİTTİR: komşu köşeler yerinden oynamadığı için aralarındaki doğrunun
 * yönü de değişmez, `getOnLineAngleDeg`'i yeniden çağırmaya gerek yok —
 * çağıran elemanın ŞU ANKİ açısını verir.
 *
 * Elemanın İKİ komşusu da yoksa (ör. nearestLine'ın boş uca oturan vanası, bir
 * hattın tam UCUNDA) `null` döner — kaydırma yok, çağıran serbest taşımaya
 * düşer. Aksi hâlde borunun sonu belirsiz bir yöne doğru sonsuza uzanırdı.
 */
export function resolveOnLineSlide(
  lines: readonly InstallationLine[],
  getMetadata: SymbolMetadataLookup,
  elementId: Id,
  elementType: InstallationElementType,
  elementAngleDeg: number,
  cursor: PlanPoint,
): OnLineSlideTarget | null {
  for (const line of lines) {
    const index = line.points.findIndex((point) => point.inlineElementId === elementId)
    if (index === -1) continue

    const prev = line.points[index - 1]
    const next = line.points[index + 1]
    if (!prev || !next) return null

    const projection = projectOntoSegment(prev.position, next.position, cursor)
    const metadata = getMetadata(elementType)

    return {
      lineId: line.id,
      pointId: line.points[index].id,
      nodePosition: projection.point,
      elementPosition: getPositionForAnchor(
        getOnLineAnchorOffset(metadata),
        elementAngleDeg,
        projection.point,
      ),
    }
  }

  return null
}

/**
 * Sayaç/cihazla BİRLİKTE gelen otomatik vana taşınamaz: ana elemanın konumuna
 * bağlıdır. İki yerleşim şekli var, ikisi de burada tanınır:
 * - `resolveNearestLineAttachment`: vana hattın TAM UCUNDA oturur (hat
 *   uzamaz, cihaz ayrı bir kolla bağlanır) → nokta dizinin ilk/son elemanı.
 * - `resolveFreeEndAttachment`: vana hattın ESKİ ucunda oturur ama hat
 *   sayacın girişine kadar UZAR (`extendLineEnd`) — eski uç artık dizinin
 *   İÇİNDE kalır, yalnız ucuna BİTİŞİKTİR ve o yeni uç bir elemanın PORTUNA
 *   bağlıdır. Bu ikinci durumu index kontrolü tek başına yakalayamaz (K-W3).
 */
export function isFixedCompanionValve(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  elementId: Id,
): boolean {
  for (const line of lines) {
    const index = line.points.findIndex((point) => point.inlineElementId === elementId)
    if (index === -1) continue

    const lastIndex = line.points.length - 1
    if (index === 0 || index === lastIndex) return true

    const isPortConnectedEnd = (end: 'start' | 'end') =>
      connections.some(
        (connection) =>
          connection.lineId === line.id &&
          connection.end === end &&
          getTargetElementId(connection.target) !== null,
      )
    if (index === 1 && isPortConnectedEnd('start')) return true
    if (index === lastIndex - 1 && isPortConnectedEnd('end')) return true

    return false
  }
  return false
}

/**
 * Seçili hatlar TAŞINDIĞINDA üstlerindeki armatürler ve bağlı uçtaki eleman
 * (sayaç, cihaz) GERİDE KALMASIN diye seçime eklenir. Hem store'daki gerçek
 * taşımada (`moveElements`) hem sürükleme sırasındaki CANLI önizlemede
 * (`useSelectionTool`) kullanılır — ikisi ayrı yazılsaydı önizleme commit'ten
 * FARKLI elemanları oynatırdı.
 *
 * Sayaç/cihazla gelen otomatik vananın burada AYRICA elenmediğine dikkat:
 * bu fonksiyon nötr bir "bağlantıyı koru" yardımcısıdır. "Vana fare ile
 * sürüklenemez" kuralı yalnız etkileşim katmanında uygulanır
 * (`useSelectionTool` → `isFixedCompanionValve`) — burada da elense
 * `moveElements`'i doğrudan çağıran testler/araçlar valveyi hiç taşıyamazdı.
 */
export function expandMoveSelection(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  elementIds: readonly Id[],
  lineIds: readonly Id[],
): Id[] {
  const elementIdSet = new Set(elementIds)
  const lineIdSet = new Set(lineIds)

  for (const line of lines) {
    if (!lineIdSet.has(line.id)) continue
    for (const point of line.points) {
      if (point.inlineElementId !== undefined) elementIdSet.add(point.inlineElementId)
    }
  }
  for (const connection of connections) {
    const elementId = getTargetElementId(connection.target)
    if (elementId === null) continue
    if (!lineIdSet.has(connection.lineId)) continue
    elementIdSet.add(elementId)
  }

  return [...elementIdSet]
}

export type { ElementPlacement } from './attachGeometry'
