import { describe, expect, it } from 'vitest'

import type { PlanPoint } from '../coords'
import type { Room } from '../model'
import type { RoomFace } from '../room'
import { extendRoomsWithSplitPieces, getWallSetKey, reconcileRooms } from '../roomIdentity'
import type { RoomUsageType } from '../roomUsage'


function makeFace(wallIds: number[]): RoomFace {
  const corners: PlanPoint[] = wallIds.map((_, index) => ({ x: index, y: index }))
  return { wallIds, corners, areaCm2: 1000 }
}

function makeRoom(id: number, wallIds: number[], usageType?: RoomUsageType): Room {
  return usageType === undefined ? { id, wallIds } : { id, wallIds, usageType }
}

/** Her çağrıda artan id — store'daki takeNextId'nin test karşılığı. */
function makeIdSource(start: number) {
  let next = start
  return () => next++
}

describe('getWallSetKey', () => {
  it('sıradan bağımsızdır', () => {
    expect(getWallSetKey([13, 10, 12, 11])).toBe(getWallSetKey([10, 11, 12, 13]))
  })

  it('tekrarları eler', () => {
    expect(getWallSetKey([10, 10, 11])).toBe(getWallSetKey([10, 11]))
  })
})

describe('reconcileRooms — oda aynı kalır', () => {
  it('duvar kümesi eşleşince ADI korunur', () => {
    const faces = [makeFace([10, 11, 12, 13])]
    const existing = [makeRoom(20, [10, 11, 12, 13], 'livingRoom')]

    const { rooms, removedRoomIds, createdCount } = reconcileRooms(faces, existing, makeIdSource(50),
    )

    expect(rooms).toEqual([{ id: 20, wallIds: [10, 11, 12, 13], usageType: 'livingRoom' }])
    expect(removedRoomIds).toEqual([])
    expect(createdCount).toBe(0)
  })

  it('çevrim farklı sırayla gelse bile eşleşir', () => {
    const faces = [makeFace([12, 13, 10, 11])]
    const existing = [makeRoom(20, [10, 11, 12, 13], 'livingRoom')]

    expect(reconcileRooms(faces, existing, makeIdSource(50)).rooms[0].usageType).toBe(
      'livingRoom',
    )
  })

  it('duvar bölünüp küme genişletilmişse oda yaşar', () => {
    // extendRoomsWithSplitPieces çalıştıktan sonraki durum: odada 47 de var.
    const faces = [makeFace([10, 11, 12, 47, 13])]
    const existing = [makeRoom(20, [10, 11, 12, 47, 13], 'livingRoom')]

    const { rooms, createdCount } = reconcileRooms(faces, existing, makeIdSource(50),
    )

    expect(rooms[0].id).toBe(20)
    expect(rooms[0].usageType).toBe('livingRoom')
    expect(createdCount).toBe(0)
  })
})

describe('reconcileRooms — oda ikiye ayrılır', () => {
  it('içinden duvar geçince İKİ YENİ oda doğar ve ikisi de varsayılan adı alır', () => {
    // Eskiden tek oda: [10,11,12,13]. Şimdi ortadan 16 numaralı duvar geçti.
    const faces = [makeFace([10, 16, 13]), makeFace([16, 11, 12])]
    const existing = [makeRoom(20, [10, 11, 12, 13], 'livingRoom')]

    const { rooms, removedRoomIds, createdCount } = reconcileRooms(faces, existing, makeIdSource(50),
    )

    expect(rooms.map((room) => room.usageType)).toEqual([undefined, undefined])
    expect(rooms.map((room) => room.id)).toEqual([50, 51])
    // Eski oda kimliği yaşamaz.
    expect(removedRoomIds).toEqual([20])
    expect(createdCount).toBe(2)
  })
})

describe('reconcileRooms — oda kaybolur', () => {
  it('duvar silinip alan açılınca oda düşer', () => {
    const existing = [makeRoom(20, [10, 11, 12, 13], 'livingRoom')]

    const { rooms, removedRoomIds } = reconcileRooms([], existing, makeIdSource(50))

    expect(rooms).toEqual([])
    expect(removedRoomIds).toEqual([20])
  })

  it('aynı imzalı iki oda varsa yalnız biri eşleşir, öbürü düşer', () => {
    // Bozuk veri: aynı çevrim iki kez kaydedilmiş. Sessizce çoğalmamalı.
    const faces = [makeFace([10, 11, 12, 13])]
    const existing = [makeRoom(20, [10, 11, 12, 13], 'livingRoom'), makeRoom(21, [10, 11, 12, 13], 'kitchen')]

    const { rooms, removedRoomIds } = reconcileRooms(faces, existing, makeIdSource(50))

    expect(rooms).toHaveLength(1)
    expect(rooms[0].id).toBe(20)
    expect(removedRoomIds).toEqual([21])
  })
})

describe('reconcileRooms — yeni çizilen oda', () => {
  it('hiç oda yokken yüzler TİPSİZ gelir (etiket "Tanımsız")', () => {
    const { rooms, createdCount } = reconcileRooms([makeFace([10, 11, 12, 13])], [], makeIdSource(50))

    expect(rooms).toEqual([{ id: 50, wallIds: [10, 11, 12, 13] }])
    expect(createdCount).toBe(1)
  })
})

describe('extendRoomsWithSplitPieces', () => {
  it('bölünen duvarı içeren odaya yeni parçayı ekler', () => {
    const rooms = [makeRoom(20, [10, 11, 12, 13], 'livingRoom')]

    const updated = extendRoomsWithSplitPieces(rooms, 12, [12, 47])

    expect(updated[0].wallIds).toEqual([10, 11, 12, 13, 47])
    expect(updated[0].usageType).toBe('livingRoom')
  })

  it('o duvarı içermeyen odaya DOKUNMAZ', () => {
    const rooms = [makeRoom(21, [30, 31, 32], 'kitchen')]

    const updated = extendRoomsWithSplitPieces(rooms, 12, [12, 47])

    expect(updated[0]).toBe(rooms[0])
  })

  it('parça zaten varsa tekrar eklemez', () => {
    const rooms = [makeRoom(20, [10, 11, 12, 47], 'livingRoom')]

    expect(extendRoomsWithSplitPieces(rooms, 12, [12, 47])[0]).toBe(rooms[0])
  })

  it('bir duvar üç parçaya bölünürse ikisini de ekler', () => {
    const rooms = [makeRoom(20, [10, 11, 12, 13], 'livingRoom')]

    const updated = extendRoomsWithSplitPieces(rooms, 12, [12, 47, 48])

    expect(updated[0].wallIds).toEqual([10, 11, 12, 13, 47, 48])
  })
})

describe('reconcileRooms — kullanım tipi', () => {
  it('eşleşen odanın kullanım tipini KORUR', () => {
    const face = { wallIds: [1, 2, 3], corners: [], areaCm2: 1000 }
    const existing = [{ id: 9, wallIds: [1, 2, 3], usageType: 'kitchen' as const }]

    const { rooms } = reconcileRooms([face], existing, () => 99)

    expect(rooms[0].usageType).toBe('kitchen')
  })

  it('yeni doğan oda tip TAŞIMAZ', () => {
    const face = { wallIds: [1, 2, 3], corners: [], areaCm2: 1000 }

    const { rooms } = reconcileRooms([face], [], () => 99)

    expect(rooms[0].usageType).toBeUndefined()
  })
})
