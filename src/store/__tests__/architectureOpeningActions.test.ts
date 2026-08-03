import { beforeEach, describe, expect, it } from 'vitest'

import {
  FIXTURE_NEXT_FREE_ID,
  FIXTURE_OPENINGS,
  FIXTURE_POINTS,
  FIXTURE_WALLS,
  resetArchitectureState,
  WALL_ID,
  WINDOW_ID,
} from './architectureFixture'
import { selectOpeningById } from '../architectureSlice'
import { selectIsProjectDirty, useCadStore } from '../cadStore'

beforeEach(resetArchitectureState)

describe('addOpening', () => {
  it('geçerli yerleştirmede açıklık ekler ve id döndürür', () => {
    const expectedId = useCadStore.getState().nextUniqueId
    const createdId = useCadStore.getState().addOpening({
      wallId: WALL_ID,
      offsetCm: 100,
      widthCm: 90,
      type: 'door',
    })
    const state = useCadStore.getState()

    expect(createdId).toBe(expectedId)
    expect(state.openings).toHaveLength(2)
    expect(selectOpeningById(state, createdId!)).toEqual({
      id: expectedId,
      wallId: WALL_ID,
      offsetCm: 100,
      widthCm: 90,
      type: 'door',
    })
    expect(state.nextUniqueId).toBe(FIXTURE_NEXT_FREE_ID + 1)
    expect(state.revision).toBe(1)
    expect(selectIsProjectDirty(state)).toBe(true)
  })

  it('çakışan yerleştirmeyi reddeder ve HİÇBİR ŞEYİ değiştirmez', () => {
    // 250'deki pencerenin aralığı [190, 310]; 354 ortalı kapı 1 cm biner.
    const createdId = useCadStore.getState().addOpening({
      wallId: WALL_ID,
      offsetCm: 354,
      widthCm: 90,
      type: 'door',
    })
    const state = useCadStore.getState()

    expect(createdId).toBeUndefined()
    expect(state.openings).toEqual(FIXTURE_OPENINGS)
    // Reddedilen yerleştirme id harcamaz ve projeyi kirletmez.
    expect(state.nextUniqueId).toBe(FIXTURE_NEXT_FREE_ID)
    expect(state.revision).toBe(0)
    expect(selectIsProjectDirty(state)).toBe(false)
  })

  it('köşe payının içindeki yerleştirmeyi reddeder', () => {
    const createdId = useCadStore.getState().addOpening({
      wallId: WALL_ID,
      offsetCm: 10,
      widthCm: 90,
      type: 'door',
    })

    expect(createdId).toBeUndefined()
    expect(useCadStore.getState().nextUniqueId).toBe(FIXTURE_NEXT_FREE_ID)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('olmayan duvara yerleştirmeyi reddeder', () => {
    const createdId = useCadStore.getState().addOpening({
      wallId: 404,
      offsetCm: 100,
      widthCm: 90,
      type: 'door',
    })

    expect(createdId).toBeUndefined()
    expect(useCadStore.getState().openings).toEqual(FIXTURE_OPENINGS)
  })

  it('uç uca değen açıklığı kabul eder', () => {
    const createdId = useCadStore.getState().addOpening({
      wallId: WALL_ID,
      offsetCm: 355,
      widthCm: 90,
      type: 'door',
    })

    expect(createdId).toBeDefined()
  })
})

describe('moveOpening', () => {
  it('yalnız offsetCm günceller, yeni Point/Wall üretmez', () => {
    const before = useCadStore.getState()
    const isMoved = before.moveOpening(WINDOW_ID, { wallId: WALL_ID, offsetCm: 120 })
    const state = useCadStore.getState()

    expect(isMoved).toBe(true)
    expect(selectOpeningById(state, WINDOW_ID)).toEqual({
      id: WINDOW_ID,
      wallId: WALL_ID,
      offsetCm: 120,
      widthCm: 120,
      type: 'window',
    })
    // Duvar BÖLÜNMEZ: taşıma tek alan güncellemesidir (K9).
    expect(state.walls).toBe(before.walls)
    expect(state.points).toBe(before.points)
    expect(state.revision).toBe(1)
  })

  it('aralığın dışına taşımayı reddeder', () => {
    const isMoved = useCadStore.getState().moveOpening(WINDOW_ID, { wallId: WALL_ID, offsetCm: 470 })
    const state = useCadStore.getState()

    expect(isMoved).toBe(false)
    expect(selectOpeningById(state, WINDOW_ID)?.offsetCm).toBe(250)
    expect(state.revision).toBe(0)
  })

  it('başka açıklığın üstüne taşımayı reddeder, kaydırmaz', () => {
    useCadStore.getState().addOpening({
      wallId: WALL_ID,
      offsetCm: 80,
      widthCm: 90,
      type: 'door',
    })
    const revisionBefore = useCadStore.getState().revision

    // Pencere 150'ye giderse [90, 210] olur, kapının [35, 125] aralığına biner.
    expect(useCadStore.getState().moveOpening(WINDOW_ID, { wallId: WALL_ID, offsetCm: 150 })).toBe(false)
    expect(selectOpeningById(useCadStore.getState(), WINDOW_ID)?.offsetCm).toBe(250)
    expect(useCadStore.getState().revision).toBe(revisionBefore)
  })

  it('kendi yerine taşımak kendisiyle çakışma saymaz', () => {
    expect(useCadStore.getState().moveOpening(WINDOW_ID, { wallId: WALL_ID, offsetCm: 250 })).toBe(true)
  })

  it('olmayan açıklıkta false döner', () => {
    expect(useCadStore.getState().moveOpening(404, { wallId: WALL_ID, offsetCm: 100 })).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('açıklığı başka duvara taşır', () => {
    // Duvar 9: 400 cm dik duvar. Pencere (120 cm) oraya sığar.
    const isMoved = useCadStore.getState().moveOpening(WINDOW_ID, {
      wallId: 9,
      offsetCm: 200,
    })
    const state = useCadStore.getState()

    expect(isMoved).toBe(true)
    expect(selectOpeningById(state, WINDOW_ID)).toEqual({
      id: WINDOW_ID,
      wallId: 9,
      offsetCm: 200,
      widthCm: 120,
      type: 'window',
    })
    // Duvar BÖLÜNMEZ: başka duvara geçmek de yeni Point/Wall üretmez (K9).
    expect(state.walls).toHaveLength(FIXTURE_WALLS.length)
    expect(state.points).toHaveLength(FIXTURE_POINTS.length)
  })

  it('hedef duvara sığmayan taşımayı reddeder, kaynak duvarda bırakır', () => {
    // Duvar 9'un sonuna 120 cm pencere sığmaz; eski davranışta offset sessizce
    // ESKİ duvara yazılırdı — açıklık ekranda bambaşka bir yere zıplardı.
    const isMoved = useCadStore.getState().moveOpening(WINDOW_ID, {
      wallId: 9,
      offsetCm: 395,
    })
    const state = useCadStore.getState()

    expect(isMoved).toBe(false)
    expect(selectOpeningById(state, WINDOW_ID)).toEqual(FIXTURE_OPENINGS[0])
    expect(state.revision).toBe(0)
  })

  it('hedef duvardaki açıklıkla çakışmayı reddeder', () => {
    useCadStore.getState().addOpening({ wallId: 9, offsetCm: 200, widthCm: 90, type: 'door' })
    const revisionBefore = useCadStore.getState().revision

    // Çakışma KAYNAK duvarda değil hedefte aranır: 200'e giden pencere [140, 260]
    // olur, kapının [155, 245] aralığına biner.
    expect(useCadStore.getState().moveOpening(WINDOW_ID, { wallId: 9, offsetCm: 200 })).toBe(false)
    expect(selectOpeningById(useCadStore.getState(), WINDOW_ID)?.wallId).toBe(WALL_ID)
    expect(useCadStore.getState().revision).toBe(revisionBefore)
  })

  it('olmayan duvara taşımayı reddeder', () => {
    expect(useCadStore.getState().moveOpening(WINDOW_ID, { wallId: 404, offsetCm: 100 })).toBe(
      false,
    )
    expect(selectOpeningById(useCadStore.getState(), WINDOW_ID)?.wallId).toBe(WALL_ID)
  })
})
