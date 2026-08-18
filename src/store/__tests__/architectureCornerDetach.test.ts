import { beforeEach, describe, expect, it } from 'vitest'

import { addWall, resetEmpty, rooms } from './roomFixture'
import { findRoomFaces } from '../../core/room'
import { useCadStore } from '../cadStore'

/**
 * Yan yana ÜÇ oda, üst kenarları aynı hizada:
 *
 *   +--------+-----+-----+   y = 300
 *   |  sol   | orta| sağ |
 *   +--------+-----+-----+   y = 0
 *   0       400   600   900
 *
 * Ortanın üst duvarı YUKARI taşındığında (kendi normali) sol ve sağ odanın üst
 * duvarları YERİNDE kalmalı: onlar yatay, hareket dikey, yani ötelemeyi boylarını
 * değiştirerek karşılayamazlar (K102). Bölme duvarları dikey, harekete paralel —
 * sadece uzarlar.
 */
function drawThreeRooms() {
  const chain = (startPointId: number, x: number, y: number) =>
    useCadStore.getState().addWall({ start: { pointId: startPointId }, end: { position: { x, y } } })!
  const join = (startPointId: number, endPointId: number) =>
    useCadStore.getState().addWall({ start: { pointId: startPointId }, end: { pointId: endPointId } })!

  const bottom = addWall(0, 0, 900, 0)!
  const right = chain(bottom.p2Id, 900, 300)
  const topRight = chain(right.p2Id, 600, 300)
  const topMiddle = chain(topRight.p2Id, 400, 300)
  const topLeft = chain(topMiddle.p2Id, 0, 300)
  join(topLeft.p2Id, bottom.p1Id)

  const dividerLeft = chain(topMiddle.p2Id, 400, 0)
  const dividerRight = chain(topRight.p2Id, 600, 0)

  return { topLeft, topMiddle, topRight, dividerLeft, dividerRight }
}

/** Normale kilitli sürüklemenin store karşılığı: paralel kaydırma (K102). */
function normalMove(wallId: number, dxCm: number, dyCm: number) {
  return useCadStore.getState().offsetWall(wallId, dxCm, dyCm)
}

/** Oda alanları küçükten büyüğe — Room kaydı alan taşımıyor, yüzden okunur. */
function sortedAreas() {
  const state = useCadStore.getState()
  return findRoomFaces(state.walls, state.points, state.activeFloorId)
    .map((face) => face.areaCm2)
    .sort((a, b) => a - b)
}

function wallEnds(wallId: number) {
  const state = useCadStore.getState()
  const wall = state.walls.find((candidate) => candidate.id === wallId)
  if (!wall) throw new Error(`duvar yok: ${wallId}`)
  const read = (pointId: number) => {
    const point = state.points.find((candidate) => candidate.id === pointId)
    if (!point) throw new Error(`nokta yok: ${pointId}`)
    return { x: point.x, y: point.y }
  }
  return { p1: read(wall.p1Id), p2: read(wall.p2Id) }
}

describe('duvar normali boyunca taşıma ve köşe ayrılması (K102)', () => {
  beforeEach(resetEmpty)

  it('kurulum: üç oda ve ortak üst hiza', () => {
    drawThreeRooms()

    expect(rooms()).toHaveLength(3)
    expect(sortedAreas()).toEqual([60_000, 90_000, 120_000])
  })

  it('ötelemeyi karşılayamayan komşu YERİNDE kalır', () => {
    const { topLeft, topMiddle, topRight } = drawThreeRooms()
    const leftBefore = wallEnds(topLeft.wallId)
    const rightBefore = wallEnds(topRight.wallId)

    normalMove(topMiddle.wallId, 0, 200)

    // Sol ve sağ odanın üst duvarı kıpırdamadı: y = 300 hizasında ve yatay.
    expect(wallEnds(topLeft.wallId)).toEqual(leftBefore)
    expect(wallEnds(topRight.wallId)).toEqual(rightBefore)
  })

  it('harekete paralel komşu köşeyi izler — uzar, kopmaz', () => {
    const { topMiddle, dividerLeft, dividerRight } = drawThreeRooms()

    normalMove(topMiddle.wallId, 0, 200)

    expect(wallEnds(topMiddle.wallId)).toEqual({
      p1: { x: 600, y: 500 },
      p2: { x: 400, y: 500 },
    })
    // Bölmenin üst ucu köşeyle birlikte yükseldi. Alt ucu (400,300)'de duruyor
    // çünkü kopan köşe bölmenin GÖVDESİNE denk geldi ve K24 orada T birleşimi
    // kurup bölmeyi ikiye ayırdı — sol odanın çevrimi böyle kapanıyor.
    expect([wallEnds(dividerLeft.wallId).p1, wallEnds(dividerLeft.wallId).p2]).toContainEqual({
      x: 400,
      y: 500,
    })
    expect([wallEnds(dividerRight.wallId).p1, wallEnds(dividerRight.wallId).p2]).toContainEqual({
      x: 600,
      y: 500,
    })
  })

  it('üç oda da ayakta kalır — yan odaların alanı DEĞİŞMEZ', () => {
    const { topMiddle } = drawThreeRooms()

    normalMove(topMiddle.wallId, 0, 200)

    expect(rooms()).toHaveLength(3)
    // Yalnız ORTA büyüdü (200x500); sol ve sağ tam olarak eski alanlarında.
    expect(sortedAreas()).toEqual([90_000, 100_000, 120_000])
  })

  it('AŞAĞI çekmek de yan odaları bozmaz — kısalan bölme yerinde kalır', () => {
    const { topLeft, topMiddle, topRight } = drawThreeRooms()
    const leftBefore = wallEnds(topLeft.wallId)
    const rightBefore = wallEnds(topRight.wallId)

    normalMove(topMiddle.wallId, 0, -100)

    // Yukarı taşımada bölme UZAYIP klonun üstünden geçiyor ve K24 T kuruyordu.
    // Aşağı çekerken bölme KISALIYOR: köşeyi izleseydi klonu havada bırakır,
    // yan odanın üst duvarı hiçbir şeye bağlanamaz ve oda düşerdi.
    expect(wallEnds(topLeft.wallId)).toEqual(leftBefore)
    expect(wallEnds(topRight.wallId)).toEqual(rightBefore)
    expect(rooms()).toHaveLength(3)
    // sol 400x300, orta 200x200, sağ 300x300
    expect(sortedAreas()).toEqual([40_000, 90_000, 120_000])
  })

  it('köşede kopan yoksa kısalan komşu YİNE de izler — kapalı dikdörtgen', () => {
    // Dış çerçevenin üst duvarını içeri çekmek yan duvarları KISALTMALI;
    // koparsaydı yukarı taşan güdük parçalar kalırdı.
    const chain = (id: number, x: number, y: number) =>
      useCadStore.getState().addWall({ start: { pointId: id }, end: { position: { x, y } } })!
    const bottom = addWall(0, 0, 400, 0)!
    const right = chain(bottom.p2Id, 400, 300)
    const top = chain(right.p2Id, 0, 300)
    useCadStore.getState().addWall({ start: { pointId: top.p2Id }, end: { pointId: bottom.p1Id } })
    const countBefore = useCadStore.getState().points.length

    normalMove(top.wallId, 0, -100)

    expect(useCadStore.getState().points.length).toBe(countBefore)
    expect(rooms()).toHaveLength(1)
    expect(sortedAreas()).toEqual([80_000])
  })

  it('kullanıcının verdiği oda ADLARI korunur — her iki yönde', () => {
    const { topMiddle } = drawThreeRooms()
    useCadStore.setState({
      rooms: useCadStore.getState().rooms.map((room, index) => ({
        ...room,
        name: ['Salon', 'Mutfak', 'Banyo'][index],
      })),
    })

    normalMove(topMiddle.wallId, 0, 200)

    // Kopma sonrası bölünen komşu duvar yüzünden odanın KAYDI iki parçayı
    // birden içeriyor ama oda yalnız birini sınırında taşıyor; tam eşitlik
    // tutmadığı için adlar siliniyordu (K102 regresyonu).
    expect(rooms().map((room) => room.name).sort()).toEqual(['Banyo', 'Mutfak', 'Salon'])
  })

  it('oda adları AŞAĞI taşımada da korunur', () => {
    const { topMiddle } = drawThreeRooms()
    useCadStore.setState({
      rooms: useCadStore.getState().rooms.map((room, index) => ({
        ...room,
        name: ['Salon', 'Mutfak', 'Banyo'][index],
      })),
    })

    normalMove(topMiddle.wallId, 0, -100)

    expect(rooms().map((room) => room.name).sort()).toEqual(['Banyo', 'Mutfak', 'Salon'])
  })
  it('oda KAYDI yüzle birebir kalır — bayat duvar listesi bırakılmaz', () => {
    const { topMiddle } = drawThreeRooms()

    normalMove(topMiddle.wallId, 0, 200)

    // Duvar bölününce `extendRoomsWithSplitPieces` iki parçayı da odanın
    // kaydına ekliyor; oda yalnız birini sınırında taşıyorsa kayıt yüzün ÜST
    // KÜMESİ olur. Oda sayısı ve sırası değişmediği için yeniden hesap yazmadan
    // çıkıyor ve bayat kayıt kalıyordu — `Room.tsx` yüzü TAM küme eşitliğiyle
    // eşleştirdiği için o oda hiç çizilmiyor, dolgusu ve etiketi kayboluyordu.
    const state = useCadStore.getState()
    const faceKeys = findRoomFaces(state.walls, state.points, state.activeFloorId)
      .map((face) => [...new Set(face.wallIds)].sort((a, b) => a - b).join())
      .sort()
    const roomKeys = rooms()
      .map((room) => [...new Set(room.wallIds)].sort((a, b) => a - b).join())
      .sort()

    expect(roomKeys).toEqual(faceKeys)
  })
  it('kopan köşe için YENİ nokta doğar', () => {
    const { topMiddle } = drawThreeRooms()
    const countBefore = useCadStore.getState().points.length

    normalMove(topMiddle.wallId, 0, 200)

    // İki köşe de koptu: iki klon.
    expect(useCadStore.getState().points.length).toBe(countBefore + 2)
  })

  it('yer değişmiyorsa kopma da olmaz', () => {
    const { topMiddle } = drawThreeRooms()
    const countBefore = useCadStore.getState().points.length

    normalMove(topMiddle.wallId, 0, 0)

    expect(useCadStore.getState().points.length).toBe(countBefore)
  })

  it('serbest duvar zinciri harekete paralelse bölünmez', () => {
    const first = addWall(0, 0, 400, 0)!
    const second = useCadStore
      .getState()
      .addWall({ start: { pointId: first.p2Id }, end: { position: { x: 400, y: 300 } } })!

    // Yatay duvarın normali dikey; ikinci duvar da dikey, yani paralel.
    normalMove(first.wallId, 0, 100)

    const ends = wallEnds(second.wallId)
    expect([ends.p1, ends.p2]).toContainEqual({ x: 400, y: 100 })
  })

  it('kopmasız yol (moveWall) eski davranışta kalır', () => {
    const { topLeft, topMiddle } = drawThreeRooms()
    const countBefore = useCadStore.getState().points.length

    useCadStore.getState().moveWall(topMiddle.wallId, 0, 200)

    expect(useCadStore.getState().points.length).toBe(countBefore)
    // Sol odanın üst duvarı köşeyle birlikte geldi — eğildi.
    const left = wallEnds(topLeft.wallId)
    expect([left.p1, left.p2]).toContainEqual({ x: 400, y: 500 })
  })

  it('tek Ctrl+Z taşımayı ve kopmayı birlikte geri alır', () => {
    const { topMiddle } = drawThreeRooms()
    const before = wallEnds(topMiddle.wallId)
    const countBefore = useCadStore.getState().points.length

    normalMove(topMiddle.wallId, 0, 200)
    useCadStore.temporal.getState().undo()

    expect(wallEnds(topMiddle.wallId)).toEqual(before)
    expect(useCadStore.getState().points.length).toBe(countBefore)
  })
})
