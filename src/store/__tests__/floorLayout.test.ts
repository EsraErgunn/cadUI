import { beforeEach, describe, expect, it } from 'vitest'

import { MAX_BASEMENT_COUNT, MAX_FLOOR_COUNT, createGroundFloor } from '../../core/floors'
import { useCadStore } from '../cadStore'

/** Kat SIRASI ve YÜKSEKLİĞİ; çizim içeriği bu testlerin konusu değil. */
const UPPER_FLOOR_ID = 100

beforeEach(() => {
  useCadStore.setState({
    floors: [
      createGroundFloor(),
      { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: 300, isBasement: false },
    ],
    activeFloorId: createGroundFloor().id,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    installationElements: [],
    nextUniqueId: 200,
    revision: 0,
  })
  useCadStore.temporal.getState().clear()
})

describe('bodrum ekleme', () => {
  it('bodrumu dizinin BAŞINA ekler — kotu negatif çıksın', () => {
    const id = useCadStore.getState().addFloor({ isBasement: true })

    const { floors } = useCadStore.getState()
    expect(floors[0]).toEqual({ id, name: 'Bodrum Kat', heightCm: 300, isBasement: true })
  })

  it('bodrum tavanı dolunca reddeder ve id HARCAMAZ', () => {
    for (let index = 0; index < MAX_BASEMENT_COUNT; index += 1) {
      expect(useCadStore.getState().addFloor({ isBasement: true })).toBeDefined()
    }
    const before = useCadStore.getState().nextUniqueId

    expect(useCadStore.getState().addFloor({ isBasement: true })).toBeUndefined()
    expect(useCadStore.getState().nextUniqueId).toBe(before)
  })

  it('normal kat tavanı dolunca reddeder', () => {
    const filler = Array.from({ length: MAX_FLOOR_COUNT - 2 }, (_, index) => ({
      id: 1000 + index,
      name: `${index + 5}. Kat`,
      heightCm: 300,
      isBasement: false,
    }))
    useCadStore.setState({ floors: [...useCadStore.getState().floors, ...filler] })

    expect(useCadStore.getState().addFloor()).toBeUndefined()
  })
})

describe('setFloorHeight', () => {
  it('yüksekliği yazar', () => {
    expect(useCadStore.getState().setFloorHeight(UPPER_FLOOR_ID, 320)).toBe(true)
    expect(useCadStore.getState().floors.at(-1)?.heightCm).toBe(320)
  })

  it('200–600 cm dışını reddeder ve projeyi KİRLETMEZ', () => {
    const before = useCadStore.getState().revision

    expect(useCadStore.getState().setFloorHeight(UPPER_FLOOR_ID, 199)).toBe(false)
    expect(useCadStore.getState().setFloorHeight(UPPER_FLOOR_ID, 601)).toBe(false)
    expect(useCadStore.getState().revision).toBe(before)
  })

  it('aynı değeri yazmak değişiklik saymaz', () => {
    expect(useCadStore.getState().setFloorHeight(UPPER_FLOOR_ID, 300)).toBe(false)
  })
})

describe('reorderFloor', () => {
  it('katı verilen indekse taşır', () => {
    expect(useCadStore.getState().reorderFloor(UPPER_FLOOR_ID, 0)).toBe(true)
    expect(useCadStore.getState().floors[0].id).toBe(UPPER_FLOOR_ID)
  })

  it('bodrumu zemin üstüne taşımayı reddeder', () => {
    const basementId = useCadStore.getState().addFloor({ isBasement: true })
    expect(basementId).toBeDefined()

    expect(useCadStore.getState().reorderFloor(basementId as number, 2)).toBe(false)
    expect(useCadStore.getState().floors[0].id).toBe(basementId)
  })
})
