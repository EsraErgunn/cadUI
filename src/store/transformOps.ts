import { pruneOpeningsInDraft } from './architectureOpeningOps'
import type { DraftSetter } from './architecturePropertyOps'
import { recomputeRoomsInDraft } from './architectureRooms'
import { splitWallsAtIntersections } from './architectureSplit'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { markDirty, takeNextId } from './projectMeta'
import type { PlanPoint } from '../core/coords'
import { createIdRemap, remapId } from '../core/idRemap'
import type { SymbolAttachment } from '../core/model'
import type { Id } from '../core/model'
import { getNextSymbolLabel } from '../core/pointSymbol'
import { getSelectedIds, type Selection, type SelectionItem } from '../core/selection'
import { getSymbolFloorId, getSymbolPose } from '../core/symbolPlacement'
import {
  applyTransform,
  applyTransformToAngleDeg,
  getPointsCenter,
  type PlanTransform,
} from '../core/transform'

/**
 * Dönüşümün dokunduğu köşeler: seçili duvarların uçları. Açıklık kendi
 * koordinatını taşımıyor (duvarına `offsetCm` ile bağlı), bu yüzden ayrıca
 * taşınmaz — duvarıyla birlikte gelir.
 *
 * Set: bir köşeyi iki duvar paylaşabilir, öteleme iki kez uygulanmasın.
 */
function collectMovingPointIds(draft: CadState, wallIds: readonly Id[]): Set<Id> {
  const targets = new Set(wallIds)
  const pointIds = new Set<Id>()

  for (const wall of draft.walls) {
    if (!targets.has(wall.id)) continue
    pointIds.add(wall.p1Id)
    pointIds.add(wall.p2Id)
  }

  return pointIds
}

/**
 * Seçimin dayanak noktası: taşınan köşelerin sınır kutusu merkezi. Döndürme ve
 * aynalama bunun etrafında yapılır.
 */
export function getSelectionPivot(draft: CadState, selection: Selection): PlanPoint | undefined {
  const pointIds = collectMovingPointIds(draft, getSelectedIds(selection, 'wall'))
  const symbolIds = new Set(getSelectedIds(selection, 'symbol'))

  // Sembol de dayanağa girer: yalnız sembol seçiliyken kutu onun etrafındadır,
  // yoksa dayanak bulunamaz ve döndürme hiç çalışmaz. Duvara bağlı sembolün
  // konumu duvarından türediği için pozundan okunur.
  const symbolPositions = draft.symbols
    .filter((symbol) => symbolIds.has(symbol.id))
    .map((symbol) => getSymbolPose(symbol, draft.walls, draft.points)?.position)
    .filter((position): position is PlanPoint => position !== undefined)

  return getPointsCenter([
    ...draft.points.filter((point) => pointIds.has(point.id)),
    ...symbolPositions,
  ])
}

/**
 * Seçimi taşır / döndürür / aynalar (KK-11).
 *
 * Seçilmemiş KOMŞU duvarlar esner: köşe paylaşıldığı için dönüşüm o köşeyi de
 * oynatır. Bu, tek duvar taşımanın (`moveWall`) bugünkü davranışının aynısı —
 * seçimi komşusundan koparmak duvar grafını yırtardı.
 *
 * Çağıranın set()'i İÇİNDE çalışır. Değişiklik yoksa false döner.
 */
export function transformSelectionInDraft(
  draft: CadState,
  selection: Selection,
  transform: PlanTransform,
): boolean {
  const pointIds = collectMovingPointIds(draft, getSelectedIds(selection, 'wall'))
  const symbolIds = new Set(getSelectedIds(selection, 'symbol'))
  if (pointIds.size === 0 && symbolIds.size === 0) return false

  let isChanged = false
  for (const point of draft.points) {
    if (!pointIds.has(point.id)) continue

    const moved = applyTransform({ x: point.x, y: point.y }, transform)
    if (moved.x === point.x && moved.y === point.y) continue

    point.x = moved.x
    point.y = moved.y
    isChanged = true
  }

  // YALNIZ serbest semboller dönüştürülür. Duvara bağlı sembol duvarıyla gelir:
  // duvar seçimdeyse zaten taşınıyor, değilse sembol duvarından kopmamalı.
  for (const symbol of draft.symbols) {
    if (!symbolIds.has(symbol.id) || symbol.attachment !== 'free') continue

    const moved = applyTransform({ x: symbol.x, y: symbol.y }, transform)
    // Sembolün KENDİ açısı da dönüşümü izler; yoksa 90° dönen grubun içinde
    // sembol yer değiştirir ama dik kalır.
    const rotationDeg = applyTransformToAngleDeg(symbol.rotationDeg, transform)
    if (moved.x === symbol.x && moved.y === symbol.y && rotationDeg === symbol.rotationDeg) continue

    symbol.x = moved.x
    symbol.y = moved.y
    symbol.rotationDeg = rotationDeg
    isChanged = true
  }

  if (!isChanged) return false

  // Komşu duvar kısalmış olabilir; sığmayan açıklık aynı adımda düşer (K16).
  pruneOpeningsInDraft(draft)
  // Taşınan duvar başkalarının üstünden geçmiş olabilir (K24).
  splitWallsAtIntersections(draft)
  // Bölmeden SONRA: bölünen duvarın id kümesi değişti, oda kimliği ona bakıyor (K31).
  recomputeRoomsInDraft(draft)
  return true
}

/**
 * Seçimi çoğaltır (KK-11): duvarlar, köşeleri ve o duvarların ÜSTÜNDEKİ
 * açıklıklar yeni id'lerle kopyalanır, kopya `offset` kadar ötelenir.
 *
 * Ögeler birbirine göre konumunu korur: tek bir öteleme tüm kopyaya uygulanıyor,
 * her nesne ayrı hesaplanmıyor.
 *
 * Açıklık seçimi tek başına çoğaltılmaz — duvarsız açıklık temsil edilemez (K16).
 * Seçili duvarın üstündeki açıklık ise seçili olmasa DA kopyalanır: kapısız bir
 * duvar kopyası kullanıcının istediği şey değil.
 *
 * Döndürülen Selection kopyaların kendisidir; çağıran seçimi ona taşır ki
 * kullanıcı çoğalttığı şeyi hemen sürükleyebilsin.
 */
export function duplicateSelectionInDraft(
  draft: CadState,
  selection: Selection,
  offset: { dxCm: number; dyCm: number },
): Selection {
  const wallIds = getSelectedIds(selection, 'wall')
  const symbolIds = new Set(getSelectedIds(selection, 'symbol'))
  const sourceWalls = draft.walls.filter((wall) => wallIds.includes(wall.id))
  const sourceSymbols = draft.symbols.filter((symbol) => symbolIds.has(symbol.id))
  if (sourceWalls.length === 0 && sourceSymbols.length === 0) return []

  const pointIds = collectMovingPointIds(draft, wallIds)
  const takeId = () => takeNextId(draft)

  // Köşeler ÖNCE: duvarın p1Id/p2Id'si onların yeni id'lerini isteyecek.
  const pointRemap = createIdRemap(pointIds, takeId)
  for (const point of draft.points.filter((candidate) => pointIds.has(candidate.id))) {
    const moved = applyTransform(
      { x: point.x, y: point.y },
      { kind: 'translate', ...offset },
    )
    draft.points.push({
      id: remapId(pointRemap, point.id),
      floorId: point.floorId,
      x: moved.x,
      y: moved.y,
    })
  }

  const wallRemap = createIdRemap(
    sourceWalls.map((wall) => wall.id),
    takeId,
  )
  for (const wall of sourceWalls) {
    draft.walls.push({
      id: remapId(wallRemap, wall.id),
      floorId: wall.floorId,
      p1Id: remapId(pointRemap, wall.p1Id),
      p2Id: remapId(pointRemap, wall.p2Id),
      thickness: wall.thickness,
      height: wall.height,
    })
  }

  const sourceOpenings = draft.openings.filter((opening) => wallIds.includes(opening.wallId))
  for (const opening of sourceOpenings) {
    draft.openings.push({
      id: takeId(),
      // Kopya, kopyanın duvarına bağlanır. Remap atlanırsa açıklık KAYNAK duvarda
      // kalır ve hata VERMEZ — knowledge/floor-clone.md'deki sessiz tuzağın aynısı.
      wallId: remapId(wallRemap, opening.wallId),
      offsetCm: opening.offsetCm,
      widthCm: opening.widthCm,
      type: opening.type,
    })
  }

  // Sembol kimseye bağlı değil: remap gerekmez, yeni id yeter. Etiket YENİDEN
  // üretilir — kopya kaynağın adını taşısaydı aynı katta iki "P-01" olurdu (KK-10).
  const copiedSymbols = sourceSymbols.flatMap((symbol) => {
    const floorId = getSymbolFloorId(symbol, draft.walls)
    if (floorId === undefined) return []

    // Duvara bağlı sembolün kopyası AYNI duvarda, offset kadar kaydırılmış
    // durur: serbest x/y'ye çevirmek onu duvarından koparırdı.
    //
    // Alanlar TEK TEK yazılıyor, `...symbol` ile değil: spread sembolün id ve
    // label'ını da taşır, aşağıdaki yeni id/etiket sessizce ezilirdi.
    const attachment: SymbolAttachment =
      symbol.attachment === 'wall'
        ? {
            attachment: 'wall',
            wallId: symbol.wallId,
            offsetCm: symbol.offsetCm + offset.dxCm,
            isMountedOnFarFace: symbol.isMountedOnFarFace,
          }
        : {
            attachment: 'free',
            floorId: symbol.floorId,
            x: symbol.x + offset.dxCm,
            y: symbol.y + offset.dyCm,
            rotationDeg: symbol.rotationDeg,
          }

    const copy = {
      id: takeId(),
      type: symbol.type,
      label: getNextSymbolLabel(draft.symbols, symbol.type, floorId, draft.walls),
      note: symbol.note,
      ...attachment,
    }
    // Sıradaki etiket bir ÖNCEKİ kopyayı da görsün diye tek tek eklenir.
    draft.symbols.push(copy)
    return [copy]
  })

  return [
    ...sourceWalls.map(
      (wall): SelectionItem => ({ kind: 'wall', id: remapId(wallRemap, wall.id) }),
    ),
    ...copiedSymbols.map((symbol): SelectionItem => ({ kind: 'symbol', id: symbol.id })),
  ]
}

export function createTransformActions(set: DraftSetter) {
  return {
    transformSelection: (selection: Selection, transform: PlanTransform): boolean => {
      let isApplied = false
      set((draft) => {
        isApplied = transformSelectionInDraft(draft, selection, transform)
        if (isApplied) markDirty(draft)
      })
      return isApplied
    },

    duplicateSelection: (
      selection: Selection,
      offset: { dxCm: number; dyCm: number },
    ): Selection => {
      let created: Selection = []
      set((draft) => {
        created = duplicateSelectionInDraft(draft, selection, offset)
        // Çoğaltma kesişim üretebilir; bölme aynı adımda (K24).
        if (created.length > 0) {
          splitWallsAtIntersections(draft)
          // Kopyalanan çevrim kapalıysa YENİ oda doğar; varsayılan adı alır (K31).
          recomputeRoomsInDraft(draft)
          markDirty(draft)
        }
      })
      return created
    },
  }
}
