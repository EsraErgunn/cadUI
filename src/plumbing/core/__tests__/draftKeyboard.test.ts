import { describe, expect, it } from 'vitest'

import {
  getAxisStepPoint,
  getDraftAxisDirection,
  getDraftElevationSign,
} from '../draftKeyboard'

describe('getDraftAxisDirection', () => {
  it('dört ok tuşunu plan yönlerine çevirir', () => {
    expect(getDraftAxisDirection('ArrowLeft')).toBe('left')
    expect(getDraftAxisDirection('ArrowRight')).toBe('right')
    expect(getDraftAxisDirection('ArrowUp')).toBe('up')
    expect(getDraftAxisDirection('ArrowDown')).toBe('down')
  })

  it('ok olmayan tuş yön üretmez', () => {
    expect(getDraftAxisDirection('Enter')).toBeNull()
    expect(getDraftAxisDirection('a')).toBeNull()
  })
})

describe('getDraftElevationSign', () => {
  // Aynı fiziksel tuş düzene göre '+' ya da '=' üretiyor; ikisi de yukarı olmalı.
  it("'+' ve '=' yukarı, '-' ve '_' aşağı yönü verir", () => {
    expect(getDraftElevationSign('+')).toBe(1)
    expect(getDraftElevationSign('=')).toBe(1)
    expect(getDraftElevationSign('-')).toBe(-1)
    expect(getDraftElevationSign('_')).toBe(-1)
  })

  it('ilgisiz tuş yön üretmez', () => {
    expect(getDraftElevationSign('ArrowUp')).toBeNull()
  })
})

describe('getAxisStepPoint', () => {
  const anchor = { x: 100, y: 50 }

  // Ekranda "yukarı" plan +Y (bkz. scene/Cameras.tsx) — bu eşleme ters
  // dönerse ok tuşuyla çizilen boru aynaya düşer, testin asıl koruduğu şey bu.
  it('yön birim vektörünü uzunlukla ölçekleyip çapaya ekler', () => {
    expect(getAxisStepPoint(anchor, 'right', 250)).toEqual({ x: 350, y: 50 })
    expect(getAxisStepPoint(anchor, 'left', 250)).toEqual({ x: -150, y: 50 })
    expect(getAxisStepPoint(anchor, 'up', 250)).toEqual({ x: 100, y: 300 })
    expect(getAxisStepPoint(anchor, 'down', 250)).toEqual({ x: 100, y: -200 })
  })
})
