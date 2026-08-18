import { describe, expect, it } from 'vitest'

import { MIN_AREA_OBJECT_SIZE_CM, type AreaObjectShape } from '../areaObject'
import {
  findAreaObjectHandleAt,
  getAreaObjectAngleFromPointer,
  getAreaObjectHandleLayout,
  getAreaObjectLocalBounds,
  HANDLE_HIT_PX,
  resizeAreaObjectFromCorner,
} from '../areaObjectHandles'
import type { AreaObject } from '../model'

const FLOOR_ID = 1
/** Zoom 1 = 1 cm başına 1 piksel; testlerde px ↔ cm birebir okunsun. */
const ZOOM = 1

function makeAreaObject(overrides: Partial<AreaObject> = {}): AreaObject {
  return {
    id: 1,
    type: 'structuralColumn',
    floorId: FLOOR_ID,
    x: 0,
    y: 0,
    widthCm: 100,
    lengthCm: 100,
    angleDeg: 0,
    label: 'K-01',
    ...overrides,
  }
}

describe('getAreaObjectLocalBounds', () => {
  it('dikdörtgen tipte kutu tam olarak genişlik × uzunluk', () => {
    const bounds = getAreaObjectLocalBounds(
      'structuralColumn',
      makeAreaObject({ widthCm: 120, lengthCm: 80 }),
    )

    expect(bounds).toEqual({ minX: -60, minY: -40, maxX: 60, maxY: 40 })
  })

  it('daire olan kolon havalandırmasında kutu ÇİZİLEN dairenin sınırı', () => {
    // Çap min(width, length) — kutu modelin 120'sine değil dairenin 80'ine oturur.
    const bounds = getAreaObjectLocalBounds(
      'columnVentilation',
      makeAreaObject({ widthCm: 120, lengthCm: 80 }),
    )

    expect(bounds.maxX).toBeCloseTo(40, 5)
    expect(bounds.maxY).toBeCloseTo(40, 5)
    expect(bounds.minX).toBeCloseTo(-40, 5)
  })

  it('merdivenin basamak/ok çizgileri kutuyu taşırmaz', () => {
    const bounds = getAreaObjectLocalBounds(
      'stairs',
      makeAreaObject({ widthCm: 120, lengthCm: 200 }),
    )

    expect(bounds).toEqual({ minX: -60, minY: -100, maxX: 60, maxY: 100 })
  })
})

describe('getAreaObjectHandleLayout', () => {
  it('döndürme ikonu kutunun ÜST-ORTA noktasının dışında durur', () => {
    const layout = getAreaObjectHandleLayout('structuralColumn', makeAreaObject(), ZOOM)

    expect(layout.rotate.x).toBeCloseTo(0, 5)
    // Kutunun üst kenarı +50; ikon onun da dışında.
    expect(layout.rotate.y).toBeGreaterThan(50)
  })

  it('boyutlandırma ikonu kutunun SAĞ-ALT köşesinin dışında durur', () => {
    const layout = getAreaObjectHandleLayout('structuralColumn', makeAreaObject(), ZOOM)

    // Ekranda +y yukarı (Cameras.tsx): sağ-alt = (+x, −y).
    expect(layout.resize.x).toBeGreaterThan(50)
    expect(layout.resize.y).toBeLessThan(-50)
  })

  it('sabit köşe kutunun SOL-ÜSTÜ — resize orayı çakılı tutar', () => {
    const layout = getAreaObjectHandleLayout('structuralColumn', makeAreaObject(), ZOOM)

    expect(layout.fixedCorner).toEqual({ x: -50, y: 50 })
  })

  it('ikonların kutuya uzaklığı EKRAN pikselinde sabit — zoom ile ters ölçeklenir', () => {
    const object = makeAreaObject()
    const near = getAreaObjectHandleLayout('structuralColumn', object, 1)
    const far = getAreaObjectHandleLayout('structuralColumn', object, 2)

    // Zoom iki katına çıkınca aynı piksel payı YARI dünya birimi eder.
    expect(near.rotate.y - 50).toBeCloseTo((far.rotate.y - 50) * 2, 5)
  })

  it('kutu nesneyle birlikte DÖNER (eksen hizalı değil)', () => {
    const layout = getAreaObjectHandleLayout(
      'structuralColumn',
      makeAreaObject({ angleDeg: 90 }),
      ZOOM,
    )

    // 90° dönünce "üst" ekranda sola bakar.
    expect(layout.rotate.x).toBeLessThan(-50)
    expect(layout.rotate.y).toBeCloseTo(0, 5)
  })
})

describe('findAreaObjectHandleAt', () => {
  const object = makeAreaObject()
  const layout = getAreaObjectHandleLayout('structuralColumn', object, ZOOM)

  it('ikonun üstündeyken onu verir', () => {
    expect(findAreaObjectHandleAt(layout.resize, 'structuralColumn', object, ZOOM)).toBe('resize')
    expect(findAreaObjectHandleAt(layout.rotate, 'structuralColumn', object, ZOOM)).toBe('rotate')
  })

  it('ikonlardan uzakta undefined döner', () => {
    expect(findAreaObjectHandleAt({ x: 0, y: 0 }, 'structuralColumn', object, ZOOM)).toBeUndefined()
  })

  it('tutma alanı EKRAN pikselinde sabit: uzaklaşınca dünya karşılığı büyür', () => {
    // Zoom 1'de erişim yarıçapı HANDLE_HIT_PX/2 cm; onun bir tık dışı ıskalar.
    const justOutside = {
      x: layout.resize.x + HANDLE_HIT_PX / 2 + 2,
      y: layout.resize.y,
    }
    expect(findAreaObjectHandleAt(justOutside, 'structuralColumn', object, 1)).toBeUndefined()

    // Zoom 0.5'te aynı piksel yarıçapı iki kat dünya birimi eder → artık yakalar.
    const layoutFar = getAreaObjectHandleLayout('structuralColumn', object, 0.5)
    expect(findAreaObjectHandleAt(layoutFar.resize, 'structuralColumn', object, 0.5)).toBe('resize')
  })
})

describe('getAreaObjectAngleFromPointer', () => {
  const center = { x: 0, y: 0 }

  it('imleç yukarıdayken açı 0 (ikon nesnenin +y ucunda)', () => {
    expect(getAreaObjectAngleFromPointer({ x: 0, y: 100 }, center)).toBeCloseTo(0, 5)
  })

  it('imleç sola gidince 90 dereceye döner', () => {
    expect(getAreaObjectAngleFromPointer({ x: -100, y: 0 }, center)).toBeCloseTo(90, 5)
  })

  it('sonuç her zaman 0-359 aralığında', () => {
    const angle = getAreaObjectAngleFromPointer({ x: 100, y: 0 }, center)

    expect(angle).toBeGreaterThanOrEqual(0)
    expect(angle).toBeLessThan(360)
  })
})

describe('resizeAreaObjectFromCorner', () => {
  it('karşı köşe SABİT kalır, nesne oradan büyür', () => {
    const object = makeAreaObject()
    const fixedBefore = getAreaObjectHandleLayout('structuralColumn', object, ZOOM).fixedCorner

    const next = resizeAreaObjectFromCorner(
      'structuralColumn',
      object,
      { x: 150, y: -150 },
      MIN_AREA_OBJECT_SIZE_CM,
      ZOOM,
    )
    const fixedAfter = getAreaObjectHandleLayout(
      'structuralColumn',
      { ...object, ...next },
      ZOOM,
    ).fixedCorner

    expect(fixedAfter.x).toBeCloseTo(fixedBefore.x, 5)
    expect(fixedAfter.y).toBeCloseTo(fixedBefore.y, 5)
    expect(next.widthCm).toBeCloseTo(200, 5)
    expect(next.lengthCm).toBeCloseTo(200, 5)
  })

  it('döndürülmüş nesnede de karşı köşe sabit kalır', () => {
    const object = makeAreaObject({ x: 40, y: 25, angleDeg: 37 })
    const fixedBefore = getAreaObjectHandleLayout('structuralColumn', object, ZOOM).fixedCorner

    const next = resizeAreaObjectFromCorner(
      'structuralColumn',
      object,
      { x: 200, y: -120 },
      MIN_AREA_OBJECT_SIZE_CM,
      ZOOM,
    )
    const fixedAfter = getAreaObjectHandleLayout(
      'structuralColumn',
      { ...object, ...next },
      ZOOM,
    ).fixedCorner

    expect(fixedAfter.x).toBeCloseTo(fixedBefore.x, 5)
    expect(fixedAfter.y).toBeCloseTo(fixedBefore.y, 5)
  })

  it('boyut asgari sınırın altına düşmez — imleç TAM sabit köşedeyken', () => {
    // Ötesine geçmek artık nesneyi karşı yöne büyütüyor (aşağıdaki describe);
    // asgari sınır yalnız köşenin TAM üstünde, iki izdüşüm de sıfırken devrede.
    const object = makeAreaObject()

    const next = resizeAreaObjectFromCorner(
      'structuralColumn',
      object,
      { x: -50, y: 50 },
      MIN_AREA_OBJECT_SIZE_CM,
      ZOOM,
    )

    expect(next.widthCm).toBe(MIN_AREA_OBJECT_SIZE_CM)
    expect(next.lengthCm).toBe(MIN_AREA_OBJECT_SIZE_CM)
  })
})

describe('resizeAreaObjectFromCorner — kolon havalandırması tek ÇAP taşır (K52)', () => {
  const vent: AreaObjectShape = { x: 0, y: 0, widthCm: 100, lengthCm: 100, angleDeg: 0 }

  it('SADECE aşağı çekmek çapı büyütür (daire kaymaz, büyür)', () => {
    // Sabit köşe sol-üst = (-50, 50). Aşağı: y ekseninde uzaklaş, x sabit.
    const next = resizeAreaObjectFromCorner(
      'columnVentilation',
      vent,
      { x: 50, y: -150 },
      1,
      1,
    )

    // İki ölçü EŞİT: çap = izdüşümlerin büyüğü (uzunluk 200).
    expect(next.widthCm).toBe(next.lengthCm)
    expect(next.lengthCm).toBeCloseTo(200, 6)
    // Çap büyüdü, yani daire gerçekten büyüyor.
    expect(next.widthCm).toBeGreaterThan(vent.widthCm)
  })

  it('sabit köşe (sol-üst) yerinde kalır', () => {
    const next = resizeAreaObjectFromCorner(
      'columnVentilation',
      vent,
      { x: 50, y: -150 },
      1,
      1,
    )

    // Merkez − yarım çap = sol-üst köşe, başlangıçtakiyle aynı.
    expect(next.x - next.widthCm / 2).toBeCloseTo(-50, 6)
    expect(next.y + next.lengthCm / 2).toBeCloseTo(50, 6)
  })

  it('dikdörtgen ölçülü tipte iki ölçü BAĞIMSIZ kalır', () => {
    const next = resizeAreaObjectFromCorner(
      'structuralColumn',
      vent,
      { x: 50, y: -150 },
      1,
      1,
    )

    expect(next.widthCm).toBeCloseTo(100, 6)
    expect(next.lengthCm).toBeCloseTo(200, 6)
  })
})

/**
 * İmleç sabit köşeyi geçince nesne karşı yöne büyümeye devam eder; eskiden
 * asgari boyda kilitleniyor ve yalnız sağa/aşağı boyutlandırılabiliyordu.
 *
 * Fixture 100×100, merkezi orijinde, açı 0 → sabit köşe (sol-üst) = (-50, 50).
 */
describe('resizeAreaObjectFromCorner — sabit köşenin ÖTESİNE geçiş', () => {
  const resize = (target: { x: number; y: number }, type: AreaObject['type'] = 'structuralColumn') =>
    resizeAreaObjectFromCorner(type, makeAreaObject(), target, MIN_AREA_OBJECT_SIZE_CM, ZOOM)

  it('yatayda karşı tarafa geçince SOLA büyür, sağ kenarı sabit köşede kalır', () => {
    const next = resize({ x: -150, y: -150 })

    expect(next.widthCm).toBe(100)
    // Merkez sabit köşenin SOLUNDA: nesne -150 ile -50 arasında.
    expect(next.x).toBe(-100)
    expect(next.x + next.widthCm / 2).toBe(-50)
  })

  it('dikeyde karşı tarafa geçince YUKARI büyür, alt kenarı sabit köşede kalır', () => {
    const next = resize({ x: 150, y: 150 })

    expect(next.lengthCm).toBe(100)
    expect(next.y).toBe(100)
    expect(next.y - next.lengthCm / 2).toBe(50)
  })

  it('iki eksende birden geçilebilir', () => {
    const next = resize({ x: -150, y: 150 })

    expect(next).toMatchObject({ x: -100, y: 100, widthCm: 100, lengthCm: 100 })
  })

  it('eksenler BAĞIMSIZ: yalnız yatayda geçmek dikeyi çevirmez', () => {
    const next = resize({ x: -150, y: -150 })

    // Uzunluk hâlâ sabit köşenin altına doğru.
    expect(next.y - next.lengthCm / 2).toBeLessThan(50)
  })

  it('sıfırdan geçiş KESİNTİSİZ: genişlik 100 → 0 → 100', () => {
    // Sabit köşe x = -50; imleç sağdan sola yürüyor.
    const widths = [50, -10, -50, -90, -150].map((x) => resize({ x, y: -150 }).widthCm)

    // 100 → 40 → (asgari) → 40 → 100: sıfırda kilitlenmiyor, karşı yönde büyüyor.
    expect(widths[0]).toBe(100)
    expect(widths[1]).toBe(40)
    expect(widths[2]).toBe(MIN_AREA_OBJECT_SIZE_CM)
    expect(widths[3]).toBe(40)
    expect(widths[4]).toBe(100)
  })

  it('daire tipinde de çalışır: çap pozitif, merkez karşı tarafa geçer', () => {
    const next = resize({ x: -150, y: -150 }, 'columnVentilation')

    expect(next.widthCm).toBe(next.lengthCm)
    expect(next.widthCm).toBeGreaterThan(0)
    expect(next.x).toBeLessThan(-50)
  })

  it('geçilmediğinde davranış AYNI kalır (gerileme koruması)', () => {
    const next = resize({ x: 150, y: -150 })

    expect(next).toMatchObject({ x: 50, y: -50, widthCm: 200, lengthCm: 200 })
  })
})
