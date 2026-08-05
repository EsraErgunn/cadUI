import { describe, expect, it } from 'vitest'

import {
  canRemoveFloor,
  getFloorBelowId,
  getFloorById,
  getFloorIdAfterRemoval,
  getFloorIndex,
  getFloorInsertIndex,
  getNextFloorName,
  isFloorNameTaken,
  isFloorNameValid,
  moveFloorInList,
} from '../floors'
import type { Floor } from '../model'

// Dizinin başı en ALT kat.
const basement: Floor = { id: 1, name: 'Bodrum Kat' }
const ground: Floor = { id: 2, name: 'Zemin Kat' }
const first: Floor = { id: 3, name: '1. Kat' }
const floors = [basement, ground, first]

describe('getFloorIndex / getFloorById', () => {
  it('katı dizideki yerinden bulur', () => {
    expect(getFloorIndex(floors, ground.id)).toBe(1)
    expect(getFloorById(floors, ground.id)).toBe(ground)
  })

  it('olmayan kat için -1 ve undefined döner', () => {
    expect(getFloorIndex(floors, 404)).toBe(-1)
    expect(getFloorById(floors, 404)).toBeUndefined()
  })
})

describe('getFloorBelowId', () => {
  it('bir alttaki katın id"sini verir', () => {
    expect(getFloorBelowId(floors, first.id)).toBe(ground.id)
  })

  it('en alt katın altı yoktur', () => {
    expect(getFloorBelowId(floors, basement.id)).toBeUndefined()
  })

  it('tanınmayan kat için undefined döner', () => {
    expect(getFloorBelowId(floors, 404)).toBeUndefined()
  })
})

describe('canRemoveFloor', () => {
  it('son kat silinemez', () => {
    expect(canRemoveFloor([ground])).toBe(false)
    expect(canRemoveFloor(floors)).toBe(true)
  })
})

describe('getFloorIdAfterRemoval', () => {
  it('silinen katın altındaki kat aktif olur', () => {
    expect(getFloorIdAfterRemoval(floors, first.id)).toBe(ground.id)
  })

  it('en alt kat silinince üstündeki kat aktif olur', () => {
    expect(getFloorIdAfterRemoval(floors, basement.id)).toBe(ground.id)
  })

  it('tanınmayan kat için undefined döner', () => {
    expect(getFloorIdAfterRemoval(floors, 404)).toBeUndefined()
  })
})

describe('getNextFloorName', () => {
  it('en yüksek sıra numarasının bir fazlasını verir', () => {
    expect(getNextFloorName(floors)).toBe('2. Kat')
  })

  it('sıralı kat yokken 1. Kat"tan başlar', () => {
    expect(getNextFloorName([ground])).toBe('1. Kat')
  })

  it('numarayı kat SAYISINDAN türetmez — bodrum sayıyı kaydırmaz', () => {
    // Üç kat var ama sıralı olan yalnız "1. Kat"; sayıya bakılsaydı "4. Kat" çıkardı.
    expect(getNextFloorName([basement, ground, first])).toBe('2. Kat')
  })

  it('numarada boşluk varsa en yükseği esas alır', () => {
    expect(getNextFloorName([ground, { id: 9, name: '5. Kat' }])).toBe('6. Kat')
  })
})

describe('isFloorNameTaken / isFloorNameValid', () => {
  it('aynı adı yakalar, baştaki sondaki boşluğu yok sayar', () => {
    expect(isFloorNameTaken(floors, '  Zemin Kat ')).toBe(true)
    expect(isFloorNameTaken(floors, 'Çatı Katı')).toBe(false)
  })

  it('katın kendi adı çakışma sayılmaz', () => {
    expect(isFloorNameTaken(floors, 'Zemin Kat', ground.id)).toBe(false)
  })

  it('boş ad geçersizdir', () => {
    expect(isFloorNameValid('   ')).toBe(false)
    expect(isFloorNameValid('Çatı')).toBe(true)
  })
})

describe('moveFloorInList', () => {
  it('katı bir sıra yukarı taşır', () => {
    expect(moveFloorInList(floors, ground.id, 'up').map((floor) => floor.id)).toEqual([1, 3, 2])
  })

  it('katı bir sıra aşağı taşır', () => {
    expect(moveFloorInList(floors, ground.id, 'down').map((floor) => floor.id)).toEqual([2, 1, 3])
  })

  it('sınırda AYNI dizi referansını döndürür — boş geri alma adımı üretilmesin', () => {
    expect(moveFloorInList(floors, first.id, 'up')).toBe(floors)
    expect(moveFloorInList(floors, basement.id, 'down')).toBe(floors)
    expect(moveFloorInList(floors, 404, 'up')).toBe(floors)
  })
})

describe('getFloorInsertIndex', () => {
  it('yeni kat en üste eklenir', () => {
    expect(getFloorInsertIndex(floors)).toBe(floors.length)
  })
})
