import { describe, expect, it } from 'vitest'

import {
  addDraftFloor,
  addDraftFloors,
  clearDraftFloorCopy,
  clearDraftFloorSelection,
  createFloorPlanDraft,
  getAddableFloorCount,
  getSelectedDraftFloors,
  hasPendingCopies,
  isDraftFloorId,
  removeDraftFloors,
  renameDraftFloor,
  reorderDraftFloor,
  setDraftActiveFloor,
  setDraftFloorCopies,
  setDraftFloorHeight,
  setDraftFloorSelection,
  toggleDraftFloorSelection,
} from '../floorPlan'
import { MAX_BASEMENT_COUNT, MAX_FLOOR_COUNT } from '../floors'
import type { Floor } from '../model'

function makeFloor(id: number, name: string, isBasement = false, heightCm = 300): Floor {
  return { id, name, heightCm, isBasement }
}

const basement = makeFloor(1, 'Bodrum Kat', true, 280)
const ground = makeFloor(2, 'Zemin Kat')
const first = makeFloor(3, '1. Kat')
const stored = [basement, ground, first]

function makeDraft() {
  return createFloorPlanDraft(stored, ground.id)
}

describe('createFloorPlanDraft', () => {
  it('store"daki katları kopyalar, seçim boş başlar', () => {
    const draft = makeDraft()

    expect(draft.floors.map((floor) => floor.id)).toEqual([1, 2, 3])
    expect(draft.floors.every((floor) => floor.pendingCopy === null)).toBe(true)
    expect(draft.selectedFloorIds).toEqual([])
  })

  it('store"daki kat nesnelerini PAYLAŞMAZ — taslak düzenlemesi sızmasın', () => {
    const draft = makeDraft()

    expect(draft.floors[0]).not.toBe(basement)
  })
})

describe('addDraftFloor', () => {
  it('yeni kat GEÇİCİ negatif id alır — sayaç Uygula"ya kadar ilerlemez', () => {
    const draft = addDraftFloor(makeDraft())
    const added = draft.floors.at(-1)

    expect(added?.name).toBe('2. Kat')
    expect(isDraftFloorId(added?.id ?? 0)).toBe(true)
  })

  it('art arda eklenen katlar ÇAKIŞMAYAN geçici id alır', () => {
    const draft = addDraftFloor(addDraftFloor(makeDraft()))
    const ids = draft.floors.filter((floor) => isDraftFloorId(floor.id)).map((floor) => floor.id)

    expect(new Set(ids).size).toBe(2)
  })

  it('bodrumu dizinin başına, normal katı sonuna koyar', () => {
    const draft = addDraftFloor(makeDraft(), { isBasement: true })

    expect(draft.floors[0].name).toBe('2. Bodrum Kat')
    expect(draft.floors[0].isBasement).toBe(true)
  })

  it('kopya kaynağını taşır — kopyalama Uygula"da yapılacak', () => {
    const draft = addDraftFloor(makeDraft(), { copyFromFloorId: ground.id })

    expect(draft.floors.at(-1)?.pendingCopy?.sourceFloorId).toBe(ground.id)
  })

  it('"Yeni kat yüksekliği" yalnız EKLENEN kata uygulanır (madde 3)', () => {
    const draft = addDraftFloor(makeDraft(), { heightCm: 450 })

    expect(draft.floors.at(-1)?.heightCm).toBe(450)
    expect(draft.floors.map((floor) => floor.heightCm)).toEqual([280, 300, 300, 450])
  })

  it('sınır dışı yükseklik ve dolu bodrum tavanı reddedilir', () => {
    const draft = makeDraft()
    expect(addDraftFloor(draft, { heightCm: 601 })).toBe(draft)

    let full = draft
    for (let index = 1; index < MAX_BASEMENT_COUNT; index += 1) {
      full = addDraftFloor(full, { isBasement: true })
    }
    expect(addDraftFloor(full, { isBasement: true })).toBe(full)
  })
})

describe('removeDraftFloors', () => {
  it('birden çok katı tek işlemde siler', () => {
    const draft = removeDraftFloors(makeDraft(), [basement.id, first.id])

    expect(draft.floors.map((floor) => floor.id)).toEqual([ground.id])
  })

  it('seçim katların TAMAMINI kapsıyorsa hiçbiri silinmez (madde 14)', () => {
    const draft = makeDraft()

    expect(removeDraftFloors(draft, [basement.id, ground.id, first.id])).toBe(draft)
  })

  it('silinen kat aktifse ALTINDAKİ kat aktif olur', () => {
    const draft = removeDraftFloors(makeDraft(), [ground.id])

    expect(draft.activeFloorId).toBe(basement.id)
  })

  it('altı kalmadıysa üstündeki kat aktif olur', () => {
    const draft = removeDraftFloors(makeDraft(), [basement.id, ground.id])

    expect(draft.activeFloorId).toBe(first.id)
  })

  it('silinen katın SEÇ işareti de düşer', () => {
    const selected = toggleDraftFloorSelection(makeDraft(), first.id)
    const draft = removeDraftFloors(selected, [first.id])

    expect(draft.selectedFloorIds).toEqual([])
  })

  it('tanınmayan id değişiklik saymaz', () => {
    const draft = makeDraft()
    expect(removeDraftFloors(draft, [404])).toBe(draft)
  })
})

describe('renameDraftFloor', () => {
  it('adı kırpar', () => {
    const draft = renameDraftFloor(makeDraft(), first.id, '  Çatı  ')

    expect(draft.floors.at(-1)?.name).toBe('Çatı')
  })

  it('boş ve çakışan adı reddeder (KK-5)', () => {
    const draft = makeDraft()

    expect(renameDraftFloor(draft, first.id, '   ')).toBe(draft)
    expect(renameDraftFloor(draft, first.id, 'Zemin Kat')).toBe(draft)
  })

  it('katın kendi adını yazmak çakışma sayılmaz ama değişiklik de değildir', () => {
    const draft = makeDraft()

    expect(renameDraftFloor(draft, first.id, '1. Kat')).toBe(draft)
  })
})

describe('setDraftFloorHeight', () => {
  it('yüksekliği yazar', () => {
    const draft = setDraftFloorHeight(makeDraft(), ground.id, 320)

    expect(draft.floors[1].heightCm).toBe(320)
  })

  it('200–600 cm dışını reddeder (KK-4)', () => {
    const draft = makeDraft()

    expect(setDraftFloorHeight(draft, ground.id, 199)).toBe(draft)
    expect(setDraftFloorHeight(draft, ground.id, 601)).toBe(draft)
  })
})

describe('reorderDraftFloor', () => {
  it('katı taşır', () => {
    const draft = reorderDraftFloor(makeDraft(), first.id, 1)

    expect(draft.floors.map((floor) => floor.id)).toEqual([1, 3, 2])
  })

  it('bodrumu zemin üstüne taşımayı reddeder (KK-6)', () => {
    const draft = makeDraft()

    expect(reorderDraftFloor(draft, basement.id, 2)).toBe(draft)
  })
})

describe('seçim ve aktif kat', () => {
  it('"Aktif Yap" SEÇ işaretlerine dokunmaz (madde 8)', () => {
    const selected = toggleDraftFloorSelection(makeDraft(), first.id)
    const draft = setDraftActiveFloor(selected, basement.id)

    expect(draft.activeFloorId).toBe(basement.id)
    expect(draft.selectedFloorIds).toEqual([first.id])
  })

  it('işaret ikinci tıklamada kalkar', () => {
    const once = toggleDraftFloorSelection(makeDraft(), first.id)

    expect(toggleDraftFloorSelection(once, first.id).selectedFloorIds).toEqual([])
  })

  it('seçili katları LİSTE sırasıyla verir, tıklama sırasıyla değil', () => {
    const draft = toggleDraftFloorSelection(
      toggleDraftFloorSelection(makeDraft(), first.id),
      basement.id,
    )

    expect(getSelectedDraftFloors(draft).map((floor) => floor.id)).toEqual([basement.id, first.id])
  })

  it('temizleme boş seçimde değişiklik saymaz', () => {
    const draft = makeDraft()

    expect(clearDraftFloorSelection(draft)).toBe(draft)
  })
})

describe('addDraftFloors — sayıyla toplu ekleme (K166)', () => {
  it('istenen sayıda kat ekler ve adları SIRAYLA üretir', () => {
    const draft = addDraftFloors(makeDraft(), {}, 3)

    expect(draft.floors).toHaveLength(stored.length + 3)
    expect(draft.floors.slice(-3).map((floor) => floor.name)).toEqual([
      '2. Kat',
      '3. Kat',
      '4. Kat',
    ])
  })

  it('her kat ALTINDAKİ katın yüksekliğini devralır', () => {
    // Yeni kat yüksekliği artık ayrı bir alandan değil listeden geliyor.
    const tall = setDraftFloorHeight(makeDraft(), first.id, 420)
    const draft = addDraftFloors(tall, {}, 2)

    expect(draft.floors.slice(-2).map((floor) => floor.heightCm)).toEqual([420, 420])
  })

  it('kaynak verilirse HEPSİ o kattan kopyalanır', () => {
    const draft = addDraftFloors(makeDraft(), { copyFromFloorId: ground.id }, 2)

    expect(draft.floors.slice(-2).map((floor) => floor.pendingCopy?.sourceFloorId)).toEqual([
      ground.id,
      ground.id,
    ])
  })

  it('tavana sığmayan istek KISMEN uygulanmaz — hiçbiri eklenmez', () => {
    const draft = makeDraft()
    const room = MAX_FLOOR_COUNT - draft.floors.length

    expect(addDraftFloors(draft, {}, room + 1)).toBe(draft)
    expect(addDraftFloors(draft, {}, room).floors).toHaveLength(MAX_FLOOR_COUNT)
  })

  it('sıfır ve negatif sayı taslağı değiştirmez', () => {
    const draft = makeDraft()

    expect(addDraftFloors(draft, {}, 0)).toBe(draft)
    expect(addDraftFloors(draft, {}, -2)).toBe(draft)
    expect(addDraftFloors(draft, {}, 1.5)).toBe(draft)
  })
})

describe('getAddableFloorCount', () => {
  it('normal ve bodrum tavanlarını AYRI sayar', () => {
    const draft = makeDraft()

    expect(getAddableFloorCount(draft.floors, false)).toBe(MAX_FLOOR_COUNT - 3)
    expect(getAddableFloorCount(draft.floors, true)).toBe(MAX_BASEMENT_COUNT - 1)
  })
})

describe('setDraftFloorCopies — kopyalama taslakta bekler (K166)', () => {
  const copy = {
    sourceFloorId: ground.id,
    isArchitectureIncluded: true,
    isInstallationIncluded: false,
  }

  it('hedeflere bekleyen kopyalama yazar', () => {
    const draft = setDraftFloorCopies(makeDraft(), [first.id], copy)

    expect(draft.floors.find((floor) => floor.id === first.id)?.pendingCopy).toEqual(copy)
    expect(hasPendingCopies(draft)).toBe(true)
  })

  it('MEVCUT katlara da yazılır — yalnız yeni katlara değil', () => {
    const draft = setDraftFloorCopies(makeDraft(), [basement.id, first.id], copy)

    expect(draft.floors.filter((floor) => floor.pendingCopy !== null)).toHaveLength(2)
  })

  it('kaynak kat kendine hedef OLAMAZ, sessizce süzülür', () => {
    const draft = makeDraft()

    // Tek hedef kaynağın kendisiyse geriye hedef kalmaz: taslak aynen döner.
    expect(setDraftFloorCopies(draft, [ground.id], copy)).toBe(draft)
    expect(
      setDraftFloorCopies(draft, [ground.id, first.id], copy).floors.filter(
        (floor) => floor.pendingCopy !== null,
      ),
    ).toHaveLength(1)
  })

  it('tanınmayan kaynak reddedilir', () => {
    const draft = makeDraft()

    expect(setDraftFloorCopies(draft, [first.id], { ...copy, sourceFloorId: 404 })).toBe(draft)
  })

  it('clearDraftFloorCopy bekleyen kopyalamayı geri alır', () => {
    const withCopy = setDraftFloorCopies(makeDraft(), [first.id], copy)
    const cleared = clearDraftFloorCopy(withCopy, first.id)

    expect(hasPendingCopies(cleared)).toBe(false)
    expect(clearDraftFloorCopy(cleared, first.id)).toBe(cleared)
  })
})

describe('setDraftFloorSelection', () => {
  it('seçimi topluca yazar ve tanınmayan id"leri süzer', () => {
    const draft = setDraftFloorSelection(makeDraft(), [first.id, 404, first.id])

    expect(draft.selectedFloorIds).toEqual([first.id])
  })

  it('aynı seçim AYNI taslağı döndürür', () => {
    const draft = setDraftFloorSelection(makeDraft(), [first.id])

    expect(setDraftFloorSelection(draft, [first.id])).toBe(draft)
  })
})
