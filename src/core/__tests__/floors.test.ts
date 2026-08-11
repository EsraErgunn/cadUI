import { describe, expect, it } from 'vitest'

import {
  MAX_BASEMENT_COUNT,
  MAX_FLOOR_COUNT,
  canAddBasement,
  canAddFloor,
  canRemoveFloor,
  createGroundFloor,
  getBasementCount,
  getNextBasementName,
  isFloorHeightValid,
  reorderFloorInList,
  getFloorBelowId,
  getFloorById,
  getFloorIdAfterRemoval,
  getFloorIndex,
  getFloorIdInDirection,
  getFloorInsertIndex,
  getNextFloorName,
  isFloorNameTaken,
  isFloorNameValid,
  moveFloorInList,
} from '../floors'
import type { Floor } from '../model'

// Dizinin başı en ALT kat.
function makeFloor(id: number, name: string, isBasement = false, heightCm = 300): Floor {
  return { id, name, heightCm, isBasement }
}

const basement: Floor = makeFloor(1, 'Bodrum Kat', true, 280)
const ground: Floor = makeFloor(2, 'Zemin Kat', false, 320)
const first: Floor = makeFloor(3, '1. Kat', false, 320)
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
    expect(getNextFloorName([ground, makeFloor(9, '5. Kat')])).toBe('6. Kat')
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
    // Zemin kat değil 1. Kat taşınıyor: zeminin altı bodrum, o yön kısıtlı.
    expect(moveFloorInList(floors, first.id, 'down').map((floor) => floor.id)).toEqual([1, 3, 2])
  })

  it('sınırda AYNI dizi referansını döndürür — boş geri alma adımı üretilmesin', () => {
    expect(moveFloorInList(floors, first.id, 'up')).toBe(floors)
    expect(moveFloorInList(floors, basement.id, 'down')).toBe(floors)
    expect(moveFloorInList(floors, 404, 'up')).toBe(floors)
  })

  it('bodrum/normal ayrımını bozan komşu takasını reddeder', () => {
    expect(moveFloorInList(floors, basement.id, 'up')).toBe(floors)
    expect(moveFloorInList(floors, ground.id, 'down')).toBe(floors)
  })
})

describe('getFloorIdInDirection', () => {
  it('bir üstteki ve bir alttaki katı verir', () => {
    expect(getFloorIdInDirection(floors, ground.id, 'up')).toBe(first.id)
    expect(getFloorIdInDirection(floors, ground.id, 'down')).toBe(basement.id)
  })

  it('uçta undefined döner — geçiş DÖNGÜSEL değil', () => {
    expect(getFloorIdInDirection(floors, first.id, 'up')).toBeUndefined()
    expect(getFloorIdInDirection(floors, basement.id, 'down')).toBeUndefined()
  })

  it('tanınmayan kat için undefined döner', () => {
    expect(getFloorIdInDirection(floors, 404, 'up')).toBeUndefined()
  })
})

describe('getFloorInsertIndex', () => {
  it('yeni kat en üste, bodrum en alta eklenir', () => {
    expect(getFloorInsertIndex(floors)).toBe(floors.length)
    expect(getFloorInsertIndex(floors, true)).toBe(0)
  })
})

describe('createGroundFloor', () => {
  it('her çağrıda TAZE nesne verir — iki proje aynı katı paylaşmasın', () => {
    expect(createGroundFloor()).not.toBe(createGroundFloor())
    expect(createGroundFloor()).toEqual({
      id: 1,
      name: 'Zemin Kat',
      heightCm: 300,
      isBasement: false,
    })
  })
})

describe('isFloorHeightValid', () => {
  it('200–600 cm dışını reddeder', () => {
    expect(isFloorHeightValid(200)).toBe(true)
    expect(isFloorHeightValid(600)).toBe(true)
    expect(isFloorHeightValid(199)).toBe(false)
    expect(isFloorHeightValid(601)).toBe(false)
    expect(isFloorHeightValid(Number.NaN)).toBe(false)
  })
})

describe('getBasementCount / canAddFloor / canAddBasement', () => {
  it('bodrumları sayar', () => {
    expect(getBasementCount(floors)).toBe(1)
    expect(getBasementCount([ground])).toBe(0)
  })

  it('kat tavanı bodrumları DA kapsar', () => {
    const full = Array.from({ length: MAX_FLOOR_COUNT }, (_, index) =>
      makeFloor(index + 1, `${index + 1}. Kat`),
    )

    expect(canAddFloor(full)).toBe(false)
    expect(canAddBasement(full)).toBe(false)
  })

  it('bodrum kendi tavanına ayrıca tabidir', () => {
    const basements = Array.from({ length: MAX_BASEMENT_COUNT }, (_, index) =>
      makeFloor(index + 1, `${index + 2}. Bodrum Kat`, true),
    )
    const withGround = [...basements, ground]

    // Proje tavanı dolmadı ama bodrum tavanı doldu.
    expect(canAddFloor(withGround)).toBe(true)
    expect(canAddBasement(withGround)).toBe(false)
  })
})

describe('getNextBasementName', () => {
  it('ilk bodrum numarasızdır, sonrakiler numaralanır', () => {
    expect(getNextBasementName([ground])).toBe('Bodrum Kat')
    expect(getNextBasementName(floors)).toBe('2. Bodrum Kat')
    expect(getNextBasementName([makeFloor(9, '2. Bodrum Kat', true), basement, ground])).toBe(
      '3. Bodrum Kat',
    )
  })
})

describe('reorderFloorInList', () => {
  it('katı verilen indekse taşır', () => {
    expect(reorderFloorInList(floors, first.id, 1).map((floor) => floor.id)).toEqual([1, 3, 2])
  })

  it('bodrumu zemin katın ÜZERİNE taşımayı reddeder', () => {
    expect(reorderFloorInList(floors, basement.id, 2)).toBe(floors)
  })

  it('normal katı bodrumun ALTINA taşımayı da reddeder — ayrım iki yönlü', () => {
    expect(reorderFloorInList(floors, ground.id, 0)).toBe(floors)
  })

  it('değişiklik yoksa AYNI dizi referansını döndürür', () => {
    expect(reorderFloorInList(floors, first.id, 2)).toBe(floors)
    expect(reorderFloorInList(floors, first.id, 9)).toBe(floors)
    expect(reorderFloorInList(floors, 404, 0)).toBe(floors)
  })
})
