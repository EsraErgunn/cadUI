import { toAreaObjectPlanPoints, type AreaObjectShape } from './areaObject'
import { getAreaObjectPlanGeometry } from './areaObjectGeometry'
import type { PlanPoint } from './coords'
import type { AreaObjectType } from './model'
import { getSegmentLength } from './wall'

/**
 * Tutamaç ölçüleri EKRAN pikselinde: zoom değişince ikonun ekrandaki boyu
 * DEĞİŞMEZ (kullanıcı isteği). Dünya birimine çevrim `px / zoom` — zoom
 * piksel/cm demek (knowledge/viewport.md). Zoom'un tepkili hâli
 * `useCameraZoom` ile okunur.
 */
export const HANDLE_ICON_PX = 14
/** Görünmez tutma alanı ikondan geniş: 14 px'lik simgeyi yakalamak zor olurdu. */
export const HANDLE_HIT_PX = 28
/** İkon kutunun bu kadar DIŞINDA durur — geometrinin parçası gibi görünmesin. */
const HANDLE_OFFSET_PX = 18

export type AreaObjectHandleKind = 'rotate' | 'resize'

/** Nesnenin YEREL (döndürülmemiş, merkeze göreli) sınır kutusu. */
export type AreaObjectLocalBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type AreaObjectHandleLayout = {
  /** Döndürme ikonu — kutunun ÜST-ORTA noktasının biraz dışında. */
  rotate: PlanPoint
  /** Boyutlandırma ikonu — kutunun SAĞ-ALT köşesinin biraz dışında. */
  resize: PlanPoint
  /** Kutunun dört köşesi (plan), seçim çerçevesi için. */
  boxCorners: PlanPoint[]
  /** Resize sırasında yerinde çakılı kalan karşı köşe (kutunun SOL-ÜSTÜ). */
  fixedCorner: PlanPoint
}

/**
 * Nesnenin ÇİZİLEN geometrisinin yerel sınır kutusu. `widthCm`/`lengthCm`
 * DOĞRUDAN kullanılmaz: kolon havalandırması daire çiziyor ve çapı
 * `min(width, length)` — kutuyu modelin alanlarından türetmek, tutamaçları
 * dairenin görünür kenarından uzağa düşürürdü (kullanıcı bunu istedi).
 *
 * Kutu geometrinin KENDİSİNDEN okunuyor, tip başına elle yazılmıyor: yeni bir
 * şekil eklendiğinde tutamaçlar kendiliğinden doğru yere gelir.
 */
export function getAreaObjectLocalBounds(
  type: AreaObjectType,
  shape: AreaObjectShape,
): AreaObjectLocalBounds {
  // Merkezi orijinde, döndürülmemiş bir kopyanın geometrisi = yerel koordinatlar.
  const local = getAreaObjectPlanGeometry(type, {
    x: 0,
    y: 0,
    widthCm: shape.widthCm,
    lengthCm: shape.lengthCm,
    angleDeg: 0,
  })

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const stroke of local.strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }

  // Geometrisi olmayan (kuramsal) şekilde kutu modele düşer; sonsuz döndürmeyelim.
  if (!Number.isFinite(minX)) {
    return {
      minX: -shape.widthCm / 2,
      minY: -shape.lengthCm / 2,
      maxX: shape.widthCm / 2,
      maxY: shape.lengthCm / 2,
    }
  }

  return { minX, minY, maxX, maxY }
}

/**
 * Tutamaç ikonlarının plan konumları. Kutu nesneyle birlikte DÖNER (Figma'daki
 * gibi eksen hizalı değil): kullanıcı döndürülmüş bir nesnede de kenara paralel
 * boyutlandırır.
 *
 * Yerel eksende +y ekranda YUKARI (bkz. `Cameras.tsx`), bu yüzden döndürme
 * ikonu +y ucundan, boyutlandırma ikonu (+x, −y) köşesinden — yani ekranda
 * sağ-alttan — dışarı taşar.
 */
export function getAreaObjectHandleLayout(
  type: AreaObjectType,
  shape: AreaObjectShape,
  zoom: number,
): AreaObjectHandleLayout {
  const bounds = getAreaObjectLocalBounds(type, shape)
  const offsetCm = HANDLE_OFFSET_PX / zoom
  const centerX = (bounds.minX + bounds.maxX) / 2

  const [rotate, resize, ...boxCorners] = toAreaObjectPlanPoints(shape, [
    { x: centerX, y: bounds.maxY + offsetCm },
    { x: bounds.maxX + offsetCm, y: bounds.minY - offsetCm },
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ])

  return {
    rotate,
    resize,
    boxCorners,
    // Sol-üst köşe: resize sırasında sabit kalan (boxCorners sırasının son ögesi).
    fixedCorner: boxCorners[3],
  }
}

/**
 * İmleç hangi tutamacın üstünde? Erişim yarıçapı EKRAN pikselinden gelir
 * (`HANDLE_HIT_PX`), yani uzaklaşınca da yakınlaşınca da tutma alanı ekranda
 * aynı büyüklükte kalır — ikonun kendisi gibi.
 *
 * Resize önce sınanır: iki ikon birbirinden uzak olduğu için sıra pratikte fark
 * etmez, ama minicik bir nesnede çakışırlarsa karar deterministik olsun.
 */
export function findAreaObjectHandleAt(
  target: PlanPoint,
  type: AreaObjectType,
  shape: AreaObjectShape,
  zoom: number,
): AreaObjectHandleKind | undefined {
  const layout = getAreaObjectHandleLayout(type, shape, zoom)
  const reachCm = HANDLE_HIT_PX / 2 / zoom

  if (getSegmentLength(target, layout.resize) <= reachCm) return 'resize'
  if (getSegmentLength(target, layout.rotate) <= reachCm) return 'rotate'
  return undefined
}

const RAD_PER_DEG = Math.PI / 180
const DEG_PER_RAD = 180 / Math.PI
/** Döndürme ikonu nesnenin +y ucunda; imleç açısından nesnenin açısına inerken düşülür. */
const HANDLE_OFFSET_DEG = 90

/**
 * İmleç konumundan nesnenin yeni açısı. Ham derece döner (0-359'a indirgenmiş);
 * 15°'lik adıma yakalama çağıranın işi — `rotateAreaObject` store'da zaten
 * `snapAngleDeg`'den geçiriyor.
 */
export function getAreaObjectAngleFromPointer(target: PlanPoint, center: PlanPoint): number {
  const pointerDeg = Math.atan2(target.y - center.y, target.x - center.x) * DEG_PER_RAD
  const angleDeg = pointerDeg - HANDLE_OFFSET_DEG
  return ((angleDeg % 360) + 360) % 360
}

/**
 * Sağ-alt köşe sürüklenirken KARŞI köşe (sol-üst) yerinde çakılı kalır — klasik
 * CAD davranışı, kullanıcı seçti. Merkez de kaydığı için sonuç x/y ve boyutu
 * BİRLİKTE taşır: store'a tek yazımda gitmeli, yoksa iki ayrı Ctrl+Z adımı olur.
 *
 * Hesap nesnenin KENDİ eksenine göre: sabit köşeden imlece giden vektör, yerel
 * +x (genişlik) ve +y (uzunluk) yönlerine izdüşürülür. Böylece döndürülmüş
 * nesnede de kullanıcı kenara paralel büyütür.
 *
 * ⚠️ Sonuç kutunun boyu olarak yazılır. Kutu geometriden türediği için kolon
 * havalandırmasında (daire, çapı `min(width, length)`) genişlik≠uzunluk ise
 * boyutlandırma nesneyi KAREYE indirger — dairenin zaten kullanmadığı fazlalık
 * düşer. Diğer tiplerde kutu = width×length, yani davranış birebir aynı.
 */
export function resizeAreaObjectFromCorner(
  type: AreaObjectType,
  shape: AreaObjectShape,
  target: PlanPoint,
  minSizeCm: number,
  zoom: number,
): { x: number; y: number; widthCm: number; lengthCm: number } {
  const { fixedCorner } = getAreaObjectHandleLayout(type, shape, zoom)
  const radians = shape.angleDeg * RAD_PER_DEG
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const dx = target.x - fixedCorner.x
  const dy = target.y - fixedCorner.y

  // Yerel eksenin dünya karşılıkları (birim, dik): u = +x (genişlik yönü),
  // v = +y (uzunluk yönü).
  const uX = cos
  const uY = sin
  const vX = -sin
  const vY = cos

  // Sürüklenen köşe sabit köşeden +genişlik (u) ve −uzunluk (v) uzakta; uzunluk
  // izdüşümü bu yüzden ters işaretli okunur.
  const widthCm = Math.max(minSizeCm, dx * uX + dy * uY)
  const lengthCm = Math.max(minSizeCm, -(dx * vX + dy * vY))

  // Merkez = sabit köşe + yarım genişlik (+u) + yarım uzunluk (−v).
  return {
    x: fixedCorner.x + (widthCm / 2) * uX - (lengthCm / 2) * vX,
    y: fixedCorner.y + (widthCm / 2) * uY - (lengthCm / 2) * vY,
    widthCm,
    lengthCm,
  }
}
