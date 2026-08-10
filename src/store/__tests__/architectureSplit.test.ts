import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID } from '../../core/model'
import { useCadStore } from '../cadStore'

/** Boş sahne: bu testler duvarları kendileri kuruyor. */
function resetEmpty() {
  useCadStore.setState({
    points: [],
    walls: [],
    openings: [],
    nextUniqueId: 2,
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
}

function addWall(x1: number, y1: number, x2: number, y2: number) {
  return useCadStore
    .getState()
    .addWall({ start: { position: { x: x1, y: y1 } }, end: { position: { x: x2, y: y2 } } })
}

function wallsOnFloor() {
  return useCadStore.getState().walls.filter((wall) => wall.floorId === DEFAULT_FLOOR_ID)
}

function pointAt(pointId: number) {
  const point = useCadStore.getState().points.find((candidate) => candidate.id === pointId)
  return point ? { x: point.x, y: point.y } : undefined
}

/** Bir duvarın uç koordinatları — id'ler bölünmeyle değiştiği için konumla sınıyoruz. */
function wallEnds(wallId: number) {
  const wall = useCadStore.getState().walls.find((candidate) => candidate.id === wallId)
  if (!wall) return undefined
  return { p1: pointAt(wall.p1Id), p2: pointAt(wall.p2Id) }
}

describe('kesişimde düğüm — T birleşimi', () => {
  beforeEach(resetEmpty)

  it('gövdeye değen köşe duvarı İKİYE böler', () => {
    const horizontal = addWall(0, 0, 400, 0)!
    expect(wallsOnFloor()).toHaveLength(1)

    // Dikey duvarın alt ucu yatay duvarın tam ortasında.
    addWall(200, 0, 200, 300)

    // 1 yatay -> 2 parça, + 1 dikey = 3
    expect(wallsOnFloor()).toHaveLength(3)
    // İlk parça özgün id'yi korur ve ortada biter.
    expect(wallEnds(horizontal.wallId)).toEqual({ p1: { x: 0, y: 0 }, p2: { x: 200, y: 0 } })
  })

  it('yeni nokta ÜRETMEZ — değen ucun köşesini paylaşır', () => {
    addWall(0, 0, 400, 0)
    const pointsBefore = useCadStore.getState().points.length

    addWall(200, 0, 200, 300)

    // Dikey duvar 2 yeni nokta getirdi (alt uç mevcut değildi, üst uç yeni).
    // Bölme bunlara EK bir nokta eklememeli.
    expect(useCadStore.getState().points.length).toBe(pointsBefore + 2)
  })

  it('parçalar uç uca bağlı kalır — mahal çevrimi kapanabilsin', () => {
    const horizontal = addWall(0, 0, 400, 0)!
    addWall(200, 0, 200, 300)

    const pieces = wallsOnFloor().filter((wall) => wall.id !== horizontal.wallId)
    const first = useCadStore.getState().walls.find((w) => w.id === horizontal.wallId)!
    // İkinci parçanın p1'i, birinci parçanın p2'si ile AYNI id olmalı.
    expect(pieces.some((piece) => piece.p1Id === first.p2Id)).toBe(true)
  })
})

describe('kesişimde düğüm — çaprazlama', () => {
  beforeEach(resetEmpty)

  it('birbirini kesen iki duvar DÖRT parçaya ayrılır', () => {
    addWall(-200, 0, 200, 0)
    addWall(0, -200, 0, 200)

    expect(wallsOnFloor()).toHaveLength(4)
  })

  it('kesişimde TEK düğüm üretir', () => {
    addWall(-200, 0, 200, 0)
    addWall(0, -200, 0, 200)

    const atOrigin = useCadStore
      .getState()
      .points.filter((point) => Math.abs(point.x) < 1e-6 && Math.abs(point.y) < 1e-6)

    expect(atOrigin).toHaveLength(1)
  })

  it('dört parça da ortak düğüme bağlanır', () => {
    addWall(-200, 0, 200, 0)
    addWall(0, -200, 0, 200)

    const centre = useCadStore
      .getState()
      .points.find((point) => Math.abs(point.x) < 1e-6 && Math.abs(point.y) < 1e-6)!
    const touching = wallsOnFloor().filter(
      (wall) => wall.p1Id === centre.id || wall.p2Id === centre.id,
    )

    expect(touching).toHaveLength(4)
  })
})

describe('kesişimde düğüm — açıklıklar', () => {
  beforeEach(resetEmpty)

  it('açıklık kendisini içeren parçaya taşınır, offset yeniden hesaplanır', () => {
    const horizontal = addWall(0, 0, 400, 0)!
    // Kapı 300'de: bölme 200'de olacak, yani kapı İKİNCİ parçaya düşmeli.
    const doorId = useCadStore.getState().addOpening({
      wallId: horizontal.wallId,
      offsetCm: 300,
      widthCm: 80,
      type: 'door',
    })!

    addWall(200, 0, 200, 300)

    const door = useCadStore.getState().openings.find((opening) => opening.id === doorId)!
    expect(door.wallId).not.toBe(horizontal.wallId)
    // 300 - 200 = 100, yeni parçanın başından itibaren.
    expect(door.offsetCm).toBeCloseTo(100)
  })

  it('açıklığın İÇİNE düşen bölme REDDEDİLİR — açıklık kaybolmaz (TAŞIMADA)', () => {
    // Yeni ÇİZİLEN bir duvar artık appendWall seviyesinde reddediliyor (K35);
    // bu senaryo yalnız TAŞIMADA (moveWall) hâlâ mümkün — dikey duvar UZAK bir
    // yerde çizilip SONRA kapının üstüne taşınıyor, appendWall hiç araya girmiyor.
    const horizontal = addWall(0, 0, 400, 0)!
    // Kapı 200 ± 50 → 150..250 aralığını kaplıyor; bölme tam ortasına gelecek.
    const doorId = useCadStore.getState().addOpening({
      wallId: horizontal.wallId,
      offsetCm: 200,
      widthCm: 100,
      type: 'door',
    })!
    const vertical = addWall(200, 300, 200, 700)!

    // Alt ucu (200,300) → (200,0): tam kapının ortasına T birleşimi oluşturur.
    useCadStore.getState().moveWall(vertical.wallId, 0, -300)

    // Yatay duvar BÖLÜNMEDİ: 1 yatay + 1 dikey.
    expect(wallsOnFloor()).toHaveLength(2)
    const door = useCadStore.getState().openings.find((opening) => opening.id === doorId)
    expect(door).toBeDefined()
    expect(door?.offsetCm).toBe(200)
  })
})

describe('kesişimde düğüm — geri alma', () => {
  beforeEach(resetEmpty)

  it('bölme, onu tetikleyen çizimle TEK adımda geri alınır', () => {
    addWall(0, 0, 400, 0)
    useCadStore.temporal.getState().clear()

    addWall(200, 0, 200, 300)
    expect(wallsOnFloor()).toHaveLength(3)

    useCadStore.temporal.getState().undo()

    // Tek Ctrl+Z hem dikey duvarı hem bölmeyi geri almalı.
    expect(wallsOnFloor()).toHaveLength(1)
  })
})

describe('kolineer örtüşme — bilinen sınır artık kapalı', () => {
  beforeEach(resetEmpty)

  it('kısmen çakışan iki kolineer duvar TEK duvara iner', () => {
    // Bitişik iki oda farklı boyda çizildiğinde tam bu senaryo oluşur: iki
    // duvar aynı doğru üzerinde ama yalnız bir aralıkta örtüşüyor.
    addWall(0, 0, 0, 500)
    addWall(0, 100, 0, 400)

    const overlapping = useCadStore
      .getState()
      .walls.filter(
        (wall) =>
          pointAt(wall.p1Id)?.y === 100 && pointAt(wall.p2Id)?.y === 400,
      )
    expect(overlapping).toHaveLength(1)
  })

  it('bir duvar öbürünün TAMAMEN içinde kalırsa da tek duvara iner', () => {
    addWall(0, 0, 0, 500)
    addWall(0, 100, 0, 200)

    const overlapping = useCadStore
      .getState()
      .walls.filter(
        (wall) =>
          pointAt(wall.p1Id)?.y === 100 && pointAt(wall.p2Id)?.y === 200,
      )
    expect(overlapping).toHaveLength(1)
  })

  it('kazanan İLK ÇİZİLENİN kalınlığını korur', () => {
    useCadStore
      .getState()
      .addWall({ start: { position: { x: 0, y: 0 } }, end: { position: { x: 0, y: 500 } }, thickness: 30 })
    useCadStore
      .getState()
      .addWall({ start: { position: { x: 0, y: 100 } }, end: { position: { x: 0, y: 400 } }, thickness: 15 })

    const overlapping = useCadStore
      .getState()
      .walls.find((wall) => pointAt(wall.p1Id)?.y === 100 && pointAt(wall.p2Id)?.y === 400)!
    expect(overlapping.thickness).toBe(30)
  })

  it('kaybedenin üstündeki açıklık kazanana taşınır', () => {
    // Kapı eklendiği anda henüz çakışma yok (B ayrı bir yerde) — çakışma
    // ancak B SONRADAN A'nın üstüne taşınınca oluşur, o zaman B kaybeder.
    addWall(0, 0, 0, 500)
    const b = addWall(100, 100, 100, 400)!
    const doorId = useCadStore.getState().addOpening({
      wallId: b.wallId,
      offsetCm: 150,
      widthCm: 40,
      type: 'door',
    })!

    useCadStore.getState().moveWall(b.wallId, -100, 0)

    const door = useCadStore.getState().openings.find((opening) => opening.id === doorId)!
    const wall = useCadStore.getState().walls.find((candidate) => candidate.id === door.wallId)!
    expect(pointAt(wall.p1Id)?.y).toBe(100)
    expect(pointAt(wall.p2Id)?.y).toBe(400)
    // Yön aynı kaldığı için offset DEĞİŞMEDEN taşınır.
    expect(door.offsetCm).toBeCloseTo(150)
  })

})

describe('kesişimde düğüm — taşımada', () => {
  beforeEach(resetEmpty)

  it('duvarı başka bir duvarın üstüne taşımak düğüm açar', () => {
    addWall(-200, 0, 200, 0)
    // Uzakta, kesişmeyen dikey duvar.
    const vertical = addWall(0, 300, 0, 700)!
    expect(wallsOnFloor()).toHaveLength(2)

    // 500 cm aşağı: artık yatay duvarı kesiyor.
    useCadStore.getState().moveWall(vertical.wallId, 0, -500)

    expect(wallsOnFloor()).toHaveLength(4)
  })
})
