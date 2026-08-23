import { describe, expect, it } from 'vitest'

import { FLOOR_ID, PLAN_POINTS, PLAN_ROOMS, PLAN_WALLS, ROOM_IDS } from './validationFixture'
import type { Room } from '../model'
import {
  getFloorRoomStops,
  getRoomDefinitionQueue,
  getRoomFocusBounds,
} from '../roomDefinition'

/** Fikstürdeki iki mahalin tipini kaldırır — kip yalnız TANIMSIZ olanları gezer. */
function withoutUsageTypes(...roomIds: number[]): Room[] {
  return PLAN_ROOMS.map((room) =>
    roomIds.includes(room.id) ? { id: room.id, wallIds: room.wallIds } : room,
  )
}

function queueIds(rooms: readonly Room[]): number[] {
  return getRoomDefinitionQueue(rooms, PLAN_WALLS, PLAN_POINTS, FLOOR_ID).map((stop) => stop.roomId)
}

describe('getRoomDefinitionQueue', () => {
  it('tipi seçilmiş mahali kuyruğa almaz', () => {
    expect(queueIds(PLAN_ROOMS)).toEqual([])
  })

  it('yalnız tanımsız mahali alır', () => {
    expect(queueIds(withoutUsageTypes(ROOM_IDS.kitchen))).toEqual([ROOM_IDS.kitchen])
  })

  it('okuma sırasıyla gezer: ÜSTTEKİ mahal önce', () => {
    // Fikstürde salon üstte (y 300..600), mutfak altta (y 0..300). Kuyruk
    // id sırasını izleseydi mutfak (20) önce gelirdi.
    expect(queueIds(withoutUsageTypes(ROOM_IDS.kitchen, ROOM_IDS.living))).toEqual([
      ROOM_IDS.living,
      ROOM_IDS.kitchen,
    ])
  })

  it('başka kattan mahal gelmez', () => {
    expect(queueIds(withoutUsageTypes(ROOM_IDS.kitchen, ROOM_IDS.living))).not.toEqual([])
    expect(
      getRoomDefinitionQueue(withoutUsageTypes(ROOM_IDS.kitchen), PLAN_WALLS, PLAN_POINTS, 99),
    ).toEqual([])
  })

  it('durak mahalin çevrimini ve alanını taşır', () => {
    const [stop] = getRoomDefinitionQueue(
      withoutUsageTypes(ROOM_IDS.kitchen),
      PLAN_WALLS,
      PLAN_POINTS,
      FLOOR_ID,
    )

    expect(stop.corners).toHaveLength(4)
    expect(stop.areaCm2).toBeCloseTo(400 * 300)
  })
})

describe('getRoomFocusBounds', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 400, y: 0 },
    { x: 400, y: 300 },
    { x: 0, y: 300 },
  ]

  it('mahalin çevresine pay bırakır', () => {
    const bounds = getRoomFocusBounds(square)

    expect(bounds.minXCm).toBeLessThan(0)
    expect(bounds.maxXCm).toBeGreaterThan(400)
    expect(bounds.minYCm).toBeLessThan(0)
    expect(bounds.maxYCm).toBeGreaterThan(300)
  })

  it('pay ORANSAL — büyük mahalde de görünür kalır', () => {
    const big = square.map((corner) => ({ x: corner.x * 10, y: corner.y * 10 }))
    const smallMargin = -getRoomFocusBounds(square).minXCm
    const bigMargin = -getRoomFocusBounds(big).minXCm

    expect(bigMargin).toBeGreaterThan(smallMargin)
  })

  it('çok küçük mahalde de asgari pay var — kamera duvara yapışmaz', () => {
    const tiny = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ]

    expect(getRoomFocusBounds(tiny).minXCm).toBeLessThanOrEqual(-60)
  })
})

describe('getFloorRoomStops', () => {
  it('TANIMLI mahali de verir — kip geri gidince kamera oraya da gitmeli', () => {
    const stops = getFloorRoomStops(
      withoutUsageTypes(ROOM_IDS.kitchen),
      PLAN_WALLS,
      PLAN_POINTS,
      FLOOR_ID,
    )

    expect(stops.map((stop) => stop.roomId)).toEqual([ROOM_IDS.living, ROOM_IDS.kitchen])
    expect(stops.map((stop) => stop.isDefined)).toEqual([true, false])
  })
})
