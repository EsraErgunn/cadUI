import { describe, expect, it } from 'vitest'

import { horizontal, points, walls, window12 } from './openingFixture'
import type { Selection, SelectionItem } from '../selection'
import {
  getOpeningsInRect,
  getSelectedIds,
  getSelectionInRect,
  getSoleSelectedId,
  getWallsInRect,
  isItemSelected,
  isPointInRect,
  isSelected,
  mergeSelection,
  pruneSelection,
  toPlanRect,
  toSelectionItem,
  toggleSelectionItem,
} from '../selection'

const WALL_8_ID = horizontal.id
const WINDOW_12_ID = window12.id
const openings = [window12]

const wallItem: SelectionItem = { kind: 'wall', id: WALL_8_ID }
const openingItem: SelectionItem = { kind: 'opening', id: WINDOW_12_ID }

describe('toggleSelectionItem', () => {
  it('seçili değilse ekler', () => {
    expect(toggleSelectionItem([], wallItem)).toEqual([wallItem])
  })

  it('seçiliyse çıkarır (KK-10: aynı nesneye yeniden tıklama)', () => {
    expect(toggleSelectionItem([wallItem, openingItem], wallItem)).toEqual([openingItem])
  })

  it('aynı id farklı türde ayrı ögedir', () => {
    const sameIdOtherKind: SelectionItem = { kind: 'opening', id: WALL_8_ID }
    expect(toggleSelectionItem([wallItem], sameIdOtherKind)).toEqual([wallItem, sameIdOtherKind])
  })
})

describe('isItemSelected / isSelected', () => {
  const selection: Selection = [wallItem, openingItem]

  it('türü ve id"yi birlikte arar', () => {
    expect(isItemSelected(selection, wallItem)).toBe(true)
    expect(isSelected(selection, 'wall', WALL_8_ID)).toBe(true)
    expect(isSelected(selection, 'opening', WALL_8_ID)).toBe(false)
  })
})

describe('getSelectedIds / getSoleSelectedId', () => {
  it('tür başına id"leri süzer', () => {
    expect(getSelectedIds([wallItem, openingItem], 'wall')).toEqual([WALL_8_ID])
  })

  it('tek nesne seçiliyken id döner', () => {
    expect(getSoleSelectedId([openingItem], 'opening')).toBe(WINDOW_12_ID)
  })

  it('çoklu seçimde undefined döner — hangi nesne olduğu belirsiz', () => {
    expect(getSoleSelectedId([wallItem, openingItem], 'opening')).toBeUndefined()
  })

  it('tek nesne seçili ama türü başkaysa undefined döner', () => {
    expect(getSoleSelectedId([wallItem], 'opening')).toBeUndefined()
  })
})

describe('toSelectionItem', () => {
  it('duvar ve açıklık hedefini çevirir', () => {
    expect(toSelectionItem({ kind: 'wall', wallId: 8 })).toEqual({ kind: 'wall', id: 8 })
    expect(toSelectionItem({ kind: 'opening', openingId: 12 })).toEqual({
      kind: 'opening',
      id: 12,
    })
  })

  it('köşe seçilemez', () => {
    expect(toSelectionItem({ kind: 'point', pointId: 2 })).toBeUndefined()
  })
})

describe('pruneSelection', () => {
  it('silinmiş nesneyi seçimden düşürür', () => {
    const selection: Selection = [wallItem, { kind: 'wall', id: 999 }]

    expect(pruneSelection(selection, walls, openings, [], [], [], [])).toEqual([wallItem])
  })

  it('değişiklik yoksa AYNI diziyi döndürür — gereksiz render olmasın', () => {
    const selection: Selection = [wallItem]

    expect(pruneSelection(selection, walls, openings, [], [], [], [])).toBe(selection)
  })
})

describe('toPlanRect / isPointInRect', () => {
  it('hangi yöne sürüklenirse sürüklensin aynı dikdörtgeni verir', () => {
    const downRight = toPlanRect({ x: 0, y: 0 }, { x: 100, y: 50 })
    const upLeft = toPlanRect({ x: 100, y: 50 }, { x: 0, y: 0 })

    expect(downRight).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 50 })
    expect(upLeft).toEqual(downRight)
  })

  it('sınırdaki nokta içeridedir', () => {
    const rect = toPlanRect({ x: 0, y: 0 }, { x: 100, y: 50 })

    expect(isPointInRect({ x: 0, y: 50 }, rect)).toBe(true)
    expect(isPointInRect({ x: 101, y: 25 }, rect)).toBe(false)
  })
})

describe('getWallsInRect', () => {
  // Fixture: duvar 8 = (0,0)-(500,0), duvar 9 = (500,0)-(500,400), duvar 10 = (0,0)-(0,400).
  it('iki ucu da çerçevede olan duvarı seçer', () => {
    const rect = toPlanRect({ x: -10, y: -10 }, { x: 510, y: 10 })

    expect(getWallsInRect(rect, walls, points)).toEqual([WALL_8_ID])
  })

  it('yalnız bir ucu çerçevede olan duvarı SEÇMEZ (kesişen değil, kapsanan)', () => {
    const rect = toPlanRect({ x: -10, y: -10 }, { x: 250, y: 10 })

    expect(getWallsInRect(rect, walls, points)).toEqual([])
  })

  it('çerçeve tüm sahneyi kapsıyorsa hepsini seçer', () => {
    const rect = toPlanRect({ x: -100, y: -100 }, { x: 1000, y: 1000 })

    expect(getWallsInRect(rect, walls, points)).toHaveLength(walls.length)
  })
})

describe('getOpeningsInRect', () => {
  // Fixture açıklığı: duvar 8 üzerinde offset 250 → merkez (250, 0).
  it('merkezi çerçevede olan açıklığı seçer', () => {
    const rect = toPlanRect({ x: 200, y: -10 }, { x: 300, y: 10 })

    expect(getOpeningsInRect(rect, openings, walls, points)).toEqual([
      WINDOW_12_ID,
    ])
  })

  it('merkez dışarıdaysa açıklığı SEÇMEZ', () => {
    const rect = toPlanRect({ x: 0, y: -10 }, { x: 100, y: 10 })

    expect(getOpeningsInRect(rect, openings, walls, points)).toEqual([])
  })

  it('duvarı olmayan açıklık seçilmez', () => {
    const orphan = [{ id: 77, wallId: 999, offsetCm: 250, widthCm: 90, type: 'door' as const }]
    const rect = toPlanRect({ x: -1000, y: -1000 }, { x: 1000, y: 1000 })

    expect(getOpeningsInRect(rect, orphan, walls, points)).toEqual([])
  })
})

describe('getSelectionInRect', () => {
  it('duvar ve açıklıkları tek geçişte toplar', () => {
    const rect = toPlanRect({ x: -100, y: -100 }, { x: 1000, y: 1000 })

    const selection = getSelectionInRect(rect, walls, openings, points, [], [], [], [])

    expect(getSelectedIds(selection, 'wall')).toHaveLength(walls.length)
    expect(getSelectedIds(selection, 'opening')).toEqual([WINDOW_12_ID])
  })
})

describe('mergeSelection', () => {
  it('yinelenen öge eklemez', () => {
    expect(mergeSelection([wallItem], [wallItem, openingItem])).toEqual([wallItem, openingItem])
  })
})
