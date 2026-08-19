import { describe, expect, it } from 'vitest'

import type { Floor } from '../model'
import { getFloorLevels } from '../pdf/floorLevels'

function makeFloor(id: number, name: string, heightCm: number, isBasement = false): Floor {
  return { id, name, heightCm, isBasement }
}

// Dizide index 0 EN ALT kat.
const FLOORS: Floor[] = [makeFloor(1, 'Zemin Kat', 300), makeFloor(2, '1. Kat', 300)]

describe('getFloorLevels', () => {
  it('zemin katın tabanını 0 kotuna oturtur ve üst katları yukarı yığar', () => {
    const levels = getFloorLevels(FLOORS)

    expect(levels.map((level) => [level.floor.name, level.baseCm, level.topCm])).toEqual([
      ['Zemin Kat', 0, 300],
      ['1. Kat', 300, 600],
    ])
  })

  it('bodrumu zemin çizgisinin ALTINA indirir, zemin katın kotunu kaydırmaz', () => {
    const levels = getFloorLevels([
      makeFloor(1, '2. Bodrum', 260, true),
      makeFloor(2, '1. Bodrum', 280, true),
      ...FLOORS,
    ])

    const byName = new Map(levels.map((level) => [level.floor.name, level]))
    // Bodrumlu binada da zemin kat 0'dan başlar; "iki bodrum kadar yukarıda" değil.
    expect(byName.get('Zemin Kat')?.baseCm).toBe(0)
    // Zemine yapışan, dizideki İLK bodrum değil en ÜSTTEKİ bodrum.
    expect(byName.get('1. Bodrum')?.topCm).toBe(0)
    expect(byName.get('1. Bodrum')?.baseCm).toBe(-280)
    expect(byName.get('2. Bodrum')?.baseCm).toBe(-540)
  })

  it('kat yoksa boş liste döner', () => {
    expect(getFloorLevels([])).toEqual([])
  })
})
