import { describe, expect, it } from 'vitest'

import { planToThree } from '../../../core/coords'
import {
  ISOMETRIC_ALPHA_MAX_DEG,
  ISOMETRIC_ANGLES_DEFAULT,
  ISOMETRIC_ANGLE_PRESETS,
  clampIsometricAngles,
  getIsometricBasis,
  getIsometricMatrix,
  isometricOffsetToWorld,
  projectIsometric,
} from '../isometricProjection'
import type { IsometricAngles, Vec3 } from '../isometricProjection'

const PRECISION = 9

/**
 * WebCAD'in kendi varsayılanı. Bizim varsayılanımız ARTIK bu değil (gerçek
 * izometriye geçti) ama referans matrisin doğruluğu bu açıyla sınanıyor:
 * izdüşüm ailesi hâlâ onun.
 */
const WEBCAD_REFERENCE_ANGLES: IsometricAngles = { alphaDeg: 40, betaDeg: 60 }

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

/** Kameranın baktığı yöndeki izdüşüm: büyüdükçe UZAK. */
function depthOf(position: readonly [number, number, number], angles: IsometricAngles): number {
  return dot(getIsometricBasis(angles).forward, position)
}

const SAMPLE_ANGLES: IsometricAngles[] = [
  ISOMETRIC_ANGLES_DEFAULT,
  WEBCAD_REFERENCE_ANGLES,
  { alphaDeg: 0, betaDeg: 0 },
  { alphaDeg: 12, betaDeg: 217 },
  { alphaDeg: 89, betaDeg: 359 },
]

describe('getIsometricMatrix', () => {
  it('WebCAD açısında (40°/60°) referans matrisi birebir üretir', () => {
    // izometrik.md → IsometryStage.getIsometryTransform3x3, Rx(40)·Ry(60)·Rx(π).
    const [row1, row2, row3] = getIsometricMatrix(WEBCAD_REFERENCE_ANGLES)

    expect(row1[0]).toBeCloseTo(0.5, PRECISION)
    expect(row1[1]).toBeCloseTo(0, PRECISION)
    expect(row1[2]).toBeCloseTo(0.866025403784, PRECISION)

    expect(row2[0]).toBeCloseTo(0.556670399226, PRECISION)
    expect(row2[1]).toBeCloseTo(-0.766044443119, PRECISION)
    expect(row2[2]).toBeCloseTo(-0.321393804843, PRECISION)

    expect(row3[0]).toBeCloseTo(0.663413948169, PRECISION)
    expect(row3[1]).toBeCloseTo(0.642787609687, PRECISION)
    expect(row3[2]).toBeCloseTo(-0.383022221559, PRECISION)
  })

  it('her açıda dönme matrisidir (satırlar ortonormal)', () => {
    for (const angles of SAMPLE_ANGLES) {
      const rows = getIsometricMatrix(angles)
      for (const row of rows) {
        expect(dot(row, row)).toBeCloseTo(1, PRECISION)
      }
      expect(dot(rows[0], rows[1])).toBeCloseTo(0, PRECISION)
      expect(dot(rows[0], rows[2])).toBeCloseTo(0, PRECISION)
      expect(dot(rows[1], rows[2])).toBeCloseTo(0, PRECISION)
    }
  })
})

describe('getIsometricBasis', () => {
  it('sağ elli bir kamera bazıdır: right × up = −forward', () => {
    for (const angles of SAMPLE_ANGLES) {
      const { right, up, forward } = getIsometricBasis(angles)
      const [x, y, z] = cross(right, up)
      expect(x).toBeCloseTo(-forward[0], PRECISION)
      expect(y).toBeCloseTo(-forward[1], PRECISION)
      expect(z).toBeCloseTo(-forward[2], PRECISION)
    }
  })

  it('kamera her zaman YUKARIDA durur ve aşağı bakar', () => {
    // forward.y < 0 olmasaydı kamera yerin altına düşer, çizim ters okunurdu.
    for (const angles of SAMPLE_ANGLES) {
      if (angles.alphaDeg === 0) continue
      expect(getIsometricBasis(angles).forward[1]).toBeLessThan(0)
    }
  })

  it('α = 0 iken kamera tam yatay bakar (kot ekseni ekranda dikey kalır)', () => {
    expect(getIsometricBasis({ alphaDeg: 0, betaDeg: 0 }).forward[1]).toBeCloseTo(0, PRECISION)
  })
})

describe('projectIsometric', () => {
  it('kot ekseni HER açıda ekranda tam dikey kalır', () => {
    // right'ın y bileşeni yapı gereği sıfır (Rx(α)·Ry(β) satır 1 = (cosβ, 0, −sinβ));
    // bu yüzden yükseklik hiçbir açıda yana kaymaz. İzometrik çizimin temel şartı.
    for (const angles of SAMPLE_ANGLES) {
      const screen = projectIsometric([0, 100, 0], angles)
      expect(screen.x).toBeCloseTo(0, PRECISION)
      expect(screen.y).toBeGreaterThan(0)
    }
  })

  it('WebCAD açısında bilinen bir noktayı beklenen ekran konumuna taşır', () => {
    const screen = projectIsometric(planToThree({ x: 200, y: 100 }, 300), WEBCAD_REFERENCE_ANGLES)
    expect(screen.x).toBeCloseTo(-13.397459621556, 6)
    expect(screen.y).toBeCloseTo(86.339872606083, 6)
  })

  it('önden görünümde (0°/0°) plan y ekranda kaybolur, kot dikeyde kalır', () => {
    const angles: IsometricAngles = { alphaDeg: 0, betaDeg: 0 }
    const near = projectIsometric(planToThree({ x: 100, y: 0 }, 50), angles)
    const far = projectIsometric(planToThree({ x: 100, y: 900 }, 50), angles)

    expect(near.x).toBeCloseTo(far.x, PRECISION)
    expect(near.y).toBeCloseTo(far.y, PRECISION)
    expect(near.y).toBeCloseTo(50, PRECISION)
  })

  it('iki plan ekseni zıt yönlere açılır (izometrik okunurluğun şartı)', () => {
    const origin = projectIsometric(planToThree({ x: 0, y: 0 }), ISOMETRIC_ANGLES_DEFAULT)
    const alongX = projectIsometric(planToThree({ x: 100, y: 0 }), ISOMETRIC_ANGLES_DEFAULT)
    const alongY = projectIsometric(planToThree({ x: 0, y: 100 }), ISOMETRIC_ANGLES_DEFAULT)

    // Biri sola biri sağa gitmeli; ikisi de aynı yana giderse eksenler üst üste biner.
    expect(Math.sign(alongX.x - origin.x)).not.toBe(Math.sign(alongY.x - origin.x))
    // İkisi de zemin düzleminde, ikisi de ekranda AŞAĞI iner (yukarıdan bakış).
    expect(alongX.y).toBeLessThan(origin.y)
    expect(alongY.y).toBeLessThan(origin.y)
  })

  it('yüksek kot kameraya daha YAKIN olur (üst kat alt katı örter)', () => {
    const lower = depthOf(planToThree({ x: 0, y: 0 }, 0), ISOMETRIC_ANGLES_DEFAULT)
    const upper = depthOf(planToThree({ x: 0, y: 0 }, 300), ISOMETRIC_ANGLES_DEFAULT)
    expect(upper).toBeLessThan(lower)
  })
})

describe('isometricOffsetToWorld', () => {
  it('birim kaydırmalar tam olarak baz vektörlerini verir', () => {
    const { right, up } = getIsometricBasis(ISOMETRIC_ANGLES_DEFAULT)

    const alongRight = isometricOffsetToWorld({ x: 1, y: 0 }, ISOMETRIC_ANGLES_DEFAULT)
    const alongUp = isometricOffsetToWorld({ x: 0, y: 1 }, ISOMETRIC_ANGLES_DEFAULT)

    for (let axis = 0; axis < 3; axis += 1) {
      expect(alongRight[axis]).toBeCloseTo(right[axis], PRECISION)
      expect(alongUp[axis]).toBeCloseTo(up[axis], PRECISION)
    }
  })

  it('dünyaya taşınan kaydırma geri izdüşürülünce aynı 2B değeri verir', () => {
    // Sürükleme bu gidiş-dönüşe dayanıyor: ekranda ölçülen delta dünyaya taşınıp
    // sahnede uygulanıyor, sonra tekrar ekranda okunuyor.
    const offsetCm = { x: -37.5, y: 128.25 }
    for (const angles of SAMPLE_ANGLES) {
      const world = isometricOffsetToWorld(offsetCm, angles)
      const screen = projectIsometric(world, angles)
      expect(screen.x).toBeCloseTo(offsetCm.x, 6)
      expect(screen.y).toBeCloseTo(offsetCm.y, 6)
    }
  })
})

describe('clampIsometricAngles', () => {
  it('α sınırlanır, β 360°ye göre sarılır', () => {
    expect(clampIsometricAngles({ alphaDeg: 120, betaDeg: 45 }).alphaDeg).toBe(ISOMETRIC_ALPHA_MAX_DEG)
    expect(clampIsometricAngles({ alphaDeg: -12, betaDeg: 45 }).alphaDeg).toBe(0)
    expect(clampIsometricAngles({ alphaDeg: 40, betaDeg: 400 }).betaDeg).toBe(40)
    expect(clampIsometricAngles({ alphaDeg: 40, betaDeg: -30 }).betaDeg).toBe(330)
  })

  it('geçerli açıları değiştirmez', () => {
    expect(clampIsometricAngles(ISOMETRIC_ANGLES_DEFAULT)).toEqual(ISOMETRIC_ANGLES_DEFAULT)
  })
})

describe('ISOMETRIC_ANGLE_PRESETS', () => {
  it('hazır açıların hepsi sınırların içinde', () => {
    for (const preset of ISOMETRIC_ANGLE_PRESETS) {
      expect(clampIsometricAngles(preset.angles)).toEqual(preset.angles)
    }
  })

  it('VARSAYILAN açıda üç eksen ekranda eşit kısalır (gerçek izometri)', () => {
    // "Klasik 30°" denen okunuş bu: eksenler ekranda yatayla 30° yapar.
    const lengthOf = (position: readonly [number, number, number]) => {
      const screen = projectIsometric(position, ISOMETRIC_ANGLES_DEFAULT)
      return Math.hypot(screen.x, screen.y)
    }

    const alongPlanX = lengthOf(planToThree({ x: 100, y: 0 }))
    const alongPlanY = lengthOf(planToThree({ x: 0, y: 100 }))
    const alongElevation = lengthOf(planToThree({ x: 0, y: 0 }, 100))

    expect(alongPlanX).toBeCloseTo(alongPlanY, 6)
    expect(alongPlanY).toBeCloseTo(alongElevation, 6)
  })
})
