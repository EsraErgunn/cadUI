import { pruneOpeningsInDraft } from './architectureOpeningOps'
import type { DraftSetter } from './architecturePropertyOps'
import { recomputeRoomsInDraft } from './architectureRooms'
import { splitWallsAtIntersections } from './architectureSplit'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { duplicateSelectionInDraft } from './duplicateOps'
import { markDirty } from './projectMeta'
import type { PlanPoint } from '../core/coords'
import { getSelectedIds, type Selection } from '../core/selection'
import { getSymbolPose } from '../core/symbolPlacement'
import {
  applyTransform,
  applyTransformToAngleDeg,
  getPointsCenter,
  type PlanTransform,
} from '../core/transform'
import { collectWallPointIds } from '../core/wall'

/**
 * Seçimin dayanak noktası: taşınan köşelerin sınır kutusu merkezi. Döndürme ve
 * aynalama bunun etrafında yapılır.
 */
export function getSelectionPivot(draft: CadState, selection: Selection): PlanPoint | undefined {
  const pointIds = collectWallPointIds(draft.walls, getSelectedIds(selection, 'wall'))
  const symbolIds = new Set(getSelectedIds(selection, 'symbol'))
  const areaObjectIds = new Set(getSelectedIds(selection, 'area'))
  const beamIds = new Set(getSelectedIds(selection, 'beam'))

  // Her tür dayanağa girer: yalnız o türden nesne seçiliyken kutu onun
  // etrafındadır, yoksa dayanak bulunamaz ve döndürme hiç çalışmaz. Duvara bağlı
  // sembolün konumu duvarından türediği için pozundan okunur.
  const symbolPositions = draft.symbols
    .filter((symbol) => symbolIds.has(symbol.id))
    .map((symbol) => getSymbolPose(symbol, draft.walls, draft.points)?.position)
    .filter((position): position is PlanPoint => position !== undefined)

  const areaObjectPositions = draft.areaObjects
    .filter((areaObject) => areaObjectIds.has(areaObject.id))
    .map((areaObject): PlanPoint => ({ x: areaObject.x, y: areaObject.y }))

  // Kirişin İKİ ucu da girer: merkezini almak, uzun bir kirişin sınır kutusunu
  // gerçekte kapladığı alandan küçük gösterirdi.
  const beamPositions = draft.beams
    .filter((beam) => beamIds.has(beam.id))
    .flatMap((beam): PlanPoint[] => [
      { x: beam.x1, y: beam.y1 },
      { x: beam.x2, y: beam.y2 },
    ])

  return getPointsCenter([
    ...draft.points.filter((point) => pointIds.has(point.id)),
    ...symbolPositions,
    ...areaObjectPositions,
    ...beamPositions,
  ])
}

/**
 * Seçimi taşır / döndürür / aynalar (KK-11).
 *
 * Seçilmemiş KOMŞU duvarlar esner: köşe paylaşıldığı için dönüşüm o köşeyi de
 * oynatır. Varsayılan bu.
 *
 * `isDetachingCorners` ile ötelemeyi BOYUNU değiştirerek karşılayamayan
 * komşular köşeden koparılır ve yerinde kalır (K102). Bayrak dışarıdan gelir
 * çünkü ölçüt öteleme YÖNÜNE bağlı: yalnız duvar sürükleme jesti onu açar,
 * döndürme ve aynalama tek bir yön tanımlamaz.
 *
 * ⚠️ **Açıklık koruması (K35/K36/K48) burada ÇALIŞMAZ** — ne duvarlar ne de alan
 * nesneleri için. Tek nesne sürüklemede kontrol var (`useWallSelectionTool`,
 * `moveAreaObject`), grup dönüşümünde yok: bu yolda duvarın kendisi de
 * oynayabildiği için "hangi duvara göre" sorusunun cevabı tek değil, ve
 * kısmen uygulanan bir grup dönüşümü tek Ctrl+Z sözleşmesini bozardı. Bilinen
 * sınır, K49'da yazılı — kapatılırsa DÖRT tür için birden kapatılmalı.
 *
 * Çağıranın set()'i İÇİNDE çalışır. Değişiklik yoksa false döner.
 */
export function transformSelectionInDraft(
  draft: CadState,
  selection: Selection,
  transform: PlanTransform,
): boolean {
  const pointIds = collectWallPointIds(draft.walls, getSelectedIds(selection, 'wall'))
  const symbolIds = new Set(getSelectedIds(selection, 'symbol'))
  const areaObjectIds = new Set(getSelectedIds(selection, 'area'))
  const beamIds = new Set(getSelectedIds(selection, 'beam'))
  if (
    pointIds.size === 0 &&
    symbolIds.size === 0 &&
    areaObjectIds.size === 0 &&
    beamIds.size === 0
  ) {
    return false
  }

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

  // Alan nesnesi her zaman serbest (kimseye bağlı değil): merkezi dönüşümden,
  // açısı `applyTransformToAngleDeg`'den geçer — serbest sembolle aynı kural,
  // yoksa 90° dönen grubun içinde nesne yer değiştirir ama dik kalır.
  for (const areaObject of draft.areaObjects) {
    if (!areaObjectIds.has(areaObject.id)) continue

    const moved = applyTransform({ x: areaObject.x, y: areaObject.y }, transform)
    const angleDeg = applyTransformToAngleDeg(areaObject.angleDeg, transform)
    if (moved.x === areaObject.x && moved.y === areaObject.y && angleDeg === areaObject.angleDeg) {
      continue
    }

    areaObject.x = moved.x
    areaObject.y = moved.y
    areaObject.angleDeg = angleDeg
    isChanged = true
  }

  // Kirişin açı alanı YOK: yönü iki ucundan türüyor, dolayısıyla uçları
  // dönüştürmek açıyı da kendiliğinden döndürür.
  for (const beam of draft.beams) {
    if (!beamIds.has(beam.id)) continue

    const p1 = applyTransform({ x: beam.x1, y: beam.y1 }, transform)
    const p2 = applyTransform({ x: beam.x2, y: beam.y2 }, transform)
    if (p1.x === beam.x1 && p1.y === beam.y1 && p2.x === beam.x2 && p2.y === beam.y2) continue

    beam.x1 = p1.x
    beam.y1 = p1.y
    beam.x2 = p2.x
    beam.y2 = p2.y
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
