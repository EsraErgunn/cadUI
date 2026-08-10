import { describe, expect, it } from 'vitest'

import type { Point, PointSymbol, Wall } from '../model'
import {
  canMountOnWall,
  getSymbolFloorId,
  getSymbolPose,
  getSymbolsOnFloor,
  resolveSymbolAttachment,
} from '../symbolPlacement'

const FLOOR_ID = 1
const UPPER_FLOOR_ID = 14

// Yatay duvar (0,0)-(400,0), kalınlık 20 → yüzeyleri y = ±10.
const points: Point[] = [
  { id: 1, floorId: FLOOR_ID, x: 0, y: 0 },
  { id: 2, floorId: FLOOR_ID, x: 400, y: 0 },
  { id: 3, floorId: UPPER_FLOOR_ID, x: 0, y: 0 },
  { id: 4, floorId: UPPER_FLOOR_ID, x: 400, y: 0 },
]
const walls: Wall[] = [
  { id: 10, floorId: FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 },
  { id: 11, floorId: UPPER_FLOOR_ID, p1Id: 3, p2Id: 4, thickness: 20, height: 280 },
]

const context = { walls, points, floorId: FLOOR_ID }

function wallSymbol(
  offsetCm: number,
  isMountedOnFarFace: boolean,
  wallId = 10,
  id = 20,
): PointSymbol {
  return {
    id,
    type: 'panel',
    label: 'P-01',
    note: '',
    attachment: 'wall',
    wallId,
    offsetCm,
    isMountedOnFarFace,
  }
}

const freeSymbol: PointSymbol = {
  id: 21,
  type: 'lighting',
  label: 'AY-01',
  note: '',
  attachment: 'free',
  floorId: FLOOR_ID,
  x: 200,
  y: 200,
  rotationDeg: 45,
}

describe('canMountOnWall', () => {
  it('aydınlatma duvara bağlanmaz — referansta da serbest', () => {
    expect(canMountOnWall('lighting')).toBe(false)
  })

  it('kalan altı sembol bağlanabilir', () => {
    for (const type of [
      'panel',
      'mainCutoffSwitch',
      'alarmDevice',
      'earthquakeSensor',
      'fireExtinguisher',
      'vent',
    ] as const) {
      expect(canMountOnWall(type)).toBe(true)
    }
  })
})

describe('getSymbolFloorId', () => {
  it('duvara bağlı sembolün katı DUVARINDAN türer', () => {
    expect(getSymbolFloorId(wallSymbol(200, true), walls)).toBe(FLOOR_ID)
  })

  it('serbest sembol katı kendinde taşır', () => {
    expect(getSymbolFloorId(freeSymbol, walls)).toBe(FLOOR_ID)
  })

  it('duvarı bulunamayan sembol için undefined', () => {
    expect(getSymbolFloorId(wallSymbol(200, true, 999), walls)).toBeUndefined()
  })

  it('getSymbolsOnFloor türetilmiş kata göre süzer', () => {
    const upperSymbol = wallSymbol(100, true, 11, 22)

    expect(
      getSymbolsOnFloor([wallSymbol(200, true), upperSymbol], FLOOR_ID, walls).map((s) => s.id),
    ).toEqual([20])
  })
})

describe('getSymbolPose — duvara bağlı', () => {
  it('duvarın YÜZEYİNE oturur, eksenin üstüne değil', () => {
    // Kalınlık 20 → yarısı 10; sembol y = ±10'da olmalı, y = 0'da değil.
    const near = getSymbolPose(wallSymbol(200, false), walls, points)
    const far = getSymbolPose(wallSymbol(200, true), walls, points)

    expect(near?.position.x).toBeCloseTo(200)
    expect(Math.abs(near!.position.y)).toBeCloseTo(10)
    expect(Math.abs(far!.position.y)).toBeCloseTo(10)
    // İki yüz zıt taraflarda.
    expect(Math.sign(near!.position.y)).toBe(-Math.sign(far!.position.y))
  })

  it('açı DUVARIN açısıdır — ayrıca saklanmıyor', () => {
    expect(getSymbolPose(wallSymbol(200, true), walls, points)?.rotationDeg).toBeCloseTo(0)
  })

  it('duvarın kalınlığını taşır — gömülü cihaz o sınıra göre çizilir', () => {
    expect(getSymbolPose(wallSymbol(200, true), walls, points)?.wallThicknessCm).toBe(20)
  })

  it('dışa yön monte edilen yüzü izler — işaret duvarın içine düşmesin', () => {
    expect(getSymbolPose(wallSymbol(200, true), walls, points)?.outwardSign).toBe(1)
    expect(getSymbolPose(wallSymbol(200, false), walls, points)?.outwardSign).toBe(-1)
  })

  it('offset duvar boyunca ilerletir', () => {
    expect(getSymbolPose(wallSymbol(50, true), walls, points)?.position.x).toBeCloseTo(50)
    expect(getSymbolPose(wallSymbol(350, true), walls, points)?.position.x).toBeCloseTo(350)
  })

  it('duvarı bulunamayan sembol çizilemez', () => {
    expect(
      getSymbolPose(wallSymbol(200, true, 999), walls, points),
    ).toBeUndefined()
  })
})

describe('getSymbolPose — serbest', () => {
  it('kendi konumunu ve açısını verir', () => {
    expect(getSymbolPose(freeSymbol, walls, points)).toEqual({
      position: { x: 200, y: 200 },
      rotationDeg: 45,
      outwardSign: 1,
      wallThicknessCm: undefined,
    })
  })
})

describe('resolveSymbolAttachment', () => {
  it('duvarın üstüne bırakılan sembol duvara BAĞLANIR', () => {
    const attachment = resolveSymbolAttachment({ x: 150, y: 5 }, 'panel', context)

    expect(attachment).toMatchObject({ attachment: 'wall', wallId: 10 })
    expect(attachment.attachment === 'wall' && attachment.offsetCm).toBeCloseTo(150)
  })

  it('hangi yüze bırakıldıysa oraya monte edilir', () => {
    const above = resolveSymbolAttachment({ x: 150, y: 8 }, 'panel', context)
    const below = resolveSymbolAttachment({ x: 150, y: -8 }, 'panel', context)

    expect(above.attachment === 'wall' && above.isMountedOnFarFace).not.toBe(
      below.attachment === 'wall' && below.isMountedOnFarFace,
    )
  })

  it('duvardan UZAĞA bırakılsa bile en yakın duvarı yakalar', () => {
    // Referans uygulamada boş alana tıklanan cihaz en yakın duvara sıçrıyor.
    const attachment = resolveSymbolAttachment({ x: 150, y: 3000 }, 'panel', context)

    expect(attachment).toMatchObject({ attachment: 'wall', wallId: 10 })
    expect(attachment.attachment === 'wall' && attachment.offsetCm).toBeCloseTo(150)
  })

  it('birden çok duvarda EN YAKIN olanı seçer', () => {
    // Duvar 10 y=0'da; imleç y=5'te ona, y=... uzakta olsa da yine ona yakın.
    const attachment = resolveSymbolAttachment({ x: 380, y: 40 }, 'panel', context)

    expect(attachment.attachment === 'wall' && attachment.wallId).toBe(10)
  })

  it('katta hiç duvar yoksa serbest kalır — bağlanacak bir şey yok', () => {
    const empty = { walls: [], points: [], floorId: FLOOR_ID }

    expect(resolveSymbolAttachment({ x: 10, y: 10 }, 'panel', empty)).toMatchObject({
      attachment: 'free',
    })
  })

  it('aydınlatma duvarın üstünde bile serbest kalır', () => {
    expect(resolveSymbolAttachment({ x: 150, y: 0 }, 'lighting', context)).toMatchObject({
      attachment: 'free',
    })
  })

  it('başka kattaki duvara bağlanmaz', () => {
    const upperContext = { ...context, floorId: UPPER_FLOOR_ID }
    const attachment = resolveSymbolAttachment({ x: 150, y: 5 }, 'panel', upperContext)

    expect(attachment.attachment === 'wall' && attachment.wallId).toBe(11)
  })
})

describe('sembol duvarıyla birlikte gelir', () => {
  it('duvar taşınınca sembolün konumu da değişir — ayrıca güncelleme yok', () => {
    const symbol = wallSymbol(200, true)
    const before = getSymbolPose(symbol, walls, points)!

    // Duvarın iki köşesini de 100 cm aşağı al.
    const movedPoints = points.map((point) =>
      point.floorId === FLOOR_ID ? { ...point, y: point.y - 100 } : point,
    )
    const after = getSymbolPose(symbol, walls, movedPoints)!

    expect(after.position.y).toBeCloseTo(before.position.y - 100)
    expect(after.position.x).toBeCloseTo(before.position.x)
  })

  it('duvar döndürülünce sembolün AÇISI da döner', () => {
    const symbol = wallSymbol(200, true)
    // Duvarı dikey yap: (0,0)-(0,400).
    const rotatedPoints: Point[] = [
      { id: 1, floorId: FLOOR_ID, x: 0, y: 0 },
      { id: 2, floorId: FLOOR_ID, x: 0, y: 400 },
      ...points.slice(2),
    ]

    expect(getSymbolPose(symbol, walls, rotatedPoints)?.rotationDeg).toBeCloseTo(90)
  })
})
