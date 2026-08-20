import { describe, expect, it } from 'vitest'

import {
  FLOOR_ID,
  makeDoor,
  makeWindow,
  PLAN_POINTS,
  PLAN_ROOMS,
  PLAN_WALLS,
  WALL_IDS,
} from './validationFixture'
import type { Opening } from '../model'
import { findRoomsWithoutDoor } from '../roomAccess'
import { buildFloorRoomTopology } from '../roomTopology'
import { getRoomDisplayName } from '../roomUsage'

const topology = buildFloorRoomTopology(PLAN_WALLS, PLAN_POINTS, PLAN_ROOMS, FLOOR_ID)

function doorlessRooms(openings: readonly Opening[]): string[] {
  return findRoomsWithoutDoor(topology, PLAN_WALLS, openings)
    .map((entry) => getRoomDisplayName(entry.room?.usageType))
    .sort()
}

describe('findRoomsWithoutDoor', () => {
  it('her mahalin kapısı varsa hata yok', () => {
    const openings = [makeDoor(30, WALL_IDS.leftLower), makeDoor(31, WALL_IDS.rightUpper)]
    expect(doorlessRooms(openings)).toEqual([])
  })

  it('İÇ kapı iki mahali birden karşılar — ikisinin de sınırında', () => {
    // Sıkı okumada (dışarıdan erişim) ikisi de hatalıydı; gevşek okumada
    // ikisinin de kapısı var (kullanıcı kararı).
    expect(doorlessRooms([makeDoor(31, WALL_IDS.middle)])).toEqual([])
  })

  it('kapısı olmayan mahali bildirir', () => {
    expect(doorlessRooms([makeDoor(30, WALL_IDS.leftLower)])).toEqual(['Salon'])
  })

  it('pencere kapı yerine geçmez', () => {
    const openings = [makeWindow(32, WALL_IDS.leftLower), makeDoor(31, WALL_IDS.rightUpper)]
    expect(doorlessRooms(openings)).toEqual(['Mutfak'])
  })

  it('hiç açıklık yoksa bütün mahaller kapısız', () => {
    expect(doorlessRooms([])).toEqual(['Mutfak', 'Salon'])
  })

  it('başka kattaki duvarın kapısı bu mahali kurtarmaz', () => {
    const otherFloorWalls = PLAN_WALLS.map((wall) =>
      wall.id === WALL_IDS.leftLower ? { ...wall, floorId: 99 } : wall,
    )
    const openings = [makeDoor(30, WALL_IDS.leftLower), makeDoor(31, WALL_IDS.rightUpper)]

    expect(
      findRoomsWithoutDoor(topology, otherFloorWalls, openings).map((entry) =>
        getRoomDisplayName(entry.room?.usageType),
      ),
    ).toEqual(['Mutfak'])
  })

  it('mahalsiz katta hata üretmez', () => {
    const empty = buildFloorRoomTopology([], [], [], FLOOR_ID)
    expect(findRoomsWithoutDoor(empty, [], [])).toEqual([])
  })
})
