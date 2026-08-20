import type { PlanPoint, ThreePosition } from '../../core/coords'

export type Vec3 = readonly [x: number, y: number, z: number]

/** Satır öncelikli 3x3. Satırlar doğrudan kamera bazını verdiği için sütun değil satır. */
export type Mat3 = readonly [Vec3, Vec3, Vec3]

export type IsometricAngles = {
  alphaDeg: number
  betaDeg: number
}

/**
 * WebCAD'in varsayılanı (`config.isometricView`). Gerçek izometri (35,264°/45°)
 * değil, biraz daha tepeden bakan bir dimetrik — referans çizimler bu açıyla
 * üretildiği için varsayılan olarak korunuyor.
 */
export const ISOMETRIC_ANGLES_DEFAULT: IsometricAngles = { alphaDeg: 40, betaDeg: 60 }

/**
 * α 90°'yi geçerse kamera zemin düzleminin altına düşer ve çizim ters görünür;
 * 0'ın altında da aynı şey ayna simetrisiyle olur. β serbestçe döner, sınır
 * yerine 360'a göre sarılır.
 */
export const ISOMETRIC_ALPHA_MIN_DEG = 0
export const ISOMETRIC_ALPHA_MAX_DEG = 89
const FULL_TURN_DEG = 360

/** Gerçek izometri: üç eksen eşit kısalır. atan(1/√2) = 35,264°. */
const TRUE_ISOMETRIC_ALPHA_DEG = (Math.atan(Math.SQRT1_2) * 180) / Math.PI
const TRUE_ISOMETRIC_BETA_DEG = 45

export type IsometricAnglePreset = {
  id: string
  label: string
  angles: IsometricAngles
}

export const ISOMETRIC_ANGLE_PRESETS: readonly IsometricAnglePreset[] = [
  { id: 'webcad', label: 'Varsayılan', angles: ISOMETRIC_ANGLES_DEFAULT },
  {
    id: 'trueIsometric',
    label: 'Klasik 30°',
    angles: { alphaDeg: TRUE_ISOMETRIC_ALPHA_DEG, betaDeg: TRUE_ISOMETRIC_BETA_DEG },
  },
  { id: 'front', label: 'Önden', angles: { alphaDeg: 0, betaDeg: 0 } },
  { id: 'right', label: 'Sağdan', angles: { alphaDeg: 0, betaDeg: 90 } },
  { id: 'left', label: 'Soldan', angles: { alphaDeg: 0, betaDeg: 270 } },
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
