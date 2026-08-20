import { describe, expect, it } from 'vitest'

import {
  FLOOR_ID,
  IN_KITCHEN,
  IN_LIVING,
  OUTSIDE,
  PLAN_POINTS,
  PLAN_ROOMS,
  PLAN_WALLS,
  WALL_IDS,
} from './validationFixture'
import {
  buildFloorRoomTopology,
  findFloorRoomAt,
  isWallOpenToOutside,
} from '../roomTopology'
import { getRoomDisplayName } from '../roomUsage'

const topology = buildFloorRoomTopology(PLAN_WALLS, PLAN_POINTS, PLAN_ROOMS, FLOOR_ID)

describe('buildFloorRoomTopology', () => {
  it('bölme duvarlı planda İKİ mahal bulur', () => {
    expect(topology.rooms).toHaveLength(2)
  })

  it('yüzleri kayıtlı odalarla eşleştirir', () => {
    const names = topology.rooms.map((entry) => getRoomDisplayName(entry.room?.usageType)).sort()
    expect(names).toEqual(['Mutfak', 'Salon'])
  })

  it('iç duvarı İKİ mahal sınırlar, dış duvarı bir', () => {
    expect(topology.faceCountByWallId.get(WALL_IDS.middle)).toBe(2)
    expect(topology.faceCountByWallId.get(WALL_IDS.bottom)).toBe(1)
  })

  it('kayıtsız yüz de mahaldir, yalnız odası boştur', () => {
    const bare = buildFloorRoomTopology(PLAN_WALLS, PLAN_POINTS, [], FLOOR_ID)
    expect(bare.rooms).toHaveLength(2)
    expect(bare.rooms.every((entry) => entry.room === undefined)).toBe(true)
  })

  it('başka kata bakınca boş döner', () => {
    expect(buildFloorRoomTopology(PLAN_WALLS, PLAN_POINTS, PLAN_ROOMS, 99).rooms).toHaveLength(0)
  })
})

describe('isWallOpenToOutside', () => {
  it('iki mahali ayıran duvar dışarıya AÇILMAZ', () => {
    expect(isWallOpenToOutside(topology, WALL_IDS.middle)).toBe(false)
  })

  it('dış kabuktaki duvar açılır', () => {
    expect(isWallOpenToOutside(topology, WALL_IDS.leftUpper)).toBe(true)
  })

  it('hiçbir mahali sınırlamayan duvar da açılır', () => {
    expect(isWallOpenToOutside(topology, 999)).toBe(true)
  })
})

describe('findFloorRoomAt', () => {
  it('noktanın düştüğü mahali verir', () => {
    expect(findFloorRoomAt(topology, IN_KITCHEN)?.room?.usageType).toBe('kitchen')
    expect(findFloorRoomAt(topology, IN_LIVING)?.room?.usageType).toBe('livingRoom')
  })

  it('plan dışında undefined döner', () => {
    expect(findFloorRoomAt(topology, OUTSIDE)).toBeUndefined()
  })
})
