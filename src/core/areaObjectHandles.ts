import {
  hasAreaObjectRectangleSize,
  isAreaObjectRotatable,
  toAreaObjectPlanPoints,
  type AreaObjectShape,
} from './areaObject'
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

/**
 * Boyutlandırma İKİ köşede: ekranda sağ-alt ve sol-üst. Tek köşe varken
 * kullanıcı nesneyi yalnız bir yönden büyütebiliyordu — karşı kenarı
 * ayarlamak için önce nesneyi taşıyıp sonra boyutlandırmak gerekiyordu.
 *
 * Ad KÖŞEYİ söylüyor ("resize" değil): hangi köşenin çakılı kalacağı buradan
 * okunuyor, sürüklenen köşenin karşısı sabittir.
 */
export type AreaObjectResizeKind = 'resizeBottomRight' | 'resizeTopLeft'

export type AreaObjectHandleKind = 'rotate' | AreaObjectResizeKind

export function isResizeHandleKind(kind: AreaObjectHandleKind): kind is AreaObjectResizeKind {
  return kind !== 'rotate'
}

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
  /** Boyutlandırma ikonları — kutunun sağ-alt ve sol-üst köşelerinin dışında. */
  resizeBottomRight: PlanPoint
  resizeTopLeft: PlanPoint
  /** Kutunun dört köşesi (plan), seçim çerçevesi için. */
  boxCorners: PlanPoint[]
  /** Her tutamacın KARŞI köşesi: sürükleme boyunca yerinde çakılı kalan nokta. */
  fixedCorners: Record<AreaObjectResizeKind, PlanPoint>
}

/**
 * Tutamacın nesnenin YEREL ekseninde hangi yönde durduğu. Sağ-alt köşe
 * (+genişlik, −uzunluk), sol-üst köşe (−genişlik, +uzunluk) — ikisi birbirinin
 * tam tersi. Boyut hesabı bu işaretlerle tek fonksiyonda toplanıyor, köşe
 * başına ayrı formül yazılmıyor.
 */
const RESIZE_AXIS_SIGNS: Record<AreaObjectResizeKind, { u: number; v: number }> = {
  resizeBottomRight: { u: 1, v: -1 },
  resizeTopLeft: { u: -1, v: 1 },
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
 * ikonu +y ucundan, boyutlandırma ikonları (+x, −y) ve (−x, +y) köşelerinden —
 * yani ekranda sağ-alt ve sol-üstten — dışarı taşar.
 *
 * Döndürme ikonu ÜST-ORTADA duruyor; sol-üst boyutlandırma ikonu köşede
 * olduğu için ikisi çakışmaz (kutunun yarı genişliği en dar nesnede bile
 * ikonlar arasına giriyor, çakışırsa `findAreaObjectHandleAt`'in sırası kararı
 * deterministik tutar).
 */
export function getAreaObjectHandleLayout(
  type: AreaObjectType,
  shape: AreaObjectShape,
  zoom: number,
): AreaObjectHandleLayout {
  const bounds = getAreaObjectLocalBounds(type, shape)
  const offsetCm = HANDLE_OFFSET_PX / zoom
  const centerX = (bounds.minX + bounds.maxX) / 2

  const [rotate, resizeBottomRight, resizeTopLeft, ...boxCorners] = toAreaObjectPlanPoints(shape, [
    { x: centerX, y: bounds.maxY + offsetCm },
    { x: bounds.maxX + offsetCm, y: bounds.minY - offsetCm },
    { x: bounds.minX - offsetCm, y: bounds.maxY + offsetCm },
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ])

  return {
    rotate,
    resizeBottomRight,
    resizeTopLeft,
    boxCorners,
    fixedCorners: {
      // Sürüklenen köşenin KARŞISI çakılı kalır: sağ-alt sürüklenirken sol-üst,
      // sol-üst sürüklenirken sağ-alt (boxCorners sırası: sol-alt, sağ-alt,
      // sağ-üst, sol-üst).
      resizeBottomRight: boxCorners[3],
      resizeTopLeft: boxCorners[1],
    },
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

  if (getSegmentLength(target, layout.resizeBottomRight) <= reachCm) return 'resizeBottomRight'
  if (getSegmentLength(target, layout.resizeTopLeft) <= reachCm) return 'resizeTopLeft'
  // Döndürülemeyen tipte ikon HİÇ çizilmiyor; burada da yakalanmamalı, yoksa
  // görünmeyen bir tutamaç jesti sahiplenir ve tıklama nesneye ulaşmaz.
  if (isAreaObjectRotatable(type) && getSegmentLength(target, layout.rotate) <= reachCm) {
    return 'rotate'
  }
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
 * Bir köşe sürüklenirken KARŞI köşe yerinde çakılı kalır — klasik CAD
 * davranışı, kullanıcı seçti. Merkez de kaydığı için sonuç x/y ve boyutu
 * BİRLİKTE taşır: store'a tek yazımda gitmeli, yoksa iki ayrı Ctrl+Z adımı olur.
 *
 * Hesap nesnenin KENDİ eksenine göre: sabit köşeden imlece giden vektör, yerel
 * +x (genişlik) ve +y (uzunluk) yönlerine izdüşürülür. Böylece döndürülmüş
 * nesnede de kullanıcı kenara paralel büyütür.
 *
 * **İmleç sabit köşeyi GEÇEBİLİR.** Karşı tarafa geçilince nesne o yöne büyümeye
 * devam eder — 100 → 0 → 100 kesintisiz. Eskiden izdüşüm asgari boyda
 * kelepçeleniyordu ve nesne sıfırda kilitleniyordu; kullanıcı yalnız sağa ve
 * aşağı boyutlandırabiliyordu. Boyut POZİTİF kalır, yön merkeze taşınır (aşağıda).
 * İki eksen bağımsız: yalnız yatayda geçmek dikeyi etkilemez.
 *
 * ⚠️ **Yalnız ÇAP taşıyan tipte (kolon havalandırması) iki ölçü EŞİTLENİR.**
 * Ayrı yazıldıklarında, aşağı doğru sürükleme yalnız `lengthCm`'i büyütüyordu;
 * çapı `min(width, length)` olduğu için daire BÜYÜMÜYOR, ama merkez kaydığı
 * için aşağı KAYIYORDU — panelde uzunluk artıyor, ekranda daire aynı boyda
 * yürüyordu (K52). Çap iki izdüşümün BÜYÜĞÜ: hangi yöne çekilirse çekilsin
 * daire büyür, sabit köşeye çapalı kalır.
 */
export function resizeAreaObjectFromCorner(
  type: AreaObjectType,
  shape: AreaObjectShape,
  target: PlanPoint,
  minSizeCm: number,
  zoom: number,
  kind: AreaObjectResizeKind,
): { x: number; y: number; widthCm: number; lengthCm: number } {
  const fixedCorner = getAreaObjectHandleLayout(type, shape, zoom).fixedCorners[kind]
  const axisSigns = RESIZE_AXIS_SIGNS[kind]
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

  // Sürüklenen köşe sabit köşeden yerel eksende hangi yönde duruyorsa izdüşüm o
  // işaretle okunur (`RESIZE_AXIS_SIGNS`): sağ-alt köşe (+u, −v), sol-üst köşe
  // (−u, +v). İşaret KORUNUR: imleç sabit köşeyi geçtiğinde izdüşüm negatife
  // düşer ve nesne karşı yöne büyümeye devam eder.
  const signedWidthCm = (dx * uX + dy * uY) * axisSigns.u
  const signedLengthCm = (dx * vX + dy * vY) * axisSigns.v

  // Boyut her zaman POZİTİF; hangi yöne büyüdüğü işarette taşınır ve merkeze
  // uygulanır. Negatif genişlik/uzunluk modele hiç girmez — sınır kutusu,
  // çarpışma sınavı ve geometri üretimi hep pozitif ölçü varsayıyor.
  const widthSign = signedWidthCm < 0 ? -1 : 1
  const lengthSign = signedLengthCm < 0 ? -1 : 1
  const projectedWidthCm = Math.max(minSizeCm, Math.abs(signedWidthCm))
  const projectedLengthCm = Math.max(minSizeCm, Math.abs(signedLengthCm))

  // Daire tek ölçü taşır: iki izdüşümün büyüğü çap olur (bkz. yukarıdaki uyarı).
  const isDiameterOnly = !hasAreaObjectRectangleSize(type)
  const diameterCm = Math.max(projectedWidthCm, projectedLengthCm)
  const widthCm = isDiameterOnly ? diameterCm : projectedWidthCm
  const lengthCm = isDiameterOnly ? diameterCm : projectedLengthCm

  // Merkez = sabit köşe + yarım genişlik (±u) + yarım uzunluk (±v); yönler yine
  // tutamacın kendi işaretlerinden. İşaretler olmasaydı nesne sabit köşenin
  // daima aynı tarafında kalır, imleç karşı tarafa geçtiğinde asgari boyda
  // KİLİTLENİRDİ.
  const halfWidthCm = widthSign * axisSigns.u * (widthCm / 2)
  const halfLengthCm = lengthSign * axisSigns.v * (lengthCm / 2)

  return {
    x: fixedCorner.x + halfWidthCm * uX + halfLengthCm * vX,
    y: fixedCorner.y + halfWidthCm * uY + halfLengthCm * vY,
    widthCm,
    lengthCm,
  }
}
