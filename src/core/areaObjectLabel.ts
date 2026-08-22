import {
  AREA_OBJECT_TYPE_LABELS,
  toAreaObjectPlanPoints,
  type AreaObjectShape,
} from './areaObject'
import { getAreaObjectLocalBounds } from './areaObjectHandles'
import type { PlanPoint } from './coords'
import { getLabelRectCm } from './labelLeader'
import type { AreaObject, AreaObjectType, Id } from './model'
import { isPointInRect, type PlanRect } from './selection'

/** Etiket yazısı ekran-sabit boyda — tesisatın ad etiketiyle aynı ölçü. */
export const AREA_OBJECT_LABEL_SIZE_PX = 12
/** Varsayılan etiket, nesnenin kutusunun bu kadar üstünde durur (ekran pikseli). */
const LABEL_MARGIN_PX = 16

/**
 * Ad etiketi GÖSTERİLEN türler (kullanıcı seçti). Merdiven dışarıda: iniş oku ve
 * basamakları zaten ne olduğunu söylüyor, etiket çizimi kalabalıklaştırırdı.
 *
 * Çizim de tutma sınavı da bu TEK kuraldan okur — ayrışsalar görünmez bir etiket
 * tutulabilir olurdu (`hasElementNameLabel` ile aynı gerekçe).
 */
const LABELED_AREA_OBJECT_TYPES: readonly AreaObjectType[] = [
  'structuralColumn',
  'flueShaft',
  'columnVentilation',
]

export function hasAreaObjectNameLabel(type: AreaObjectType): boolean {
  return LABELED_AREA_OBJECT_TYPES.includes(type)
}

/**
 * Etikette yazan metin: TÜRÜN Türkçe adı ("Kolon"), nesnenin `label` kodu
 * ("K-01") DEĞİL. Kullanıcının isteği "ne olduğu anlaşılsın" — kod bunu
 * söylemiyor. Kod panelde duruyor ve düzenlenebilir kalıyor.
 */
export function getAreaObjectNameLabel(type: AreaObjectType): string {
  return AREA_OBJECT_TYPE_LABELS[type]
}

/**
 * Nesnenin ÇİZİLEN geometrisinin dünya sınır kutusu. Yerel kutu döndürülüp
 * eksen hizalı kutuya çevrilir: nesne dönse de etiket dik durduğu için
 * varsayılan konum dünya kutusundan hesaplanmalı (tesisatta da öyle).
 */
export function getAreaObjectWorldBoundsCm(
  type: AreaObjectType,
  shape: AreaObjectShape,
): PlanRect {
  const local = getAreaObjectLocalBounds(type, shape)
  const corners = toAreaObjectPlanPoints(shape, [
    { x: local.minX, y: local.minY },
    { x: local.maxX, y: local.minY },
    { x: local.maxX, y: local.maxY },
    { x: local.minX, y: local.maxY },
  ])

  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    maxY: Math.max(...corners.map((corner) => corner.y)),
  }
}

/**
 * Etiketin nesne merkezine göre etkin kayması: kullanıcı taşıdıysa saklanan
 * değer, taşımadıysa kutunun üstü. Varsayılan pay ekran pikselinden çevrilir
 * (px/zoom) — yazı ekran-sabit boyda olduğu için pay da öyle olmalı, yoksa uzak
 * zoom'da büyüyen yazı nesnenin üstüne binerdi.
 */
export function getAreaObjectLabelOffsetCm(
  areaObject: Pick<AreaObject, 'type' | 'labelOffsetCm'> & AreaObjectShape,
  zoom: number,
): PlanPoint {
  if (areaObject.labelOffsetCm) return areaObject.labelOffsetCm

  const bounds = getAreaObjectWorldBoundsCm(areaObject.type, areaObject)
  return {
    x: (bounds.minX + bounds.maxX) / 2 - areaObject.x,
    y: bounds.maxY + (LABEL_MARGIN_PX + AREA_OBJECT_LABEL_SIZE_PX / 2) / zoom - areaObject.y,
  }
}

/** Etiket yazısının merkezi (plan cm). */
export function getAreaObjectLabelAnchorCm(
  areaObject: Pick<AreaObject, 'type' | 'labelOffsetCm'> & AreaObjectShape,
  zoom: number,
): PlanPoint {
  const offset = getAreaObjectLabelOffsetCm(areaObject, zoom)
  return { x: areaObject.x + offset.x, y: areaObject.y + offset.y }
}

/**
 * Etiketin tutma kutusu. Hesap `core/labelLeader.ts`'te ORTAK: mimari cihazın
 * ad etiketi de aynı kutuyu istiyor ve iki kopya, biri değiştirilince öteki
 * unutulacak türden.
 */
export function getAreaObjectLabelRectCm(
  anchor: PlanPoint,
  label: string,
  zoom: number,
): PlanRect {
  return getLabelRectCm(anchor, label, AREA_OBJECT_LABEL_SIZE_PX, zoom)
}

/**
 * İmlecin altındaki etiketin nesnesi. Üst üste binenlerde SON eklenen kazanır —
 * `findBeamUnderPoint`/`resolveArchitectureTarget` ile aynı kural (dizinin sonu
 * en üstte çizilen).
 */
export function pickAreaObjectLabelAt(
  target: PlanPoint,
  areaObjects: readonly AreaObject[],
  floorId: Id,
  zoom: number,
): AreaObject | undefined {
  for (let index = areaObjects.length - 1; index >= 0; index -= 1) {
    const areaObject = areaObjects[index]
    if (areaObject.floorId !== floorId) continue
    if (!hasAreaObjectNameLabel(areaObject.type)) continue

    const anchor = getAreaObjectLabelAnchorCm(areaObject, zoom)
    const label = getAreaObjectNameLabel(areaObject.type)
    if (isPointInRect(target, getAreaObjectLabelRectCm(anchor, label, zoom))) return areaObject
  }

  return undefined
}
