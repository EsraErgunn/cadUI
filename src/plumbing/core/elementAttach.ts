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
import { hasLinkedLinePoint } from './lineCornerLink'
import { getLinePointElevationCm } from './lineElevation'
import { getSegmentLengthCm, isSamePoint } from './lineGeometry'
import { isLineEndConnected } from './portSnap'
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
  /** İmlecin boru gövdesine uzaklığı — dikey kolonla yarışırken YAKIN olan kazanır. */
  distanceCm: number
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

  return {
    lineId: hit.line.id,
    segmentIndex: hit.segmentIndex,
    distanceCm: hit.distanceCm,
    nodes,
  }
}

/**
 * Plan görünüşte dikey borunun bir YÖNÜ yoktur (iki ucu aynı x,y'de) —
 * `atan2(0, 0)` sıfır döner ve sembol rastgele bir yöne bakardı. Semboller bu
 * yüzden plan ekseninde çizilir; kot doğru olduğu için 3B ve izometrikte
 * eleman borunun üstünde görünür.
 */
const VERTICAL_PLAN_ANGLE_DEG = 0

export type EndNodeAttachment = {
  lineId: Id
  /** İmlecin kolona (plan) uzaklığı — gövde yakalamasıyla yarışırken kullanılır. */
  distanceCm: number
  /** Armatürün oturacağı uç düğümü. */
  endPointId: Id
  /** O düğümün kotu — eleman borunun yüksekliğini BURADAN alır. */
  elevationCm: number
  placement: ElementPlacement
}

/** Plan boyu SIFIR boru = saf dikey bağlantı (K102). */
function isVerticalPipe(line: InstallationLine): boolean {
  const [first, last] = line.points
  return (
    line.points.length === 2 &&
    first !== undefined &&
    last !== undefined &&
    first.position.x === last.position.x &&
    first.position.y === last.position.y
  )
}

/**
 * Boruya oturan armatürün (vana, sayaç…) DİKEY bir borunun ucuna yapışması
 * (kullanıcı isteği, 2026-08: "z ekseninde bulunan borulara da araç yapışsın,
 * eklenenler borunun yüksekliğini alsın").
 *
 * Neden ayrı bir yol: `resolveOnLineAttachment` boruyu plan uzunluğuna göre
 * bölüyor, dikey boruda o uzunluk SIFIR — parça üstünde bir yer seçilemez.
 * Bu yüzden hedef gövde değil UÇ düğümüdür: armatür orada zaten bir düğüm olur
 * ve kotunu düğümden okur (`getInlineElementElevationCm`).
 *
 * İki uç da uygunsa YÜKSEK olan seçilir: kolonun tepesi kullanıcının geldiği,
 * çizimde açıkta duran uçtur; dibi çoğunlukla alttaki hatta gömülüdür.
 */
export function resolveVerticalEndAttachment(
  lines: readonly InstallationLine[],
  getMetadata: SymbolMetadataLookup,
  type: InstallationElementType,
  cursor: PlanPoint,
  radiusCm: number,
): EndNodeAttachment | null {
  if (radiusCm <= 0) return null

  let nearest: EndNodeAttachment | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const line of lines) {
    if (!isVerticalPipe(line)) continue

    const position = line.points[0].position
    const distanceCm = getSegmentLengthCm(position, cursor)
    if (distanceCm > radiusCm || distanceCm >= nearestDistanceCm) continue

    // Bir düğüm TEK armatür taşır; dolu uç aday değildir.
    const free = line.points.filter((point) => point.inlineElementId === undefined)
    if (free.length === 0) continue

    const candidates = free.map((point) => ({
      point,
      elevationCm: getLinePointElevationCm(line, point.id),
    }))
    const chosen = candidates.reduce((best, candidate) =>
      candidate.elevationCm > best.elevationCm ? candidate : best,
    )

    const metadata = getMetadata(type)
    const angleDeg = getOnLineAngleDeg(metadata, VERTICAL_PLAN_ANGLE_DEG)
    nearest = {
      lineId: line.id,
      distanceCm,
      endPointId: chosen.point.id,
      elevationCm: chosen.elevationCm,
      placement: {
        type,
        angleDeg,
        position: getPositionForAnchor(getOnLineAnchorOffset(metadata), angleDeg, position),
      },
    }
    nearestDistanceCm = distanceCm
  }

  return nearest
}

/**
 * Armatürün (vana vb.) bir borunun BOŞ UCUNA yapışması — gövdeyi bölmek yerine
 * var olan uç düğümüne oturur (kullanıcı isteği, 2026-08: "boş yere vana
 * ekleyince orası kapansın, ucuna yapışsın, hata kapansın").
 *
 * Neden gövde bölmesi yetmiyor: `resolveOnLineAttachment` düğümü köşeye
 * `MIN_NODE_GAP_CM`'den fazla yaklaştırmıyor (sıfıra yakın boyda parça
 * doğmasın diye). Ucun dibine bırakılan vana bu yüzden ya reddediliyor ya da
 * içeride bir yere oturup ötesinde SERBEST bir uç bırakıyordu — uç açık
 * kaldığı için Hata6 (`lineTermination`) de kapanmıyordu. Uca oturan vana o
 * ucu KAPATIR (`validateGasNetwork` → `isShutoffValve`).
 *
 * Yalnız gerçekten AÇIK uçlar aday: armatürü olan, bir elemana/hatta bağlı
 * olan ya da başka bir hattın tutunduğu uç bu yoldan yakalanmaz.
 */
export function resolveFreeEndNodeAttachment(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  getMetadata: SymbolMetadataLookup,
  type: InstallationElementType,
  cursor: PlanPoint,
  radiusCm: number,
): EndNodeAttachment | null {
  const hit = findNearestFreeLineEnd(lines, connections, cursor, radiusCm)
  if (!hit) return null

  const metadata = getMetadata(type)
  // Açı borunun son parçasından: armatür hattın üstünde yatar.
  const angleDeg = getOnLineAngleDeg(
    metadata,
    getDirectionAngleDeg(hit.neighbor.position, hit.point.position),
  )

  return {
    lineId: hit.line.id,
    distanceCm: getSegmentLengthCm(hit.point.position, cursor),
    endPointId: hit.point.id,
    elevationCm: getLinePointElevationCm(hit.line, hit.point.id),
    placement: {
      type,
      angleDeg,
      position: getPositionForAnchor(
        getOnLineAnchorOffset(metadata),
        angleDeg,
        hit.point.position,
      ),
    },
  }
}

export type VerticalLineEndAttachment = {
  /** Kolonun kimliği — vana bunun uç düğümüne oturur. */
  lineId: Id
  /** Bağlantı kaydı bu uca yazılır (kolon → elemanın giriş portu). */
  end: 'start' | 'end'
  endPointId: Id
  /** Kolonun o ucundaki kot — eleman yüksekliğini BURADAN alır. */
  elevationCm: number
  inputPortId: string
  /** [0] ana eleman, [1] vana — `getPlacementPreviewTypes` ile aynı sıra. */
  placements: readonly [ElementPlacement, ElementPlacement]
}

/** Dikey borunun uçları: 'start' ilk nokta, 'end' ikinci (kolon iki noktalıdır). */
const VERTICAL_LINE_ENDS = ['start', 'end'] as const

/**
 * Sayacın DİKEY bir kolonun ucuna takılması (kullanıcı kararı, 2026-08):
 * vana kolonun uç düğümüne oturur, sayaç onun hemen yanında durur ve kolonun o
 * ucu doğrudan sayacın giriş portuna bağlanır — ARADA BORU YOKTUR.
 *
 * Eskiden kolonun ucundan kısa bir yatay kol borusu doğuyordu; kullanıcı
 * isteğiyle (2026-08) kaldırıldı: vana o kolun üstünde duruyor gibi görünüyordu,
 * oysa amaç armatürün TEK dikey borunun üstünde olması. Sayacın plandaki yeri
 * yine imlecin kolona göre bulunduğu tarafa, vana boyu kadar kaydırılır —
 * semboller üst üste binmesin diye, boru olarak değil yalnız konum olarak.
 *
 * Neden `resolveFreeEndAttachment` kullanılamıyor: orada hattın kendisi uzatılıyor
 * ve uzama yönü borunun son parçasından okunuyor. Kolonun plan yönü YOKTUR (iki
 * ucu aynı x,y) — kolon uzatılsaydı eğik bir boruya dönerdi.
 */
export function resolveVerticalLineEndAttachment(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  getMetadata: SymbolMetadataLookup,
  type: InstallationElementType,
  cursor: PlanPoint,
  radiusCm: number,
): VerticalLineEndAttachment | null {
  if (radiusCm <= 0) return null

  const metadata = getMetadata(type)
  const inputPort = getInputPort(metadata)
  if (!inputPort) return null

  let nearestLine: InstallationLine | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY
  let chosen: { end: 'start' | 'end'; pointId: Id; elevationCm: number } | null = null

  for (const line of lines) {
    if (!isVerticalPipe(line)) continue

    const position = line.points[0].position
    const distanceCm = getSegmentLengthCm(position, cursor)
    if (distanceCm > radiusCm || distanceCm >= nearestDistanceCm) continue

    // Aday uç: armatürü YOK, başka bir hatta da bağlı DEĞİL — sayaç oraya
    // bağlanınca ucun tek sahibi o olacak.
    const free = VERTICAL_LINE_ENDS.map((end) => ({
      end,
      point: end === 'start' ? line.points[0] : line.points[1],
    })).filter(
      ({ end, point }) =>
        point.inlineElementId === undefined &&
        !isLineEndConnected(connections, line.id, end) &&
        !hasLinkedLinePoint(connections, line.id, point.id),
    )
    if (free.length === 0) continue

    // İki uç da boşsa YÜKSEK olan: kolonun tepesi kullanıcının geldiği, çizimde
    // açıkta duran uçtur (`resolveVerticalEndAttachment` ile aynı kural).
    const best = free
      .map(({ end, point }) => ({
        end,
        pointId: point.id,
        elevationCm: getLinePointElevationCm(line, point.id),
      }))
      .reduce((winner, candidate) =>
        candidate.elevationCm > winner.elevationCm ? candidate : winner,
      )

    nearestLine = line
    nearestDistanceCm = distanceCm
    chosen = best
  }

  if (!nearestLine || !chosen) return null

  const nodePosition = nearestLine.points[0].position
  const reachCm = getSegmentLengthCm(nodePosition, cursor)
  // İmleç tam kolonun üstündeyken yön tanımsız; eleman varsayılan eksende durur.
  const unit = reachCm > 0 ? getUnitDirection(nodePosition, cursor, reachCm) : { x: 1, y: 0 }
  const outwardAngleDeg = getDirectionAngleDeg(ORIGIN, unit)

  const valveMetadata = getMetadata(ATTACHED_VALVE_TYPE)
  // Sayacın giriş portu vananın ÇIKIŞ KENARINA oturur: arada pay YOK
  // (kullanıcı isteği, 2026-08 — "vana ve sayaç arasında boşluk olmamalı").
  // Kolonda ikisinin arasına boru yazılmadığı için pay bırakılsaydı iki sembol
  // arasında hiçbir şeyin çizilmediği bir aralık kalırdı.
  const gapCm = getHalfLengthCm(valveMetadata)
  const portPosition = {
    x: normalizeZero(nodePosition.x + unit.x * gapCm),
    y: normalizeZero(nodePosition.y + unit.y * gapCm),
  }

  const portOffset = getPortOffset(metadata, inputPort)
  const flowAxisAngleDeg = getFlowAxisAngleDeg(metadata)
  const angleDeg = normalizeZero(
    flowAxisAngleDeg !== null
      ? outwardAngleDeg - flowAxisAngleDeg
      : outwardAngleDeg + STRAIGHT_ANGLE_DEG - getDirectionAngleDeg(ORIGIN, portOffset),
  )
  const valveAngleDeg = getOnLineAngleDeg(valveMetadata, outwardAngleDeg)

  return {
    lineId: nearestLine.id,
    end: chosen.end,
    endPointId: chosen.pointId,
    elevationCm: chosen.elevationCm,
    inputPortId: inputPort.id,
    placements: [
      { type, angleDeg, position: getPositionForAnchor(portOffset, angleDeg, portPosition) },
      {
        type: ATTACHED_VALVE_TYPE,
        angleDeg: valveAngleDeg,
        position: getPositionForAnchor(
          getOnLineAnchorOffset(valveMetadata),
          valveAngleDeg,
          nodePosition,
        ),
      },
    ],
  }
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
 *
 * DİKEY borunun (K102) açık ucu da aday (kullanıcı isteği, 2026-08: "z
 * ekseninde bulunan borulara da araçlarımızı yerleştirebilelim") — bu modda
 * kolun yönü borudan DEĞİL imleçten geliyor, yani çakışık uçtaki tanımsız plan
 * yönü kolu hiç ilgilendirmiyor. Sayaçtaki (`resolveFreeEndAttachment`) durum
 * farklı: orada hattın kendisi o yöne uzatılıyor, o yüzden kolon için ayrı bir
 * yol var (`resolveVerticalLineEndAttachment`). Cihaz kolu kendi kotunu taşımaz,
 * bağlandığı düğümden okur (`getAttachedLineElevationCm`) — kolonun ucuna
 * takılan cihaz o kotta durur.
 */
export function resolveNearestLineAttachment(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  getMetadata: SymbolMetadataLookup,
  type: InstallationElementType,
  cursor: PlanPoint,
): NearestLineAttachment | null {
  const hit = findNearestFreeLineEnd(lines, connections, cursor, Number.POSITIVE_INFINITY, true)
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
  // Kolonun plan yönü YOKTUR (iki ucu aynı x,y): düğüme oturan vana plan
  // ekseninde çizilir — `resolveVerticalEndAttachment` ile aynı kural.
  const isVerticalHost = isSamePoint(hit.neighbor.position, hit.point.position)
  const valveAngleDeg = getOnLineAngleDeg(
    valveMetadata,
    isVerticalHost
      ? VERTICAL_PLAN_ANGLE_DEG
      : getDirectionAngleDeg(hit.neighbor.position, hit.point.position),
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
 * bağlıdır. Sınav KONUMA bakar, o yüzden türü de sorulur — aynı yerde duran
 * başka bir `onLine` eleman bu kurala GİRMEZ. İki yerleşim şekli var, ikisi de
 * burada tanınır:
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
  elementType: InstallationElementType,
): boolean {
  // Tür denetimi ÖNCE: kural yalnız otomatik VANA içindir, oysa aşağıdaki sınav
  // saf KONUM sınavıdır. Türe bakılmadığı sürece boru üstündeki başka bir
  // `onLine` eleman (filtre kiti, manometre, izolasyon…) yalnızca porta bağlı
  // bir ucun yanına düştüğü için donuyordu — kullanıcı bildirimi (2026-08):
  // "filtre kit boru üzerinde hareket etmiyor".
  if (elementType !== ATTACHED_VALVE_TYPE) return false

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

/**
 * SÜRÜKLENİP bırakılan (zaten var olan) bir elemanın en yakın AÇIK boru ucuna
 * bağlanması (kullanıcı isteği, 2026-08: "vana sayaç vs de taşıyınca
 * bağlanabilsin"). Yerleştirme akışından farkı yeni eleman/vana/boru
 * YARATMAMASI — eleman ortada, yalnız bağı kurulur ve konumu uca oturtulur.
 *
 * İki hâl var, ikisi de elemanın tutunma kipinden gelir:
 * - `onLine` armatür (vana, filtre…) uç DÜĞÜMÜNE oturur (`inline`): boru
 *   bölünmez, armatür ucu kapatır.
 * - `lineEnd` eleman (sayaç) borunun ucuna PORTUNDAN bağlanır: gövde, giriş
 *   portu tam o uca gelecek şekilde döndürülüp kaydırılır.
 *
 * Yakıcı cihaz (`nearestLine`) kapsam DIŞI: onun bağı kısa bir kol borusu
 * istiyor, yani yeni bir hat yazmak gerekirdi — bırakma jestinin işi değil.
 */
export type DropAttachment =
  | { kind: 'inline'; lineId: Id; pointId: Id; placement: ElementPlacement }
  | {
      kind: 'port'
      lineId: Id
      end: 'start' | 'end'
      portId: string
      placement: ElementPlacement
    }

export function resolveDropAttachment(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  getMetadata: SymbolMetadataLookup,
  type: InstallationElementType,
  mode: 'onLine' | 'lineEnd',
  position: PlanPoint,
  radiusCm: number,
): DropAttachment | null {
  const hit = findNearestFreeLineEnd(lines, connections, position, radiusCm, true)
  if (!hit) return null

  const metadata = getMetadata(type)
  const outwardLengthCm = getSegmentLengthCm(hit.neighbor.position, hit.point.position)
  // Dikey borunun (K102) ucunda yön tanımsız: plan ekseni kullanılır.
  const outwardAngleDeg =
    outwardLengthCm > 0
      ? getDirectionAngleDeg(hit.neighbor.position, hit.point.position)
      : VERTICAL_PLAN_ANGLE_DEG

  if (mode === 'onLine') {
    const angleDeg = getOnLineAngleDeg(metadata, outwardAngleDeg)
    return {
      kind: 'inline',
      lineId: hit.line.id,
      pointId: hit.point.id,
      placement: {
        type,
        angleDeg,
        position: getPositionForAnchor(
          getOnLineAnchorOffset(metadata),
          angleDeg,
          hit.point.position,
        ),
      },
    }
  }

  const inputPort = getInputPort(metadata)
  if (!inputPort) return null

  const portOffset = getPortOffset(metadata, inputPort)
  const flowAxisAngleDeg = getFlowAxisAngleDeg(metadata)
  const angleDeg = normalizeZero(
    flowAxisAngleDeg !== null
      ? outwardAngleDeg - flowAxisAngleDeg
      : outwardAngleDeg + STRAIGHT_ANGLE_DEG - getDirectionAngleDeg(ORIGIN, portOffset),
  )

  return {
    kind: 'port',
    lineId: hit.line.id,
    end: hit.end,
    portId: inputPort.id,
    placement: {
      type,
      angleDeg,
      // Giriş portu TAM ucun üstünde: gövde porta göre yerleşir.
      position: getPositionForAnchor(portOffset, angleDeg, hit.point.position),
    },
  }
}
