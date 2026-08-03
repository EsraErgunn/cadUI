import { beforeEach, describe, expect, it } from 'vitest'

import {
  FIXTURE_POINTS,
  resetArchitectureState,
  WALL_ID,
  WINDOW_ID,
} from './architectureFixture'
import { getOpeningOutline } from '../../core/opening'
import { redoProject, undoProject, useCadStore } from '../cadStore'

/** Duvar 8 = (0,0)-(500,0); köşeleri 2 ve 3, ikisi de dik duvarlarla paylaşılıyor. */
const P1_ID = 2
const P2_ID = 3

function readPoint(pointId: number) {
  const point = useCadStore.getState().points.find((candidate) => candidate.id === pointId)
  if (!point) throw new Error(`nokta yok: ${pointId}`)
  return { x: point.x, y: point.y }
}

function temporal() {
  return useCadStore.temporal.getState()
}

describe('moveWall', () => {
  beforeEach(() => {
    resetArchitectureState()
    // setState geçmişe yazıyor; her test sıfır adımdan başlasın.
    temporal().clear()
  })

  it('duvarın iki köşesini birlikte öteler', () => {
    useCadStore.getState().moveWall(WALL_ID, 30, -40)

    expect(readPoint(P1_ID)).toEqual({ x: 30, y: -40 })
    expect(readPoint(P2_ID)).toEqual({ x: 530, y: -40 })
  })

  it('boyu ve açıyı korur — katı öteleme', () => {
    const before = { p1: readPoint(P1_ID), p2: readPoint(P2_ID) }
    const lengthBefore = Math.hypot(before.p2.x - before.p1.x, before.p2.y - before.p1.y)

    useCadStore.getState().moveWall(WALL_ID, 123, 456)

    const after = { p1: readPoint(P1_ID), p2: readPoint(P2_ID) }
    expect(Math.hypot(after.p2.x - after.p1.x, after.p2.y - after.p1.y)).toBeCloseTo(lengthBefore)
    expect(after.p2.x - after.p1.x).toBeCloseTo(before.p2.x - before.p1.x)
    expect(after.p2.y - after.p1.y).toBeCloseTo(before.p2.y - before.p1.y)
  })

  it('köşeleri paylaşan komşu duvarlar esneyerek bağlı kalır', () => {
    // Duvar 9 köşe 3'ü, duvar 10 köşe 2'yi paylaşıyor; öbür uçları YERİNDE kalmalı.
    const farEndOf9 = FIXTURE_POINTS.find((point) => point.id === 4)!
    const farEndOf10 = FIXTURE_POINTS.find((point) => point.id === 5)!

    useCadStore.getState().moveWall(WALL_ID, 0, 100)

    expect(readPoint(4)).toEqual({ x: farEndOf9.x, y: farEndOf9.y })
    expect(readPoint(5)).toEqual({ x: farEndOf10.x, y: farEndOf10.y })
    // Komşular hâlâ aynı köşelere bağlı: kopma yok, yeni nokta üretilmedi.
    expect(useCadStore.getState().points).toHaveLength(FIXTURE_POINTS.length)
  })

  it('açıklık duvarla birlikte gelir — offsetCm değişmez', () => {
    const before = useCadStore.getState()
    const outlineBefore = getOpeningOutline(
      before.walls.find((wall) => wall.id === WALL_ID)!,
      before.points,
      before.openings.find((opening) => opening.id === WINDOW_ID)!,
    )!

    useCadStore.getState().moveWall(WALL_ID, 60, 25)

    const after = useCadStore.getState()
    const opening = after.openings.find((candidate) => candidate.id === WINDOW_ID)!
    const outlineAfter = getOpeningOutline(
      after.walls.find((wall) => wall.id === WALL_ID)!,
      after.points,
      opening,
    )!

    // Konum duvardan TÜRETİLİYOR (K9): offset sabit, köşeler tam öteleme kadar kaymış.
    expect(opening.offsetCm).toBe(250)
    outlineAfter.forEach((corner, index) => {
      expect(corner.x).toBeCloseTo(outlineBefore[index].x + 60)
      expect(corner.y).toBeCloseTo(outlineBefore[index].y + 25)
    })
  })

  it('sıfır öteleme hiçbir şey yazmaz — proje kirlenmez', () => {
    useCadStore.getState().moveWall(WALL_ID, 0, 0)

    expect(useCadStore.getState().revision).toBe(0)
    expect(readPoint(P1_ID)).toEqual({ x: 0, y: 0 })
  })

  it('bilinmeyen duvar id’sinde hiçbir şey değişmez', () => {
    useCadStore.getState().moveWall(404, 50, 50)

    expect(useCadStore.getState().revision).toBe(0)
    expect(readPoint(P1_ID)).toEqual({ x: 0, y: 0 })
  })

  it('tek adımda yazar — taşıma + temizlik tek Ctrl+Z', () => {
    useCadStore.getState().moveWall(WALL_ID, 10, 10)

    expect(useCadStore.getState().revision).toBe(1)
  })
})

/**
 * Taşıma iki köşeye birden dokunuyor ve açıklık temizliğini de çağırıyor; hepsi
 * tek `set()` içinde olmasaydı tek kullanıcı hareketi için birkaç Ctrl+Z gerekirdi.
 */
describe('moveWall — geri al / yinele', () => {
  beforeEach(() => {
    resetArchitectureState()
    temporal().clear()
  })

  it('TEK geri alma adımı yazar', () => {
    useCadStore.getState().moveWall(WALL_ID, 40, 40)

    expect(temporal().pastStates).toHaveLength(1)
  })

  it('tek Ctrl+Z iki köşeyi birden eski yerine döndürür', () => {
    useCadStore.getState().moveWall(WALL_ID, 40, 40)

    undoProject()

    expect(readPoint(P1_ID)).toEqual({ x: 0, y: 0 })
    expect(readPoint(P2_ID)).toEqual({ x: 500, y: 0 })
  })

  it('yinele taşımayı geri getirir', () => {
    useCadStore.getState().moveWall(WALL_ID, 40, 40)
    undoProject()

    redoProject()

    expect(readPoint(P1_ID)).toEqual({ x: 40, y: 40 })
    expect(readPoint(P2_ID)).toEqual({ x: 540, y: 40 })
  })

  it('sıfır öteleme geçmişe adım YAZMAZ', () => {
    // set() çalışıyor ama hiçbir şeye dokunmuyor; eşitlik kontrolü olmasa
    // Ctrl+Z burada boşa basardı (reddedilen açıklık taşımasıyla aynı gerekçe).
    useCadStore.getState().moveWall(WALL_ID, 0, 0)

    expect(temporal().pastStates).toHaveLength(0)
  })

  it('bilinmeyen duvar geçmişe adım yazmaz', () => {
    useCadStore.getState().moveWall(404, 40, 40)

    expect(temporal().pastStates).toHaveLength(0)
  })
})

describe('deleteWall — geri al', () => {
  beforeEach(() => {
    resetArchitectureState()
    temporal().clear()
  })

  it('silme + sahipsiz köşe/açıklık temizliği TEK adımdır', () => {
    useCadStore.getState().deleteWall(WALL_ID)
    expect(temporal().pastStates).toHaveLength(1)

    undoProject()

    const state = useCadStore.getState()
    expect(state.walls.some((wall) => wall.id === WALL_ID)).toBe(true)
    // Duvarla birlikte düşen açıklık da aynı adımda geri gelmeli.
    expect(state.openings.some((opening) => opening.id === WINDOW_ID)).toBe(true)
  })
})
