// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { takeNextId } from './projectMeta'
import { getNextAreaObjectLabel } from '../core/areaObject'
import { getNextBeamLabel } from '../core/beam'
import { createIdRemap, remapId } from '../core/idRemap'
import type { Id, SymbolAttachment } from '../core/model'
import { getNextSymbolLabel } from '../core/pointSymbol'
import { getSelectedIds, type Selection, type SelectionItem } from '../core/selection'
import { getSymbolFloorId } from '../core/symbolPlacement'
import { applyTransform } from '../core/transform'
import { collectWallPointIds } from '../core/wall'

/**
 * Seçimi çoğaltır (KK-11): duvarlar, köşeleri ve o duvarların ÜSTÜNDEKİ
 * açıklıklar yeni id'lerle kopyalanır, kopya `offset` kadar ötelenir. Nokta
 * sembolü, alan nesnesi ve kiriş de kopyalanır — hepsi kendi koordinatını
 * taşıdığı için remap gerekmez, yeni id yeter.
 *
 * Ögeler birbirine göre konumunu korur: tek bir öteleme tüm kopyaya uygulanıyor,
 * her nesne ayrı hesaplanmıyor.
 *
 * Açıklık seçimi tek başına çoğaltılmaz — duvarsız açıklık temsil edilemez (K16).
 * Seçili duvarın üstündeki açıklık ise seçili olmasa DA kopyalanır: kapısız bir
 * duvar kopyası kullanıcının istediği şey değil.
 *
 * Etiket taşıyan her tür (sembol/alan nesnesi/kiriş) etiketini YENİDEN üretir:
 * kopya kaynağın adını taşısaydı aynı katta iki "P-01" olurdu (KK-10).
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
  const areaObjectIds = new Set(getSelectedIds(selection, 'area'))
  const beamIds = new Set(getSelectedIds(selection, 'beam'))

  const sourceWalls = draft.walls.filter((wall) => wallIds.includes(wall.id))
  const sourceSymbols = draft.symbols.filter((symbol) => symbolIds.has(symbol.id))
  const sourceAreaObjects = draft.areaObjects.filter((candidate) =>
    areaObjectIds.has(candidate.id),
  )
  const sourceBeams = draft.beams.filter((beam) => beamIds.has(beam.id))
  if (
    sourceWalls.length === 0 &&
    sourceSymbols.length === 0 &&
    sourceAreaObjects.length === 0 &&
    sourceBeams.length === 0
  ) {
    return []
  }

  const pointIds = collectWallPointIds(draft.walls, wallIds)
  const takeId = () => takeNextId(draft)

  // Köşeler ÖNCE: duvarın p1Id/p2Id'si onların yeni id'lerini isteyecek.
  const pointRemap = createIdRemap(pointIds, takeId)
  for (const point of draft.points.filter((candidate) => pointIds.has(candidate.id))) {
    const moved = applyTransform({ x: point.x, y: point.y }, { kind: 'translate', ...offset })
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

  const copiedAreaObjectIds: Id[] = []
  for (const areaObject of sourceAreaObjects) {
    const copy = {
      id: takeId(),
      type: areaObject.type,
      floorId: areaObject.floorId,
      x: areaObject.x + offset.dxCm,
      y: areaObject.y + offset.dyCm,
      widthCm: areaObject.widthCm,
      lengthCm: areaObject.lengthCm,
      angleDeg: areaObject.angleDeg,
      // Sembolle aynı gerekçe: etiket sıradakini görmek için tek tek eklenir.
      label: getNextAreaObjectLabel(draft.areaObjects, areaObject.type, areaObject.floorId),
    }
    draft.areaObjects.push(copy)
    copiedAreaObjectIds.push(copy.id)
  }

  const copiedBeamIds: Id[] = []
  for (const beam of sourceBeams) {
    const copy = {
      id: takeId(),
      floorId: beam.floorId,
      x1: beam.x1 + offset.dxCm,
      y1: beam.y1 + offset.dyCm,
      x2: beam.x2 + offset.dxCm,
      y2: beam.y2 + offset.dyCm,
      thicknessCm: beam.thicknessCm,
      label: getNextBeamLabel(draft.beams, beam.floorId),
    }
    draft.beams.push(copy)
    copiedBeamIds.push(copy.id)
  }

  return [
    ...sourceWalls.map(
      (wall): SelectionItem => ({ kind: 'wall', id: remapId(wallRemap, wall.id) }),
    ),
    ...copiedSymbols.map((symbol): SelectionItem => ({ kind: 'symbol', id: symbol.id })),
    ...copiedAreaObjectIds.map((id): SelectionItem => ({ kind: 'area', id })),
    ...copiedBeamIds.map((id): SelectionItem => ({ kind: 'beam', id })),
  ]
}
