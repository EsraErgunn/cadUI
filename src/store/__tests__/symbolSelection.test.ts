import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_ID } from '../../core/model'
import type { Selection } from '../../core/selection'
import { useCadStore } from '../cadStore'

function resetState(): void {
  useCadStore.setState({
    floors: [createGroundFloor()],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    nextUniqueId: 100,
    revision: 0,
  })
  useCadStore.temporal.getState().clear()
}

function addSymbol(x: number, y: number, type: 'panel' | 'vent' = 'panel') {
  return useCadStore.getState().addPointSymbol({ type, attachment: freeAt({ x, y }) })!
}

/** Serbest bağlanma yardımcısı: testlerin çoğu duvarla ilgilenmiyor. */
function freeAt(position: { x: number; y: number }) {
  // Kat AKTİF kattan okunur: üretimde de bağlanmayı araç çözüyor ve serbest
  // sembol aktif kata düşüyor.
  return {
    attachment: 'free' as const,
    floorId: useCadStore.getState().activeFloorId,
    x: position.x,
    y: position.y,
    rotationDeg: 0,
  }
}

function findSymbol(symbolId: number) {
  const symbol = useCadStore.getState().symbols.find((item) => item.id === symbolId)
  // Bu dosyadaki semboller serbest yerleştiriliyor; dönüşüm testleri x/y okuyor.
  return symbol?.attachment === 'free' ? symbol : undefined
}

beforeEach(resetState)

describe('deleteSelection — sembol', () => {
  it('seçili sembolü siler', () => {
    const id = addSymbol(100, 100)

    expect(useCadStore.getState().deleteSelection([{ kind: 'symbol', id }])).toBe(true)
    expect(useCadStore.getState().symbols).toHaveLength(0)
  })

  it('sembol ve duvarı birlikte TEK adımda siler', () => {
    const id = addSymbol(100, 100)
    useCadStore.setState({
      points: [
        { id: 200, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
        { id: 201, floorId: DEFAULT_FLOOR_ID, x: 400, y: 0 },
      ],
      walls: [
        { id: 202, floorId: DEFAULT_FLOOR_ID, p1Id: 200, p2Id: 201, thickness: 20, height: 280 },
      ],
    })
    useCadStore.temporal.getState().clear()

    const selection: Selection = [
      { kind: 'symbol', id },
      { kind: 'wall', id: 202 },
    ]
    useCadStore.getState().deleteSelection(selection)

    expect(useCadStore.getState().symbols).toHaveLength(0)
    expect(useCadStore.getState().walls).toHaveLength(0)
    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)
  })

  it('tanınmayan sembol id"si projeyi kirletmez', () => {
    const revisionBefore = useCadStore.getState().revision

    expect(useCadStore.getState().deleteSelection([{ kind: 'symbol', id: 999 }])).toBe(false)
    expect(useCadStore.getState().revision).toBe(revisionBefore)
  })
})

describe('transformSelection — sembol', () => {
  it('sembolü öteler', () => {
    const id = addSymbol(100, 100)
    const selection: Selection = [{ kind: 'symbol', id }]

    expect(
      useCadStore.getState().transformSelection(selection, {
        kind: 'translate',
        dxCm: 50,
        dyCm: -25,
      }),
    ).toBe(true)
    expect(findSymbol(id)).toMatchObject({ x: 150, y: 75 })
  })

  it('döndürme sembolün KENDİ açısını da çevirir', () => {
    const id = addSymbol(100, 0)
    // Dayanak orijinde: sembol hem yer değiştirir hem 90° döner.
    useCadStore.getState().transformSelection([{ kind: 'symbol', id }], {
      kind: 'rotate',
      pivot: { x: 0, y: 0 },
      angleDeg: 90,
    })

    const symbol = findSymbol(id)
    expect(symbol?.x).toBeCloseTo(0)
    expect(symbol?.y).toBeCloseTo(100)
    expect(symbol?.rotationDeg).toBe(90)
  })

  it('yalnız sembol seçiliyken de dayanak bulunur — duvar gerekmez', () => {
    const id = addSymbol(200, 200)

    expect(
      useCadStore.getState().transformSelection([{ kind: 'symbol', id }], {
        kind: 'rotate',
        pivot: { x: 200, y: 200 },
        angleDeg: 45,
      }),
    ).toBe(true)
    expect(findSymbol(id)?.rotationDeg).toBe(45)
  })

  it('dikey aynalama açıyı yansıtır', () => {
    const id = addSymbol(100, 0)
    useCadStore.getState().rotatePointSymbol(id, 30)

    useCadStore.getState().transformSelection([{ kind: 'symbol', id }], {
      kind: 'mirror',
      pivot: { x: 0, y: 0 },
      axis: 'vertical',
    })

    expect(findSymbol(id)).toMatchObject({ x: -100, rotationDeg: 150 })
  })

  it('yatay aynalama açının işaretini çevirir', () => {
    const id = addSymbol(0, 100)
    useCadStore.getState().rotatePointSymbol(id, 30)

    useCadStore.getState().transformSelection([{ kind: 'symbol', id }], {
      kind: 'mirror',
      pivot: { x: 0, y: 0 },
      axis: 'horizontal',
    })

    expect(findSymbol(id)).toMatchObject({ y: -100, rotationDeg: 330 })
  })
})

describe('duplicateSelection — sembol', () => {
  it('sembolü kopyalar ve seçimi kopyaya taşır', () => {
    const id = addSymbol(100, 100)

    const created = useCadStore
      .getState()
      .duplicateSelection([{ kind: 'symbol', id }], { dxCm: 50, dyCm: 50 })

    expect(useCadStore.getState().symbols).toHaveLength(2)
    expect(created).toHaveLength(1)
    expect(created[0].id).not.toBe(id)
    expect(findSymbol(created[0].id)).toMatchObject({ x: 150, y: 150 })
  })

  it('kopya YENİ etiket alır — aynı katta iki P-01 olmaz (KK-10)', () => {
    const id = addSymbol(100, 100)

    const [copy] = useCadStore
      .getState()
      .duplicateSelection([{ kind: 'symbol', id }], { dxCm: 50, dyCm: 50 })

    expect(findSymbol(id)?.label).toBe('P-01')
    expect(findSymbol(copy.id)?.label).toBe('P-02')
  })

  it('arka arkaya kopyalanan iki sembol farklı etiket alır', () => {
    const first = addSymbol(0, 0)
    const second = addSymbol(200, 0)

    const created = useCadStore.getState().duplicateSelection(
      [
        { kind: 'symbol', id: first },
        { kind: 'symbol', id: second },
      ],
      { dxCm: 0, dyCm: 100 },
    )

    const labels = created.map((item) => findSymbol(item.id)?.label)
    expect(new Set(labels).size).toBe(2)
  })

  it('notu korur', () => {
    const id = addSymbol(0, 0, 'vent')
    useCadStore.getState().setPointSymbolNote(id, 'Mutfak menfezi')

    const [copy] = useCadStore
      .getState()
      .duplicateSelection([{ kind: 'symbol', id }], { dxCm: 50, dyCm: 0 })

    expect(findSymbol(copy.id)?.note).toBe('Mutfak menfezi')
  })
})
