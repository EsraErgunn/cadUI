import type { ArchitectureTarget } from './architectureHover'
import { getAreaObjectCorners } from './areaObject'
import { getBeamEnds } from './beam'
import type { PlanPoint } from './coords'
import type { AreaObject, Beam, Id, Opening, Point, PointSymbol, Wall } from './model'
import { getSymbolPose } from './symbolPlacement'
import { getWallEnds } from './wall'
import { getWallFrameAtOffsetCm } from './wallPath'

/**
 * Seçilebilen nesne türleri. Köşe (`point`) DIŞARIDA: köşe duvarın türevi,
 * kendi başına taşınması `usePointDragTool`'un işi ve grup dönüşümünde duvarıyla
 * birlikte gelir. Vurgu hedefi (`ArchitectureTarget`) köşeyi de içerir, seçim içermez.
 */
export type SelectableKind = 'wall' | 'opening' | 'symbol' | 'area' | 'beam'

export type SelectionItem = {
  kind: SelectableKind
  id: Id
}

/**
 * Değiştirilebilir dizi tipi: immer draft'ına atanıyor, `readonly` olsaydı her
 * atama cast isterdi. Buradaki fonksiyonların hiçbiri girdisini DEĞİŞTİRMEZ,
 * hepsi yeni dizi döndürür.
 */
export type Selection = SelectionItem[]

export function isSameSelectionItem(a: SelectionItem, b: SelectionItem): boolean {
  return a.kind === b.kind && a.id === b.id
}

export function isItemSelected(selection: readonly SelectionItem[], item: SelectionItem): boolean {
  return selection.some((selected) => isSameSelectionItem(selected, item))
}

export function isSelected(
  selection: readonly SelectionItem[],
  kind: SelectableKind,
  id: Id,
): boolean {
  return selection.some((selected) => selected.kind === kind && selected.id === id)
}

/**
 * Seçiliyse çıkarır, değilse ekler (KK-10). Değişiklik yoksa AYNI diziyi
 * döndürmez — toggle her zaman değiştirir, çağıran koşul yazmak zorunda kalmasın.
 */
export function toggleSelectionItem(
  selection: readonly SelectionItem[],
  item: SelectionItem,
): Selection {
  if (isItemSelected(selection, item)) {
    return selection.filter((selected) => !isSameSelectionItem(selected, item))
  }
  return [...selection, item]
}

export function getSelectedIds(selection: readonly SelectionItem[], kind: SelectableKind): Id[] {
  return selection.filter((item) => item.kind === kind).map((item) => item.id)
}

/**
 * Yalnız TEK nesne seçiliyken o nesnenin id'si. Tek nesneye özel arayüzler
 * (açıklık genişlik şeridi, tür başına özellik alanları) bunu okur: çoklu
 * seçimde hangi nesnenin gösterileceği belirsizdir, bu yüzden undefined döner.
 */
export function getSoleSelectedId(
  selection: readonly SelectionItem[],
  kind: SelectableKind,
): Id | undefined {
  if (selection.length !== 1) return undefined
  const [item] = selection
  return item.kind === kind ? item.id : undefined
}

/** Vurgu hedefi → seçim ögesi. Köşe seçilemez, undefined döner. */
export function toSelectionItem(target: ArchitectureTarget): SelectionItem | undefined {
  if (target.kind === 'wall') return { kind: 'wall', id: target.wallId }
  if (target.kind === 'opening') return { kind: 'opening', id: target.openingId }
  if (target.kind === 'symbol') return { kind: 'symbol', id: target.symbolId }
  if (target.kind === 'area') return { kind: 'area', id: target.areaObjectId }
  if (target.kind === 'beam') return { kind: 'beam', id: target.beamId }
  return undefined
}

/**
 * Silinen nesne seçimde asılı kalmasın: sahipsiz id özellik panelini boş açar.
 *
 * Tür başına ayrı dizi geçiliyor; `switch` yerine kayıt kullanılsaydı yeni bir
 * seçilebilir tür eklendiğinde burası SESSİZCE eksik kalırdı — bu haliyle
 * derleme "symbols parametresi verilmedi" der.
 */
export function pruneSelection(
  selection: Selection,
  walls: readonly Wall[],
  openings: readonly Opening[],
  symbols: readonly PointSymbol[],
  areaObjects: readonly AreaObject[],
  beams: readonly Beam[],
): Selection {
  const pruned = selection.filter((item) => {
    if (item.kind === 'wall') return walls.some((wall) => wall.id === item.id)
    if (item.kind === 'opening') return openings.some((opening) => opening.id === item.id)
    if (item.kind === 'area') return areaObjects.some((areaObject) => areaObject.id === item.id)
    if (item.kind === 'beam') return beams.some((beam) => beam.id === item.id)
    return symbols.some((symbol) => symbol.id === item.id)
  })
  return pruned.length === selection.length ? selection : pruned
}

export type PlanRect = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** İki köşeden normalize dikdörtgen: kullanıcı hangi yöne sürüklerse sürüklesin. */
export function toPlanRect(a: PlanPoint, b: PlanPoint): PlanRect {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  }
}

export function isPointInRect(point: PlanPoint, rect: PlanRect): boolean {
  return (
    point.x >= rect.minX && point.x <= rect.maxX && point.y >= rect.minY && point.y <= rect.maxY
  )
}

/**
 * Çerçeve seçimi TAMAMEN İÇİNDE kalanları alır, kesişenleri değil.
 *
 * AutoCAD'in yöne bağlı ikili davranışı (sola sürükle = kesişen de seçilir)
 * bilinçli olarak uygulanmadı: talep yalnız "çerçeve içine alarak" diyor ve
 * yön duyarlı seçim, farkı bilmeyen kullanıcıya aynı jestte iki farklı sonuç
 * verir. Gerekirse sonradan eklenir; tersi (sessizce fazla nesne seçmek) geri
 * alınması zor bir sürpriz.
 */
export function getWallsInRect(
  rect: PlanRect,
  walls: readonly Wall[],
  points: readonly Point[],
): Id[] {
  return walls
    .filter((wall) => {
      const ends = getWallEnds(wall, points)
      return ends !== undefined && isPointInRect(ends.p1, rect) && isPointInRect(ends.p2, rect)
    })
    .map((wall) => wall.id)
}

/**
 * Açıklık, MERKEZİ çerçevede kalıyorsa seçilir. Açıklık duvarın üstünde bir
 * delik; iki ucunu ayrı ayrı aramak, duvarı tam kapsayan bir çerçevede bile
 * açıklığı dışarıda bırakabilirdi (köşe payı yüzünden uçlar duvarın dışına taşar).
 */
export function getOpeningsInRect(
  rect: PlanRect,
  openings: readonly Opening[],
  walls: readonly Wall[],
  points: readonly Point[],
): Id[] {
  return openings
    .filter((opening) => {
      const wall = walls.find((candidate) => candidate.id === opening.wallId)
      if (!wall) return false

      const frame = getWallFrameAtOffsetCm(wall, points, opening.offsetCm)
      return frame !== undefined && isPointInRect(frame.point, rect)
    })
    .map((opening) => opening.id)
}

/**
 * Sembol, KONUMU çerçevede kalıyorsa seçilir. Şeklin tamamının kapsanmasını
 * aramak, sembolü tam çevreleyen bir çerçevede bile onu dışarıda bırakabilirdi:
 * damga ızgara noktasına oturuyor, şekli o noktanın etrafına taşıyor.
 */
export function getSymbolsInRect(
  rect: PlanRect,
  symbols: readonly PointSymbol[],
  walls: readonly Wall[],
  points: readonly Point[],
): Id[] {
  return symbols
    .filter((symbol) => {
      const pose = getSymbolPose(symbol, walls, points)
      return pose !== undefined && isPointInRect(pose.position, rect)
    })
    .map((symbol) => symbol.id)
}

/**
 * Alan nesnesi, dört köşesi de çerçevede TAMAMEN kalıyorsa seçilir —
 * `getWallsInRect` ile aynı kural (kesişen değil, tam kapsanan).
 */
export function getAreaObjectsInRect(rect: PlanRect, areaObjects: readonly AreaObject[]): Id[] {
  return areaObjects
    .filter((areaObject) => getAreaObjectCorners(areaObject).every((corner) => isPointInRect(corner, rect)))
    .map((areaObject) => areaObject.id)
}

/**
 * Kiriş, İKİ UCU da çerçevede kalıyorsa seçilir — `getWallsInRect` ile aynı
 * kural. Köşeler değil uçlar ölçülüyor: uçlar kalınlığın dışına taşmaz, uzun
 * ince bir kirişte köşe testiyle aynı sonucu verir ve hesabı daha ucuz.
 */
export function getBeamsInRect(rect: PlanRect, beams: readonly Beam[]): Id[] {
  return beams
    .filter((beam) => {
      const ends = getBeamEnds(beam)
      return isPointInRect(ends.p1, rect) && isPointInRect(ends.p2, rect)
    })
    .map((beam) => beam.id)
}

/** Çerçevenin kapsadığı her şey — tek geçişte, çağıran üç fonksiyonu ayrı sarmasın. */
export function getSelectionInRect(
  rect: PlanRect,
  walls: readonly Wall[],
  openings: readonly Opening[],
  points: readonly Point[],
  symbols: readonly PointSymbol[],
  areaObjects: readonly AreaObject[],
  beams: readonly Beam[],
): Selection {
  return [
    ...getWallsInRect(rect, walls, points).map((id): SelectionItem => ({ kind: 'wall', id })),
    ...getOpeningsInRect(rect, openings, walls, points).map(
      (id): SelectionItem => ({ kind: 'opening', id }),
    ),
    ...getSymbolsInRect(rect, symbols, walls, points).map(
      (id): SelectionItem => ({ kind: 'symbol', id }),
    ),
    ...getAreaObjectsInRect(rect, areaObjects).map((id): SelectionItem => ({ kind: 'area', id })),
    ...getBeamsInRect(rect, beams).map((id): SelectionItem => ({ kind: 'beam', id })),
  ]
}

/** İki seçimin birleşimi; çerçeveyi Shift ile mevcut seçime eklemek için. */
export function mergeSelection(
  base: readonly SelectionItem[],
  addition: readonly SelectionItem[],
): Selection {
  const merged = [...base]
  for (const item of addition) {
    if (!isItemSelected(merged, item)) merged.push(item)
  }
  return merged
}
