import type { PlanPoint, ThreePosition } from '../../core/coords'

export type Vec3 = readonly [x: number, y: number, z: number]

/** Satır öncelikli 3x3. Satırlar doğrudan kamera bazını verdiği için sütun değil satır. */
export type Mat3 = readonly [Vec3, Vec3, Vec3]

export type IsometricAngles = {
  alphaDeg: number
  betaDeg: number
}

/** Gerçek izometri: üç eksen ekranda EŞİT kısalır. atan(1/√2) = 35,264°. */
const TRUE_ISOMETRIC_ALPHA_DEG = (Math.atan(Math.SQRT1_2) * 180) / Math.PI
const TRUE_ISOMETRIC_BETA_DEG = 45

/**
 * Varsayılan bakış açısı GERÇEK izometri (kullanıcı kararı): eksenler ekranda
 * yatayla 30° yapar — teknik çizimde "klasik 30°" denen okunuş budur.
 *
 * WebCAD'in kendi varsayılanı (40°/60°) bir DİMETRİK, yani eksenler eşit
 * kısalmıyor ve çizim daha tepeden görünüyor. İzdüşüm matrisi hâlâ onun
 * ailesinden (`Rx(α)·Ry(β)`), yalnız başlangıç açısı bizde farklı.
 */
export const ISOMETRIC_ANGLES_DEFAULT: IsometricAngles = {
  alphaDeg: TRUE_ISOMETRIC_ALPHA_DEG,
  betaDeg: TRUE_ISOMETRIC_BETA_DEG,
}

/**
 * Bir 3B noktayı çizim düzlemine indiren izdüşüm.
 *
 * Soyutlama `IsometricAngles`in YERİNE geçti (K155) çünkü kâğıt artık bir
 * KAMERA görüntüsü değil: ekran ortografik kamerayla döndürülebilir bir
 * izometri gösteriyor, pafta ise sabit bir OBLİK çizim ve oblik hiçbir kamera
 * açısıyla elde edilemez (bkz. `getObliqueProjection`). İkisinin ortak yanı
 * yalnız "3B nokta → 2B nokta" olduğu için sözleşme bu iki fonksiyona indi.
 */
export type IsometricProjection = {
  /** Three noktasının çizim koordinatı (cm, y YUKARI). */
  project: (position: ThreePosition) => PlanPoint
  /**
   * Çizim düzlemindeki bir kaydırmanın dünya karşılığı. `project` ile GİDİŞ
   * DÖNÜŞ birim işlem olmak ZORUNDA: `project(offsetToWorld(o)) === o`.
   * Kullanıcının elle ayırdığı etiket/dal kaymaları 2B saklanıyor ve sahnede
   * 3B uygulanıyor; bu eşitlik bozulursa kaymalar kayar.
   */
  offsetToWorld: (offsetCm: PlanPoint) => Vec3
}

/** Ekranın izdüşümü: döndürülebilir ortografik kamera. */
export function getCameraProjection(angles: IsometricAngles): IsometricProjection {
  return {
    project: (position) => projectIsometric(position, angles),
    offsetToWorld: (offsetCm) => isometricOffsetToWorld(offsetCm, angles),
  }
}

/** Oblik çizimde eğik eksenin yatayla yaptığı açı. Referans paftada 30°. */
const OBLIQUE_AXIS_DEG = 30

/**
 * PAFTANIN izdüşümü: sabit OBLİK çizim (K155).
 *
 * Kullanıcının elindeki gerçek gaz paftası ve ona ait kat planları ölçüldü;
 * ikisi de aynı şeyi söylüyor:
 *
 *     plan x → TAM YATAY      plan y → 30° EĞİK      kot → TAM DİKEY
 *
 * ⚠️ Bu bir İZOMETRİ DEĞİL, oblik (cavalier) izdüşümdür ve bu bilinçli. Gerçek
 * izometride üç eksen eşit kısalır; kot dikey sabitlenince bu, kalan iki ekseni
 * ZORUNLU olarak yataydan ±30°'ye oturtur — yani hiçbir eksen yatay olamaz.
 * Referans paftada yatay segmentler var, dolayısıyla o çizim izometri değil.
 * Kâğıt referansa uyar; sayfa başlığı da bu yüzden şema der.
 *
 * ⚠️ Kamera açısıyla ELDE EDİLEMEZ. `Rx(α)·Ry(β)` ailesinde plan x'i yatay yapan
 * tek durum β = 0/180 ve orada plan y ekseni düşeyle ÇAKIŞIYOR (ölçüldü: +Y ve
 * +Z ikisi de 90°) — plan derinliği tümüyle kayboluyor. Oblik ortografik bir
 * bakış değil, bir KESME (shear) dönüşümü; bu yüzden ekrandaki 3B görünüm onu
 * gösteremez ve kâğıt ile ekran bilerek ayrışıyor.
 *
 * ⚠️ Eğik eksenin YÖNÜ (sağ-yukarı değil sol-aşağı) okunabilirlik için: plan x
 * yatay olduğundan, eğik ekseni sağ-yukarı almak ikisini yalnız 30° ayırır ve
 * dikdörtgen bir kat ince bir dilime çöker. Sol-aşağıda ayrım 150° olur, plan
 * geniş bir paralelkenar gibi okunur.
 */
export function getObliqueProjection(): IsometricProjection {
  const cos = Math.cos(toRadians(OBLIQUE_AXIS_DEG))
  const sin = Math.sin(toRadians(OBLIQUE_AXIS_DEG))

  return {
    // three = (plan x, kot, −plan y) olduğu için plan y = −z. Eğik eksenin
    // katkısı bu yüzden +z ile yazılıyor; ayrı bir koordinat dönüşümü değil,
    // `coords.ts`'in kuralının burada okunması.
    project: ([x, y, z]) => ({ x: x + z * cos, y: y + z * sin }),
    // project(offsetToWorld(o)) = o: yatay kayma three x'e, düşey kayma three
    // y'ye (kota) gider; ikisinin de z bileşeni sıfır olduğu için eğik eksen
    // hiç karışmıyor.
    offsetToWorld: (offsetCm) => [offsetCm.x, offsetCm.y, 0],
  }
}

/**
 * α 90°'yi geçerse kamera zemin düzleminin altına düşer ve çizim ters görünür;
 * 0'ın altında da aynı şey ayna simetrisiyle olur. β serbestçe döner, sınır
 * yerine 360'a göre sarılır.
 */
export const ISOMETRIC_ALPHA_MIN_DEG = 0
export const ISOMETRIC_ALPHA_MAX_DEG = 89
const FULL_TURN_DEG = 360

export type IsometricAnglePreset = {
  id: string
  label: string
  angles: IsometricAngles
}

/**
 * Hazır açılar. Yan görünümler (önden/sağdan/soldan) YOK: izometrik çizimin işi
 * derinliği göstermek ve α = 0'da zemin düzlemi kenardan görünüp tüm kat
 * yerleşimi tek çizgiye çöküyor — plan görünümü zaten var, oraya bakmak
 * gerekiyorsa kullanıcı görünümü değiştirir.
 *
 * "Üstten" α'yı sınıra dayar, tam 90°'ye DEĞİL: 90°'de bakış yönü ile yukarı
 * yönü çakışır ve kamera yönelimi tanımsız kalır.
 */
export const ISOMETRIC_ANGLE_PRESETS: readonly IsometricAnglePreset[] = [
  { id: 'default', label: 'Varsayılan', angles: ISOMETRIC_ANGLES_DEFAULT },
  {
    id: 'top',
    label: 'Üstten',
    angles: { alphaDeg: ISOMETRIC_ALPHA_MAX_DEG, betaDeg: 0 },
  },
]

export function clampIsometricAngles({ alphaDeg, betaDeg }: IsometricAngles): IsometricAngles {
  const clampedAlpha = Math.min(ISOMETRIC_ALPHA_MAX_DEG, Math.max(ISOMETRIC_ALPHA_MIN_DEG, alphaDeg))
  // Negatif kalanı da pozitife çeken sarma: -30 → 330.
  const wrappedBeta = ((betaDeg % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG
  return { alphaDeg: clampedAlpha, betaDeg: wrappedBeta }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function multiply(a: Mat3, b: Mat3): Mat3 {
  const product: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      let sum = 0
      for (let k = 0; k < 3; k += 1) sum += a[row][k] * b[k][column]
      product[row][column] = sum
    }
  }
  return [
    [product[0][0], product[0][1], product[0][2]],
    [product[1][0], product[1][1], product[1][2]],
    [product[2][0], product[2][1], product[2][2]],
  ]
}

/**
 * `core/coords.ts` plan (x, y) + kotu three (x, kot, −y) yapar; WebCAD ise aynı
 * noktayı (x, −kot, y) olarak yazar. Aradaki fark tam olarak X ekseni etrafında
 * 180°'dir — bu yüzden ayrı bir "koordinat dönüşümü" değil, izdüşüm zincirinin
 * sabit bir çarpanı. Plan ↔ three dönüşümü hâlâ yalnız coords.ts'te.
 */
const WEBCAD_AXIS_SWAP: Mat3 = [
  [1, 0, 0],
  [0, -1, 0],
  [0, 0, -1],
]

/**
 * İzdüşüm matrisi: `Rx(α) · Ry(β) · Rx(π)`. İlk iki çarpan WebCAD'in
 * `getIsometryTransform3x3`'ü ile birebir aynı (izometrik.md), üçüncüsü bizim
 * eksen düzenimize geçiş.
 */
export function getIsometricMatrix({ alphaDeg, betaDeg }: IsometricAngles): Mat3 {
  const cosAlpha = Math.cos(toRadians(alphaDeg))
  const sinAlpha = Math.sin(toRadians(alphaDeg))
  const cosBeta = Math.cos(toRadians(betaDeg))
  const sinBeta = Math.sin(toRadians(betaDeg))

  const rotateX: Mat3 = [
    [1, 0, 0],
    [0, cosAlpha, sinAlpha],
    [0, -sinAlpha, cosAlpha],
  ]
  const rotateY: Mat3 = [
    [cosBeta, 0, -sinBeta],
    [0, 1, 0],
    [sinBeta, 0, cosBeta],
  ]

  return multiply(multiply(rotateX, rotateY), WEBCAD_AXIS_SWAP)
}

export type IsometricBasis = {
  /** Ekranda sağ yön (dünya). Kaydırma offset'ini dünyaya taşırken kullanılır. */
  right: Vec3
  /** Ekranda yukarı yön (dünya). */
  up: Vec3
  /** Kameranın BAKTIĞI yön (dünya), birim. Konum = hedef − forward · mesafe. */
  forward: Vec3
}

/**
 * İzdüşümü ayrıca hesaplamak yerine kamerayı bu yöne çeviriyoruz: ortografik
 * kamerada ikisi aynı görüntüyü verir ve sahne gerçek derinlik testiyle çizilir.
 *
 * Üç işaretin de eksi olmasının sebebi WebCAD'in tuval çerçevesinin SOL ELLİ
 * olması: x doğuya, y AŞAĞI (hem kotta hem plan y'sinde, EaselJS tuval düzeni),
 * z güneye bakar. Bizim three uzayımız sağ elli. Satırlar olduğu gibi
 * alınırsa ortaya kameranın yerin ALTINDA kaldığı bir görüntü çıkar: kot
 * ekranda yukarı gider ama derinlik ters döner, alt kat üst katı ÖRTER.
 * `−satır1`/`−satır2` yatay aynalama yapar, kamerayı yukarı taşır ve üst katı
 * öne alır. Sonuç, WebCAD çıktısının yatay aynası — fiziksel olarak doğru
 * olan bu, çünkü bizim plan +y'miz onların y'sinin tersi.
 */
export function getIsometricBasis(angles: IsometricAngles): IsometricBasis {
  const [row1, row2, row3] = getIsometricMatrix(angles)
  return {
    right: [-row1[0], -row1[1], -row1[2]],
    up: [-row2[0], -row2[1], -row2[2]],
    forward: [-row3[0], -row3[1], -row3[2]],
  }
}

/**
 * Bir three noktasının izometrik ekran koordinatı (cm, y YUKARI). Sahne bunu
 * kullanmaz — kamera zaten aynı işi yapar; testler ve sürükleme matematiği için.
 */
export function projectIsometric(position: ThreePosition, angles: IsometricAngles): PlanPoint {
  const { right, up } = getIsometricBasis(angles)
  const [x, y, z] = position
  return {
    x: right[0] * x + right[1] * y + right[2] * z,
    y: up[0] * x + up[1] * y + up[2] * z,
  }
}

/**
 * Ekran düzlemindeki bir kaydırmanın (izometrik offset) dünya karşılığı.
 * Offset 2B saklanır ama sahnede 3B uygulanmak zorunda; α/β değişince birlikte
 * dönmesi de buradan gelir — WebCAD offseti izdüşümden SONRA eklediği için aynı
 * davranışı ancak canlı açıyla hesaplayarak veriyoruz.
 */
export function isometricOffsetToWorld(offsetCm: PlanPoint, angles: IsometricAngles): Vec3 {
  const { right, up } = getIsometricBasis(angles)
  return [
    right[0] * offsetCm.x + up[0] * offsetCm.y,
    right[1] * offsetCm.x + up[1] * offsetCm.y,
    right[2] * offsetCm.x + up[2] * offsetCm.y,
  ]
}
