import { describe, expect, it } from 'vitest'

import {
  formatElevationM,
  formatLengthM,
  getBuildingHeightCm,
  getFloorElevationCm,
  getFloorElevationsCm,
  getGroundFloorIndex,
} from '../floorElevation'
import type { Floor } from '../model'

function makeFloor(id: number, name: string, heightCm: number, isBasement = false): Floor {
  return { id, name, heightCm, isBasement }
}

// Belgedeki örnek bina (Görsel 2): dizinin başı en ALT kat.
const basement = makeFloor(1, 'Bodrum Kat', 280, true)
const ground = makeFloor(2, 'Zemin Kat', 320)
const first = makeFloor(3, '1. Kat', 320)
const second = makeFloor(4, '2. Kat', 320)
const third = makeFloor(5, '3. Kat', 320)
const roof = makeFloor(6, 'Çatı', 280)
const building = [basement, ground, first, second, third, roof]

describe('getGroundFloorIndex', () => {
  it('ilk bodrum olmayan katı verir', () => {
    expect(getGroundFloorIndex(building)).toBe(1)
    expect(getGroundFloorIndex([ground, first])).toBe(0)
  })

  it('yalnız bodrum kalırsa referans dizinin ÜSTÜ olur — hiçbir bodrum ±0,00 görünmez', () => {
    const onlyBasements = [makeFloor(1, '2. Bodrum Kat', 280, true), basement]

    expect(getGroundFloorIndex(onlyBasements)).toBe(2)
    expect(getFloorElevationsCm(onlyBasements)).toEqual([-560, -280])
  })
})

describe('getFloorElevationsCm', () => {
  it('zemin katın tabanı ±0, üstü artı, bodrum eksi (KK-3)', () => {
    expect(getFloorElevationsCm(building)).toEqual([-280, 0, 320, 640, 960, 1280])
  })

  it('bir katın yüksekliği değişince ÜSTÜNDEKİ tüm kotlar kayar (KK-4)', () => {
    const taller = building.map((floor) =>
      floor.id === ground.id ? { ...floor, heightCm: 400 } : floor,
    )

    // Bodrum etkilenmez (zemin katın altında), üsttekilerin hepsi 80 cm yükselir.
    expect(getFloorElevationsCm(taller)).toEqual([-280, 0, 400, 720, 1040, 1360])
  })

  it('sıra değişince kotlar yeniden hesaplanır (KK-6)', () => {
    const swapped = [basement, ground, second, first, third, roof]

    // Kot kata değil SIRAYA bağlı: 2. Kat artık altta, +3,20'yi o alır.
    expect(getFloorElevationCm(swapped, second.id)).toBe(320)
    expect(getFloorElevationCm(swapped, first.id)).toBe(640)
  })

  it('boş listede boş dizi verir', () => {
    expect(getFloorElevationsCm([])).toEqual([])
  })
})

describe('getFloorElevationCm', () => {
  it('tanınmayan kat için undefined döner', () => {
    expect(getFloorElevationCm(building, 404)).toBeUndefined()
  })
})

describe('getBuildingHeightCm', () => {
  it('bodrumları SAYMAZ (madde 2)', () => {
    // 320 * 4 + 280 = 1560; bodrumun 280"i girmez.
    expect(getBuildingHeightCm(building)).toBe(1560)
  })

  it('yalnız bodrum varsa bina yüksekliği sıfırdır', () => {
    expect(getBuildingHeightCm([basement])).toBe(0)
  })
})

describe('formatElevationM', () => {
  it('işaret ve iki ondalıkla, tr-TR virgülüyle yazar', () => {
    expect(formatElevationM(320)).toBe('+3,20')
    expect(formatElevationM(-280)).toBe('−2,80')
    expect(formatElevationM(1280)).toBe('+12,80')
  })

  it('sıfır referans düzlemi ± ile ayrılır — tire ya da işaretsiz değil', () => {
    expect(formatElevationM(0)).toBe('±0,00')
  })
})

describe('formatLengthM', () => {
  it('bina yüksekliği işaretsizdir', () => {
    expect(formatLengthM(1560)).toBe('15,60')
  })
})
