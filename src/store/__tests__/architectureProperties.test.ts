import { beforeEach, describe, expect, it } from 'vitest'

import {
  FIXTURE_NEXT_FREE_ID,
  FIXTURE_OPENINGS,
  FIXTURE_POINTS,
  FIXTURE_WALLS,
  WALL_ID,
  WINDOW_ID,
} from './architectureFixture'
import { useCadStore } from '../cadStore'

const RIGHT_CORNER_WALL_ID = 9

function resetState(): void {
  useCadStore.setState({
    points: FIXTURE_POINTS,
    walls: FIXTURE_WALLS,
    openings: FIXTURE_OPENINGS,
    nextUniqueId: FIXTURE_NEXT_FREE_ID,
    revision: 0,
  })
  useCadStore.temporal.getState().clear()
}

function findWall(wallId: number) {
  return useCadStore.getState().walls.find((wall) => wall.id === wallId)
}

beforeEach(resetState)

describe('setWallsThickness', () => {
  it('tek duvarın kalınlığını yazar', () => {
    expect(useCadStore.getState().setWallsThickness([WALL_ID], 40)).toBe(true)
    expect(findWall(WALL_ID)?.thickness).toBe(40)
  })

  it('birden çok duvarı TEK geri alma adımında günceller', () => {
    useCadStore.getState().setWallsThickness([WALL_ID, RIGHT_CORNER_WALL_ID], 35)

    expect(findWall(WALL_ID)?.thickness).toBe(35)
    expect(findWall(RIGHT_CORNER_WALL_ID)?.thickness).toBe(35)
    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)
  })

  it('sıfır ve negatif kalınlık reddedilir', () => {
    expect(useCadStore.getState().setWallsThickness([WALL_ID], 0)).toBe(false)
    expect(useCadStore.getState().setWallsThickness([WALL_ID], -5)).toBe(false)
    expect(findWall(WALL_ID)?.thickness).toBe(20)
  })

  it('aynı değeri yazmak projeyi kirletmez', () => {
    expect(useCadStore.getState().setWallsThickness([WALL_ID], 20)).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('kalınlaşan komşu duvar sığmayan açıklığı AYNI adımda düşürür (K16)', () => {
    // Açıklık: duvar 8'de offset 250, genişlik 120 → [190, 310].
    // Duvar 9 (p2 ucundaki komşu) 300 cm'e kalınlaşınca aralık [25, 200]'e iner.
    useCadStore.getState().setWallsThickness([RIGHT_CORNER_WALL_ID], 300)

    expect(useCadStore.getState().openings.some((opening) => opening.id === WINDOW_ID)).toBe(false)
    // Kalınlık + temizlik tek adım: bir Ctrl+Z ikisini de geri alır.
    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)

    useCadStore.temporal.getState().undo()
    expect(useCadStore.getState().openings).toHaveLength(FIXTURE_OPENINGS.length)
  })
})

describe('setWallsHeight', () => {
  it('yüksekliği yazar', () => {
    expect(useCadStore.getState().setWallsHeight([WALL_ID], 300)).toBe(true)
    expect(findWall(WALL_ID)?.height).toBe(300)
  })

  it('geçersiz yükseklik reddedilir', () => {
    expect(useCadStore.getState().setWallsHeight([WALL_ID], 0)).toBe(false)
    expect(useCadStore.getState().setWallsHeight([WALL_ID], Number.NaN)).toBe(false)
  })

  it('yükseklik açıklık sığmasını etkilemez', () => {
    useCadStore.getState().setWallsHeight([WALL_ID], 500)

    expect(useCadStore.getState().openings).toHaveLength(FIXTURE_OPENINGS.length)
  })

  it('tanınmayan duvar id"si projeyi kirletmez', () => {
    expect(useCadStore.getState().setWallsHeight([999], 300)).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
  })
})
