import { describe, expect, it } from 'vitest'

import type { Opening, Point, Wall } from '../model'
import { findBlockingOpening, findWallSplits } from '../wallGraph'

const FLOOR_ID = 1

function makePoint(id: number, x: number, y: number, floorId = FLOOR_ID): Point {
  return { id, floorId, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, floorId = FLOOR_ID): Wall {
  return { id, floorId, p1Id, p2Id, thickness: 20, height: 280 }
}

describe('findWallSplits — T birleşimi', () => {
  // Yatay duvar (0,0)-(400,0); dikey duvarın ALT ucu tam ortasına değiyor.
  const points = [
    makePoint(1, 0, 0),
    makePoint(2, 400, 0),
    makePoint(3, 200, 0),
    makePoint(4, 200, 300),
  ]
  const horizontal = makeWall(10, 1, 2)
  const vertical = makeWall(11, 3, 4)

  it('gövdedeki duvarı, değen ucun offsetinde böler', () => {
    const splits = findWallSplits([horizontal, vertical], points, FLOOR_ID)

    expect(splits.get(10)).toEqual([
      { offsetCm: 200, position: { x: 200, y: 0 }, pointId: 3 },
    ])
  })

  it('değen duvarı BÖLMEZ — ucu zaten düğüm', () => {
    const splits = findWallSplits([horizontal, vertical], points, FLOOR_ID)

    expect(splits.has(11)).toBe(false)
  })

  it('var olan köşeyi paylaşır, yeni nokta istemez', () => {
    // pointId dolu => uygulayan taraf yeni Point üretmemeli. Aynı yerde iki
    // nokta olsaydı duvarlar kopuk kalır, mahal çevrimi kapanmazdı.
    const [split] = splits10()
    expect(split.pointId).toBe(3)
    expect(split.crossingKey).toBeUndefined()
  })

  function splits10() {
    return findWallSplits([horizontal, vertical], points, FLOOR_ID).get(10) ?? []
  }
})

describe('findWallSplits — kesişim', () => {
  // Artı işareti: yatay (-200,0)-(200,0), dikey (0,-200)-(0,200). Uçlar değmiyor.
  const points = [
    makePoint(1, -200, 0),
    makePoint(2, 200, 0),
    makePoint(3, 0, -200),
    makePoint(4, 0, 200),
  ]
  const horizontal = makeWall(10, 1, 2)
  const vertical = makeWall(11, 3, 4)

  it('İKİ duvarı da keser', () => {
    const splits = findWallSplits([horizontal, vertical], points, FLOOR_ID)

    expect(splits.get(10)).toHaveLength(1)
    expect(splits.get(11)).toHaveLength(1)
  })

  it('kesişim noktasını doğru yerde bulur', () => {
    const splits = findWallSplits([horizontal, vertical], points, FLOOR_ID)

    expect(splits.get(10)?.[0].position).toEqual({ x: 0, y: 0 })
    expect(splits.get(10)?.[0].offsetCm).toBeCloseTo(200)
    expect(splits.get(11)?.[0].offsetCm).toBeCloseTo(200)
  })

  it('iki tarafa AYNI anahtarı verir — tek Point üretilsin', () => {
    const splits = findWallSplits([horizontal, vertical], points, FLOOR_ID)
    const keyOnHorizontal = splits.get(10)?.[0].crossingKey
    const keyOnVertical = splits.get(11)?.[0].crossingKey

    expect(keyOnHorizontal).toBeDefined()
    expect(keyOnHorizontal).toBe(keyOnVertical)
  })

  it('kesişimde var olan köşe paylaşılmaz — yeni nokta gerekir', () => {
    const splits = findWallSplits([horizontal, vertical], points, FLOOR_ID)

    expect(splits.get(10)?.[0].pointId).toBeUndefined()
  })
})

describe('findWallSplits — bölmenin YAPILMADIĞI durumlar', () => {
  it('ortak köşede birleşen duvarlar bölünmez', () => {
    const points = [makePoint(1, 0, 0), makePoint(2, 400, 0), makePoint(3, 400, 300)]
    const splits = findWallSplits([makeWall(10, 1, 2), makeWall(11, 2, 3)], points, FLOOR_ID)

    expect(splits.size).toBe(0)
  })

  it('birbirine değmeyen duvarlar bölünmez', () => {
    const points = [
      makePoint(1, 0, 0),
      makePoint(2, 100, 0),
      makePoint(3, 0, 500),
      makePoint(4, 100, 500),
    ]
    const splits = findWallSplits([makeWall(10, 1, 2), makeWall(11, 3, 4)], points, FLOOR_ID)

    expect(splits.size).toBe(0)
  })

  it('paralel duvarlar bölünmez', () => {
    const points = [
      makePoint(1, 0, 0),
      makePoint(2, 400, 0),
      makePoint(3, 0, 50),
      makePoint(4, 400, 50),
    ]
    const splits = findWallSplits([makeWall(10, 1, 2), makeWall(11, 3, 4)], points, FLOOR_ID)

    expect(splits.size).toBe(0)
  })

  it('uca çok yakın değme bölme üretmez — güdük duvar oluşmasın', () => {
    // Dikey duvarın ucu, yatay duvarın p2 köşesine 0.5 cm kala değiyor.
    const points = [
      makePoint(1, 0, 0),
      makePoint(2, 400, 0),
      makePoint(3, 399.5, 0),
      makePoint(4, 399.5, 300),
    ]
    const splits = findWallSplits([makeWall(10, 1, 2), makeWall(11, 3, 4)], points, FLOOR_ID)

    expect(splits.size).toBe(0)
  })

  it('başka kattaki duvarla kesişme sayılmaz', () => {
    const points = [
      makePoint(1, -200, 0),
      makePoint(2, 200, 0),
      makePoint(3, 0, -200, 2),
      makePoint(4, 0, 200, 2),
    ]
    const splits = findWallSplits(
      [makeWall(10, 1, 2), makeWall(11, 3, 4, 2)],
      points,
      FLOOR_ID,
    )

    expect(splits.size).toBe(0)
  })
})

describe('findWallSplits — çok bölmeli duvar', () => {
  it('offsetleri artan sırada verir', () => {
    // Yatay duvarı üç dikey duvar kesiyor; sırasız tanımlandılar.
    const points = [
      makePoint(1, 0, 0),
      makePoint(2, 600, 0),
      makePoint(3, 400, -100),
      makePoint(4, 400, 100),
      makePoint(5, 100, -100),
      makePoint(6, 100, 100),
      makePoint(7, 250, -100),
      makePoint(8, 250, 100),
    ]
    const walls = [
      makeWall(10, 1, 2),
      makeWall(11, 3, 4),
      makeWall(12, 5, 6),
      makeWall(13, 7, 8),
    ]

    const offsets = (findWallSplits(walls, points, FLOOR_ID).get(10) ?? []).map(
      (split) => Math.round(split.offsetCm),
    )

    expect(offsets).toEqual([100, 250, 400])
  })

  it('aynı noktada biten iki duvar tek bölme üretir', () => {
    // İki dikey duvar aynı köşeden (200,0) çıkıyor: yatay duvar bir kez bölünmeli.
    const points = [
      makePoint(1, 0, 0),
      makePoint(2, 400, 0),
      makePoint(3, 200, 0),
      makePoint(4, 200, 300),
      makePoint(5, 200, -300),
    ]
    const walls = [makeWall(10, 1, 2), makeWall(11, 3, 4), makeWall(12, 3, 5)]

    expect(findWallSplits(walls, points, FLOOR_ID).get(10)).toHaveLength(1)
  })
})

describe('findBlockingOpening', () => {
  function makeOpening(id: number, wallId: number, offsetCm: number, widthCm: number): Opening {
    return { id, wallId, offsetCm, widthCm, type: 'door' }
  }

  // Yatay duvar (0,0)-(400,0); kapı 150-250 aralığını kaplıyor (offset 200, genişlik 100).
  const points = [makePoint(1, 0, 0), makePoint(2, 400, 0)]
  const wall = makeWall(10, 1, 2)
  const door = makeOpening(20, 10, 200, 100)

  it('kapının TAM ORTASINDAN dik geçen duvarı REDDEDER', () => {
    const candidate = { p1: { x: 200, y: -100 }, p2: { x: 200, y: 100 } }

    expect(findBlockingOpening(candidate, [wall], points, [door], FLOOR_ID)).toBe(door)
  })

  it('kapının KENARINDAN (150-250 dışında) geçen duvarı ENGELLEMEZ', () => {
    const candidate = { p1: { x: 50, y: -100 }, p2: { x: 50, y: 100 } }

    expect(findBlockingOpening(candidate, [wall], points, [door], FLOOR_ID)).toBeUndefined()
  })

  it('AYNI DOĞRULTUDA (kolineer) devam eden duvarı ENGELLEMEZ', () => {
    // Kapılı duvarın devamı: (400,0)'dan (600,0)'a, aynı eksende.
    const candidate = { p1: { x: 400, y: 0 }, p2: { x: 600, y: 0 } }

    expect(findBlockingOpening(candidate, [wall], points, [door], FLOOR_ID)).toBeUndefined()
  })

  it('açıklığı olmayan duvarı hiç kontrol etmez', () => {
    const candidate = { p1: { x: 200, y: -100 }, p2: { x: 200, y: 100 } }

    expect(findBlockingOpening(candidate, [wall], points, [], FLOOR_ID)).toBeUndefined()
  })

  it('başka kattaki açıklığı görmezden gelir', () => {
    const candidate = { p1: { x: 200, y: -100 }, p2: { x: 200, y: 100 } }
    const otherFloorWall = makeWall(10, 1, 2, 2)

    expect(
      findBlockingOpening(candidate, [otherFloorWall], points, [door], FLOOR_ID),
    ).toBeUndefined()
  })

  it('pencereyi de aynı şekilde engeller', () => {
    const window: Opening = { id: 21, wallId: 10, offsetCm: 200, widthCm: 100, type: 'window' }
    const candidate = { p1: { x: 200, y: -100 }, p2: { x: 200, y: 100 } }

    expect(findBlockingOpening(candidate, [wall], points, [window], FLOOR_ID)).toBe(window)
  })

  it('adayın BİTİŞ ucu kapının üstünde biterse de REDDEDER (T birleşimi)', () => {
    // (200,-100)'den başlayıp TAM kapının ortasında (200,0) sona eren duvar:
    // kesişmiyor, orada BİTİYOR — ama kapı boşluğunun içinde duvar duramaz.
    const candidate = { p1: { x: 200, y: -100 }, p2: { x: 200, y: 0 } }

    expect(findBlockingOpening(candidate, [wall], points, [door], FLOOR_ID)).toBe(door)
  })

  it('adayın BAŞLANGIÇ ucu kapının üstünde başlarsa da REDDEDER', () => {
    const candidate = { p1: { x: 200, y: 0 }, p2: { x: 200, y: 100 } }

    expect(findBlockingOpening(candidate, [wall], points, [door], FLOOR_ID)).toBe(door)
  })
})

