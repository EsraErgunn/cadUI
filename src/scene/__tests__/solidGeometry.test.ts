import { describe, expect, it } from 'vitest'

import type {
  SolidAreaCylinder,
  SolidBox,
  SolidPipeSegment,
  SolidSlab,
} from '../../core/solidModel'
import {
  createBoxesGeometry,
  createCylindersGeometry,
  createPipesGeometry,
  createSlabsGeometry,
} from '../solid/solidGeometry'

const box: SolidBox = {
  key: 'box',
  center: { x: 100, y: 50 },
  lengthCm: 400,
  widthCm: 20,
  heightCm: 280,
  baseCm: 0,
  angleDeg: 0,
}

function getBoundingBox(geometry: ReturnType<typeof createBoxesGeometry>) {
  if (!geometry) throw new Error('geometri kurulmadı')
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox
  if (!bounds) throw new Error('sınır kutusu yok')
  return bounds
}

describe('createBoxesGeometry', () => {
  it('boş listede geometri kurmaz', () => {
    expect(createBoxesGeometry([])).toBeNull()
  })

  it('kutuyu plan konumuna ve taban+yükseklik kotuna oturtur', () => {
    const bounds = getBoundingBox(createBoxesGeometry([box]))

    // Plan (100, 50) → three (100, y, −50); eksen boyu x'te, kalınlık z'de.
    expect(bounds.min.x).toBeCloseTo(-100)
    expect(bounds.max.x).toBeCloseTo(300)
    expect(bounds.min.z).toBeCloseTo(-60)
    expect(bounds.max.z).toBeCloseTo(-40)
    // Kutu TABANDAN yükselir: merkezi değil alt yüzü baseCm'de.
    expect(bounds.min.y).toBeCloseTo(0)
    expect(bounds.max.y).toBeCloseTo(280)
  })

  it('90° dönmüş kutuda eksen boyu plan y ekseninde uzanır', () => {
    const bounds = getBoundingBox(createBoxesGeometry([{ ...box, angleDeg: 90 }]))

    expect(bounds.max.x - bounds.min.x).toBeCloseTo(20)
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(400)
  })

  it('birden çok kutu TEK tamponda birleşir', () => {
    const single = createBoxesGeometry([box])
    const double = createBoxesGeometry([box, { ...box, key: 'box2' }])

    expect(double?.getAttribute('position').count).toBe(
      (single?.getAttribute('position').count ?? 0) * 2,
    )
  })
})

describe('createPipesGeometry', () => {
  const segment: SolidPipeSegment = {
    key: 'pipe',
    kind: 'pipe',
    pipeTypeName: 'DN25',
    from: { x: 0, y: 0 },
    to: { x: 0, y: 0 },
    fromElevationCm: 0,
    toElevationCm: 200,
    radiusCm: 2,
  }

  it('saf DİKEY bağlantı çizilir — plan boyu sıfır olsa da 3B boyu var', () => {
    const geometry = createPipesGeometry([segment])
    if (!geometry) throw new Error('geometri kurulmadı')

    geometry.computeBoundingBox()
    expect(geometry.boundingBox?.min.y).toBeCloseTo(0)
    expect(geometry.boundingBox?.max.y).toBeCloseTo(200)
  })

  it('iki ucu da aynı olan segment atlanır: yönü tanımsız', () => {
    expect(createPipesGeometry([{ ...segment, toElevationCm: 0 }])).toBeNull()
  })
})

describe('createSlabsGeometry', () => {
  it('üçgen köşesi olmayan döşeme tamponu kurmaz', () => {
    const empty: SolidSlab = { key: 'slab', triangleCorners: [], baseCm: 0, usageType: undefined }
    expect(createSlabsGeometry([empty])).toBeNull()
  })

  it('üçgenleri kendi kat kotuna taşır', () => {
    const slab: SolidSlab = {
      key: 'slab',
      triangleCorners: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 0, y: 100 },
      ],
      baseCm: 300,
      usageType: undefined,
    }
    const geometry = createSlabsGeometry([slab])
    if (!geometry) throw new Error('geometri kurulmadı')

    expect(geometry.getAttribute('position').count).toBe(3)
    // Döşeme kat tabanının bir tık ALTINDA: duvarla z-fighting yapmasın.
    expect(geometry.getAttribute('position').getY(0)).toBeLessThan(300)
    expect(geometry.getAttribute('position').getY(0)).toBeGreaterThan(298)
  })
})

const cylinder: SolidAreaCylinder = {
  key: 'shaft',
  areaType: 'flueShaft',
  center: { x: 100, y: 50 },
  outerRadiusCm: 23,
  innerRadiusCm: 18,
  heightCm: 280,
  baseCm: 300,
}

describe('createCylindersGeometry', () => {
  it('boş listede geometri kurmaz', () => {
    expect(createCylindersGeometry([])).toBeNull()
  })

  it('şaftı plan konumuna oturtur ve TABANINDAN yukarı çıkar', () => {
    const bounds = getBoundingBox(createCylindersGeometry([cylinder]))

    // Plan (100, 50) → three (100, y, −50); yarıçap iki eksende de aynı.
    expect(bounds.min.x).toBeCloseTo(100 - cylinder.outerRadiusCm)
    expect(bounds.max.x).toBeCloseTo(100 + cylinder.outerRadiusCm)
    expect(bounds.min.z).toBeCloseTo(-50 - cylinder.outerRadiusCm)
    expect(bounds.max.z).toBeCloseTo(-50 + cylinder.outerRadiusCm)
    // Çıkarma tabandan başlar: kutuların aksine merkez kotu DEĞİL.
    expect(bounds.min.y).toBeCloseTo(cylinder.baseCm)
    expect(bounds.max.y).toBeCloseTo(cylinder.baseCm + cylinder.heightCm)
  })

  it('içi boş şafta delik açar, dolusuna açmaz', () => {
    const hollow = createCylindersGeometry([cylinder])
    const solid = createCylindersGeometry([{ ...cylinder, innerRadiusCm: 0 }])
    if (!hollow || !solid) throw new Error('geometri kurulmadı')

    // Delik hem iç duvarı hem de halka kapakları getiriyor: dolu silindirden
    // MUTLAKA daha çok köşe çıkar.
    expect(hollow.getAttribute('position').count).toBeGreaterThan(
      solid.getAttribute('position').count,
    )
  })

  it('dolu ve boş şaftı TEK tamponda birleştirir', () => {
    const merged = createCylindersGeometry([cylinder, { ...cylinder, innerRadiusCm: 0 }])

    expect(merged).not.toBeNull()
  })
})
