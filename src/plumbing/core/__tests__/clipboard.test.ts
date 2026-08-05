import { describe, expect, it } from 'vitest'

import { offsetClipboardEntries, PASTE_OFFSET_CM, toClipboardEntries } from '../clipboard'
import type { InstallationElement } from '../installationModel'

function makeElement(id: number, x: number, y: number): InstallationElement {
  return {
    id,
    floorId: 1,
    type: 'valve',
    position: { x, y },
    angleDeg: 90,
    scale: 2,
  }
}

const elements = [makeElement(10, 0, 0), makeElement(11, 100, 50), makeElement(12, 200, 0)]

describe('toClipboardEntries', () => {
  it('yalnız seçili elemanları alır', () => {
    expect(toClipboardEntries(elements, [10, 12]).map((entry) => entry.position.x)).toEqual([
      0, 200,
    ])
  })

  it('id ve floorId KOPYALAMAZ: yapıştırma yeni id üretir ve aktif kata düşer', () => {
    const [entry] = toClipboardEntries(elements, [11])
    expect(entry).toEqual({ type: 'valve', position: { x: 100, y: 50 }, angleDeg: 90, scale: 2 })
  })

  it('açı ve ölçeği korur', () => {
    const [entry] = toClipboardEntries(elements, [10])
    expect([entry.angleDeg, entry.scale]).toEqual([90, 2])
  })
})

describe('offsetClipboardEntries', () => {
  it('ilk yapıştırma kaynağın üstüne düşmez', () => {
    const [entry] = offsetClipboardEntries(toClipboardEntries(elements, [10]), 1)
    expect(entry.position).toEqual({ x: PASTE_OFFSET_CM, y: PASTE_OFFSET_CM })
  })

  it('arka arkaya yapıştırmalar üst üste binmez', () => {
    const entries = toClipboardEntries(elements, [10])
    const first = offsetClipboardEntries(entries, 1)[0].position
    const second = offsetClipboardEntries(entries, 2)[0].position
    expect(second.x - first.x).toBe(PASTE_OFFSET_CM)
  })

  it('seçim içindeki göreli düzen korunur', () => {
    const [first, second] = offsetClipboardEntries(toClipboardEntries(elements, [10, 11]), 3)
    expect([second.position.x - first.position.x, second.position.y - first.position.y]).toEqual([
      100, 50,
    ])
  })
})
