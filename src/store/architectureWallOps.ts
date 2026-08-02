// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { takeNextId } from './projectMeta'
import type { PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import {
  DEFAULT_WALL_HEIGHT_CM,
  DEFAULT_WALL_THICKNESS_CM,
  getSegmentLength,
  MIN_WALL_LENGTH_CM,
} from '../core/wall'

/**
 * Duvar ucu ya var olan bir köşedir (snap sonucu `pointId` döndüyse) ya da yeni
 * bir konumdur. Var olan köşede yeni Point üretilmez — aynı yerde iki nokta
 * duvarları kopuk gösterir ve mahal çevrimini kapatmaz.
 */
export type WallEnd = { pointId: Id } | { position: PlanPoint }

export type AddWallInput = {
  start: WallEnd
  end: WallEnd
  thickness?: number
  height?: number
}

export type AddWallChainInput = {
  /** Zincirin noktaları; ardışık her ikisi bir duvar olur. */
  ends: readonly WallEnd[]
  thickness?: number
  height?: number
}

/** Üretilen id'ler: zinciri sürdüren çağıran, bir sonraki duvarı `p2Id`'den başlatır. */
export type AddedWall = {
  wallId: Id
  p1Id: Id
  p2Id: Id
}

function readEndPosition(state: Pick<CadState, 'points'>, end: WallEnd): PlanPoint | undefined {
  if (!('pointId' in end)) return end.position
  const point = state.points.find((candidate) => candidate.id === end.pointId)
  return point ? { x: point.x, y: point.y } : undefined
}

function takeEndPointId(draft: CadState, end: WallEnd, floorId: Id): Id {
  if ('pointId' in end) return end.pointId

  const id = takeNextId(draft)
  draft.points.push({ id, floorId, x: end.position.x, y: end.position.y })
  return id
}

/**
 * Tek duvarı yazar. Uçlar çözülemiyorsa (silinmiş id) veya duvar sıfır boyluysa
 * hiç dokunmaz: önce doğrula sonra yaz — yoksa geçersiz durumda sahipsiz Point kalır.
 */
export function appendWall(
  draft: CadState,
  start: WallEnd,
  end: WallEnd,
  options: { thickness?: number; height?: number },
): AddedWall | undefined {
  const startPosition = readEndPosition(draft, start)
  const endPosition = readEndPosition(draft, end)
  if (!startPosition || !endPosition) return undefined
  if (getSegmentLength(startPosition, endPosition) < MIN_WALL_LENGTH_CM) return undefined

  const floorId = draft.activeFloorId
  const p1Id = takeEndPointId(draft, start, floorId)
  const p2Id = takeEndPointId(draft, end, floorId)
  const wallId = takeNextId(draft)

  draft.walls.push({
    id: wallId,
    floorId,
    p1Id,
    p2Id,
    thickness: options.thickness ?? DEFAULT_WALL_THICKNESS_CM,
    height: options.height ?? DEFAULT_WALL_HEIGHT_CM,
  })

  return { wallId, p1Id, p2Id }
}

/** İki ucu aynı noktaya düşen veya aynı çifti ikinci kez bağlayan duvarları eler. */
function dropDegenerateWalls(draft: Pick<CadState, 'walls'>): void {
  const seenPairs = new Set<string>()

  draft.walls = draft.walls.filter((wall) => {
    if (wall.p1Id === wall.p2Id) return false

    // Yön önemsiz: A→B ile B→A aynı duvardır.
    const [low, high] = wall.p1Id < wall.p2Id ? [wall.p1Id, wall.p2Id] : [wall.p2Id, wall.p1Id]
    const pairKey = `${low}-${high}`
    if (seenPairs.has(pairKey)) return false

    seenPairs.add(pairKey)
    return true
  })
}

/**
 * Bir köşeyi başka bir köşeye kaynatır: kaynak noktaya bağlı tüm duvarlar hedefe
 * yönlendirilir, kaynak nokta kalkar.
 *
 * Kaynatmadan yalnız koordinat eşitlenseydi (movePoint) iki nokta üst üste gelir
 * ama BAĞLANMAZDI: duvarlar bitişik görünür, mahal çevrimi kapanmaz ve hata
 * ekranda görünmez. Aynı yerde iki Point üretmeme kuralının sürükleme karşılığı.
 *
 * Kaynatma sonrası hem sıfır boy duvar (iki ucu da hedefe düşen) hem yinelenen
 * duvar (hedefle zaten komşu olan) oluşabilir; ikisi de burada elenir.
 */
export function mergePointInto(draft: CadState, sourceId: Id, targetId: Id): boolean {
  if (sourceId === targetId) return false

  const source = draft.points.find((point) => point.id === sourceId)
  const target = draft.points.find((point) => point.id === targetId)
  if (!source || !target) return false

  for (const wall of draft.walls) {
    if (wall.p1Id === sourceId) wall.p1Id = targetId
    if (wall.p2Id === sourceId) wall.p2Id = targetId
  }

  dropDegenerateWalls(draft)
  draft.points = draft.points.filter((point) => point.id !== sourceId)
  return true
}

/**
 * Zinciri tek geçişte yazar. Her segmentin sonu bir sonrakinin başlangıcı olarak
 * `pointId` ile devredilir — aynı köşede ikinci bir Point üretilmesini bu engeller.
 * Atlanan segment zinciri kesmez, çapa olduğu yerde kalır.
 */
export function appendWallChain(draft: CadState, input: AddWallChainInput): boolean {
  let anchor: WallEnd | undefined
  let hasAdded = false

  for (const end of input.ends) {
    if (!anchor) {
      anchor = end
      continue
    }

    const added = appendWall(draft, anchor, end, input)
    if (!added) continue

    anchor = { pointId: added.p2Id }
    hasAdded = true
  }

  return hasAdded
}
