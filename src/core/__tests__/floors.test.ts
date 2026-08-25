import { describe, expect, it } from 'vitest'

import {
  MAX_BASEMENT_COUNT,
  MAX_FLOOR_COUNT,
  canAddBasement,
  canAddFloor,
  canAssignFloorType,
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
  getFloorPlanTitle,
  getFloorShortLabels,
  getFloorType,
  getPositionalFloorNames,
  getNextFloorName,
  isFloorNameTaken,
  isFloorNameValid,
  moveFloorInList,
  withFloorType,
  withPositionalNames,
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

describe('getFloorPlanTitle — PDF kat planı anteti', () => {
  it('kat adına "Planı" ekler', () => {
    expect(getFloorPlanTitle(ground)).toBe('Zemin Kat Planı')
    expect(getFloorPlanTitle(basement)).toBe('Bodrum Kat Planı')
    expect(getFloorPlanTitle(first)).toBe('1. Kat Planı')
  })

  it('kat tipi adını da olduğu gibi taşır', () => {
    expect(getFloorPlanTitle({ id: 9, name: 'Dubleks', heightCm: 300, isBasement: false })).toBe(
      'Dubleks Planı',
    )
  })
})

describe('getFloorShortLabels — kat şeridi etiketleri (K166)', () => {
  const at = (id: number, name: string, isBasement = false): Floor => ({
    id,
    name,
    heightCm: 300,
    isBasement,
  })

  it('zemin Z, üstü sırayla sayı', () => {
    expect(
      getFloorShortLabels([at(1, 'Zemin Kat'), at(2, '1. Kat'), at(3, '2. Kat')]),
    ).toEqual(['Z', '1', '2'])
  })

  it('tek bodrum sade B', () => {
    expect(getFloorShortLabels([at(1, 'Bodrum Kat', true), at(2, 'Zemin Kat')])).toEqual([
      'B',
      'Z',
    ])
  })

  it('çok bodrumda B1 zeminin hemen altı, aşağı indikçe artar', () => {
    expect(
      getFloorShortLabels([
        at(1, '3. Bodrum', true),
        at(2, '2. Bodrum', true),
        at(3, 'Bodrum Kat', true),
        at(4, 'Zemin Kat'),
      ]),
    ).toEqual(['B3', 'B2', 'B1', 'Z'])
  })

  it('etiket kat ADINI okumaz — serbest metin sırayı söylemiyor', () => {
    // TİP adları ayrı (K168): burada ikisi de tip değil, konumsal etiket çıkar.
    expect(getFloorShortLabels([at(1, 'Giriş'), at(2, 'Teras')])).toEqual(['Z', '1'])
  })
})

describe('getPositionalFloorNames — ad konumdan türer (K167)', () => {
  const at = (id: number, name: string, isBasement = false): Floor => ({
    id,
    name,
    heightCm: 300,
    isBasement,
  })

  it('zemin, sonra sırayla numaralı katlar', () => {
    expect(
      getPositionalFloorNames([at(1, 'x'), at(2, 'y'), at(3, 'z')]),
    ).toEqual(['Zemin Kat', '1. Kat', '2. Kat'])
  })

  it('tek bodrum sade, derinleşen bodrum numaralı', () => {
    expect(
      getPositionalFloorNames([at(1, 'a', true), at(2, 'b', true), at(3, 'c')]),
    ).toEqual(['2. Bodrum Kat', 'Bodrum Kat', 'Zemin Kat'])
  })

  it('kullanıcının yazdığı adı EZER — ad artık serbest metin değil', () => {
    expect(getPositionalFloorNames([at(1, 'Giriş Katı'), at(2, 'Teras')])).toEqual([
      'Zemin Kat',
      '1. Kat',
    ])
  })

  it('withPositionalNames değişen yoksa AYNI diziyi döndürür', () => {
    const floors = [at(1, 'Zemin Kat'), at(2, '1. Kat')]

    expect(withPositionalNames(floors)).toBe(floors)
  })
})

describe('kat tipleri (K168)', () => {
  const at = (id: number, name: string, isBasement = false): Floor => ({
    id,
    name,
    heightCm: 300,
    isBasement,
  })

  /** Bodrum · Zemin · 1 · 2 — en üst kat id 4. */
  const stack = [
    at(1, 'Bodrum Kat', true),
    at(2, 'Zemin Kat'),
    at(3, '1. Kat'),
    at(4, '2. Kat'),
  ]

  it('dubleks ve çatı katı YALNIZ en üst kata verilir', () => {
    expect(canAssignFloorType(stack, 4, 'duplex')).toBe(true)
    expect(canAssignFloorType(stack, 4, 'penthouse')).toBe(true)
    expect(canAssignFloorType(stack, 3, 'duplex')).toBe(false)
    expect(canAssignFloorType(stack, 2, 'penthouse')).toBe(false)
  })

  it('asma kat zemin ve bodrum DIŞINDA her kata verilir', () => {
    expect(canAssignFloorType(stack, 1, 'mezzanine')).toBe(false)
    expect(canAssignFloorType(stack, 2, 'mezzanine')).toBe(false)
    expect(canAssignFloorType(stack, 3, 'mezzanine')).toBe(true)
    expect(canAssignFloorType(stack, 4, 'mezzanine')).toBe(true)
  })

  it('asma kat adı ALTINDAKİ katı taşır', () => {
    expect(withFloorType(stack, 3, 'mezzanine')[2].name).toBe('Asma Kat (Zemin)')
    expect(withFloorType(stack, 4, 'mezzanine')[3].name).toBe('Asma Kat (1)')
  })

  it('asma kat aşağı taşınıp zemine gelirse tipini KAYBEDER', () => {
    const typed = withFloorType(stack, 3, 'mezzanine')
    // Zemin katı silinince asma kat ilk yer üstü kat olur: kural düşer.
    const withoutGround = withPositionalNames(typed.filter((floor) => floor.id !== 2))

    expect(withoutGround.map((floor) => floor.name)).toEqual([
      'Bodrum Kat',
      'Zemin Kat',
      '1. Kat',
    ])
  })

  it('asma kat NUMARA TÜKETMEZ: üstündeki kat numarayı devralır', () => {
    // "1. Kat"ı asma kata çevirmek katı yok etmez; "1. Kat" bir üste kayar.
    expect(withFloorType(stack, 3, 'mezzanine').map((floor) => floor.name)).toEqual([
      'Bodrum Kat',
      'Zemin Kat',
      'Asma Kat (Zemin)',
      '1. Kat',
    ])
  })

  it('binada birden çok asma kat olabilir — farklı katların üstünde', () => {
    const tall = [...stack, at(5, '3. Kat')]
    const twice = withFloorType(withFloorType(tall, 3, 'mezzanine'), 5, 'mezzanine')

    expect(twice.map((floor) => floor.name)).toEqual([
      'Bodrum Kat',
      'Zemin Kat',
      'Asma Kat (Zemin)',
      '1. Kat',
      'Asma Kat (1)',
    ])
  })

  it('asma kat asma katın ÜSTÜNE gelebilir — üst üste olanlar numaralanır', () => {
    const once = withFloorType(stack, 3, 'mezzanine')

    expect(canAssignFloorType(once, 4, 'mezzanine')).toBe(true)
    expect(withFloorType(once, 4, 'mezzanine').map((floor) => floor.name)).toEqual([
      'Bodrum Kat',
      'Zemin Kat',
      'Asma Kat (Zemin)',
      '2. Asma Kat (Zemin)',
    ])
  })

  it('tip kaldırılınca konumsal ada döner', () => {
    const typed = withFloorType(stack, 4, 'duplex')
    expect(typed[3].name).toBe('Dubleks')

    expect(withFloorType(typed, 4, null)[3].name).toBe('2. Kat')
  })

  it('geçersiz tip sessizce REDDEDİLİR: aynı dizi döner', () => {
    expect(withFloorType(stack, 2, 'duplex')).toBe(stack)
    expect(withFloorType(stack, 1, 'mezzanine')).toBe(stack)
  })

  it('çatı katı en üstten inince tipini KAYBEDER', () => {
    const typed = withFloorType(stack, 4, 'penthouse')
    // Üstüne yeni bir kat eklenince artık en üst kat değil.
    const grown = withPositionalNames([...typed, at(5, 'x')])

    expect(grown[3].name).toBe('2. Kat')
    expect(grown[4].name).toBe('3. Kat')
  })

  it('şerit etiketi tipi D / Ç / A ile gösterir', () => {
    const typed = withFloorType(withFloorType(stack, 4, 'duplex'), 3, 'mezzanine')

    // Asma kat sayacı ilerletmediği için en üst kat "1" sırasında; adı "Dubleks".
    expect(getFloorShortLabels(typed)).toEqual(['B', 'Z', 'A', 'D'])
    expect(typed.map((floor) => floor.name)).toEqual([
      'Bodrum Kat',
      'Zemin Kat',
      'Asma Kat (Zemin)',
      'Dubleks',
    ])
  })

  it('getFloorType adı okur', () => {
    expect(getFloorType(at(9, 'Dubleks'))).toBe('duplex')
    expect(getFloorType(at(9, 'Çatı Katı'))).toBe('penthouse')
    expect(getFloorType(at(9, 'Asma Kat (1)'))).toBe('mezzanine')
    expect(getFloorType(at(9, '2. Kat'))).toBeNull()
  })
})
