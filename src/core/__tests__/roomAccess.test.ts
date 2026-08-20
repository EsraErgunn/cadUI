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
import { findRoomsWithoutDoorAccess } from '../roomAccess'
import { buildFloorRoomTopology } from '../roomTopology'

const topology = buildFloorRoomTopology(PLAN_WALLS, PLAN_POINTS, PLAN_ROOMS, FLOOR_ID)

function unreachableNames(openings: readonly Opening[]): string[] {
  return findRoomsWithoutDoorAccess(topology, PLAN_WALLS, openings)
    .map((entry) => entry.room?.name ?? '?')
    .sort()
}

describe('findRoomsWithoutDoorAccess', () => {
  it('dış kapı + iç kapı varken her mahale erişilir', () => {
    const openings = [makeDoor(30, WALL_IDS.leftLower), makeDoor(31, WALL_IDS.middle)]
    expect(unreachableNames(openings)).toEqual([])
  })

  it('dış kapı yoksa iç kapı tek başına yetmez', () => {
    expect(unreachableNames([makeDoor(31, WALL_IDS.middle)])).toEqual(['Mutfak', 'Salon'])
  })

  it('yalnız dış kapı varken kapısız komşu mahal erişilemez', () => {
    expect(unreachableNames([makeDoor(30, WALL_IDS.leftLower)])).toEqual(['Salon'])
  })

  it('pencere kapı yerine geçmez', () => {
    const openings = [makeWindow(32, WALL_IDS.leftLower), makeDoor(31, WALL_IDS.middle)]
    expect(unreachableNames(openings)).toEqual(['Mutfak', 'Salon'])
  })

  it('hiç açıklık yoksa bütün mahaller erişilemez', () => {
    expect(unreachableNames([])).toEqual(['Mutfak', 'Salon'])
  })

  it('başka kattaki duvarın kapısı bu kata erişim vermez', () => {
    const otherFloorWalls = PLAN_WALLS.map((wall) =>
      wall.id === WALL_IDS.leftLower ? { ...wall, floorId: 99 } : wall,
    )
    const openings = [makeDoor(30, WALL_IDS.leftLower), makeDoor(31, WALL_IDS.middle)]
    expect(
      findRoomsWithoutDoorAccess(topology, otherFloorWalls, openings).map((entry) => entry.room?.name),
    ).toEqual(['Mutfak', 'Salon'])
  })

  it('mahalsiz katta hata üretmez', () => {
    const empty = buildFloorRoomTopology([], [], [], FLOOR_ID)
    expect(findRoomsWithoutDoorAccess(empty, [], [])).toEqual([])
  })
})
