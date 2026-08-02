import { beforeEach, describe, expect, it } from 'vitest'

import { resetArchitectureState, WALL_ID, WINDOW_ID } from './architectureFixture'
import { useCadStore } from '../cadStore'

// Fixture: 2(0,0) — 3(500,0) duvar 8; 3 — 4(500,400) duvar 9; 2 — 5(0,400) duvar 10.
const CORNER_A = 2
const CORNER_B = 3
const CORNER_C = 4

beforeEach(() => {
  resetArchitectureState()
})

describe('mergePoint', () => {
  it('kaynak köşeye bağlı duvarları hedefe yönlendirir', () => {
    useCadStore.getState().mergePoint(CORNER_C, CORNER_B)
    const { points, walls } = useCadStore.getState()

    // Duvar 9 iki ucu da 3'e düştüğü için sıfır boy: elenir.
    expect(walls.find((wall) => wall.id === 9)).toBeUndefined()
    // Kaynak köşe kalkar.
    expect(points.find((point) => point.id === CORNER_C)).toBeUndefined()
    expect(points.find((point) => point.id === CORNER_B)).toBeDefined()
  })

  it('aynı yerde iki nokta BIRAKMAZ — kopuk duvarın sebebi buydu', () => {
    const before = useCadStore.getState().points.length
    useCadStore.getState().mergePoint(CORNER_A, CORNER_B)
    const { points } = useCadStore.getState()

    expect(points).toHaveLength(before - 1)
    expect(points.filter((point) => point.id === CORNER_A)).toHaveLength(0)
  })

  it('kaynatma sonrası duvarlar hedef köşeye bağlı kalır', () => {
    // Duvar 10 (2 → 5) kaynatmadan sonra 3 → 5 olmalı.
    useCadStore.getState().mergePoint(CORNER_A, CORNER_B)
    const wall = useCadStore.getState().walls.find((candidate) => candidate.id === 10)

    expect(wall?.p1Id).toBe(CORNER_B)
    expect(wall?.p2Id).toBe(5)
  })

  it('yinelenen duvar üretmez', () => {
    // 4'ü 2'ye kaynatınca duvar 9 (3→4) 3→2 olur; duvar 8 zaten 2→3.
    // Aynı çifti bağlayan ikinci duvar elenmeli.
    useCadStore.getState().mergePoint(CORNER_C, CORNER_A)
    const { walls } = useCadStore.getState()

    const pairs = walls.map((wall) =>
      wall.p1Id < wall.p2Id ? `${wall.p1Id}-${wall.p2Id}` : `${wall.p2Id}-${wall.p1Id}`,
    )
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it('duvarı düşen açıklığı da temizler', () => {
    // Duvar 8'in iki ucunu birleştirmek onu düşürür; üstündeki pencere kalamaz.
    useCadStore.getState().mergePoint(CORNER_A, CORNER_B)
    const { walls, openings } = useCadStore.getState()

    expect(walls.find((wall) => wall.id === WALL_ID)).toBeUndefined()
    expect(openings.find((opening) => opening.id === WINDOW_ID)).toBeUndefined()
  })

  it('projeyi bir kez kirletir', () => {
    useCadStore.getState().mergePoint(CORNER_C, CORNER_B)

    expect(useCadStore.getState().revision).toBe(1)
  })

  it('aynı noktayı kendine kaynatmaz', () => {
    useCadStore.getState().mergePoint(CORNER_A, CORNER_A)
    const { points, revision } = useCadStore.getState()

    expect(points.find((point) => point.id === CORNER_A)).toBeDefined()
    expect(revision).toBe(0)
  })

  it('olmayan köşede hiçbir şey değiştirmez', () => {
    useCadStore.getState().mergePoint(404, CORNER_B)

    expect(useCadStore.getState().revision).toBe(0)
  })
})
