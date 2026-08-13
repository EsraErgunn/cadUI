import { describe, expect, it } from 'vitest'

import { snapToNearestAngle } from '../angleSnap'

const anchor = { x: 0, y: 0 }

describe('snapToNearestAngle', () => {
  it('45°lik bir yöne TAM denk gelen imleç aynen döner', () => {
    const result = snapToNearestAngle(anchor, { x: 10, y: 10 })

    expect(result?.x).toBeCloseTo(10)
    expect(result?.y).toBeCloseTo(10)
  })

  it('90°lik yöne (dikey) tam denk gelen imleç aynen döner', () => {
    const result = snapToNearestAngle(anchor, { x: 0, y: 20 })

    expect(result?.x).toBeCloseTo(0)
    expect(result?.y).toBeCloseTo(20)
  })

  it('bir hedef açıya YAKINSA (tolerans içi) o açıya yakalanır, mesafe korunur', () => {
    // 3° sapma toleransın (6°) içinde: 0°'a yakalanmalı, x eksenine.
    const distanceCm = Math.hypot(100, 100 * Math.tan(3 * (Math.PI / 180)))
    const result = snapToNearestAngle(anchor, { x: 100, y: 100 * Math.tan(3 * (Math.PI / 180)) })

    expect(result?.y).toBeCloseTo(0)
    expect(Math.hypot(result?.x ?? 0, result?.y ?? 0)).toBeCloseTo(distanceCm)
  })

  it('hedef açıdan yeterince UZAKSA (tolerans dışı) yakalanmaz, null döner', () => {
    // 20° sapma: en yakın 45°'lik hedeften (0°) tolerans (6°) dışında.
    const result = snapToNearestAngle(anchor, { x: 100, y: 100 * Math.tan(20 * (Math.PI / 180)) })

    expect(result).toBeNull()
  })

  it('anchor ile imleç aynı noktadaysa null döner (yön tanımsız)', () => {
    expect(snapToNearestAngle(anchor, { x: 0, y: 0 })).toBeNull()
  })

  it('360°/0° sınırında (negatif açılar) doğru yakalar', () => {
    // Neredeyse tam +x ekseni, hafif eksi tarafta (yaklaşık -2°).
    const result = snapToNearestAngle(anchor, { x: 100, y: -3.5 })

    expect(result?.y).toBeCloseTo(0)
    expect(result?.x).toBeGreaterThan(0)
  })
})
